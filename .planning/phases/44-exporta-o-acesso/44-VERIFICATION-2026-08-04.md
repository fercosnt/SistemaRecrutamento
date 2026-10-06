---
phase: 44-exporta-o-acesso
verified: 2026-08-04T04:58:50Z
status: gaps_found
score: 2/6 requirements verified as truly closed (EXPORT-04, and EXPORT-05 downgraded from claimed-Complete to partial — see gap G4); 0/6 satisfy the phase's own "exercitado em produção" clause end-to-end
behavior_unverified: 3
overrides_applied: 0
gaps:
  - truth: "EXPORT-01 — O candidato pede uma cópia dos seus dados pelo painel e recebe (SC#1, roadmap)"
    status: failed
    reason: >
      Zero end-to-end exercises exist. `solicitacoes_dados` holds 0 rows in production
      (confirmed post-deploy in 44-05-EVIDENCIA-DEPLOY.md §3). No `.json`/`.html` has ever
      been produced for a real titular. The phase goal explicitly demands the inventory be
      "exercitado em produção" — server-side plumbing (EF deployed, JWT-ON, A1 closed) is
      necessary but not sufficient for that clause. REQUIREMENTS.md correctly still shows
      `[ ]` and the 44-05/44-09 SUMMARYs explicitly refuse to mark it, for exactly this
      reason — that refusal is correct and is upheld here, not overridden.
    artifacts:
      - path: "supabase/functions/exportar-meus-dados/index.ts"
        issue: "Deployed at version 1 — the PRE-fix version. 4 of the 8 post-review fix commits (81c40cc, fa51132, aa59e19, c7f6cea, f86d737, 07ab8a0, cbd5358, 1538887) touch this and its neighboring files; the Edge Function specifically has NOT been redeployed since 81c40cc. Production currently serves a version with a cooldown that fails OPEN on an unparseable timestamp (WR-02, pre-fix) and a `.html` generator that leaks 3 unfiltered infra-pointer URL columns (CR-01, pre-fix in the deployed artifact's client-side counterpart — see G3)."
    missing:
      - "A real titular exercising the flow through the browser (44-05 Task 3 steps 3/5, deliberately deferred by the operator on 2026-08-04)."
      - "Redeploy of `exportar-meus-dados` carrying the WR-01/02/03/04/05(half) fixes before that exercise happens, so the first live exercise runs the corrected code, not the known-buggy v1."
  - truth: "EXPORT-02 — Export em JSON por allowlist explícita de colunas, nunca select('*') (SC#1, roadmap)"
    status: failed
    reason: >
      The allowlist projection mechanism itself is real and well-tested (grep confirms
      `.select(def.colunas.join(', '))` everywhere, snapshot-pinned, negative-probed for
      `*`). But REQUIREMENTS.md and the 44-05 SUMMARY correctly leave this `[ ]` because
      "nenhum byte projetou dado real" — no production row has ever been read through this
      path. Independently, this verifier confirms the client-side artifact generator
      (`exportacaoService.ts`) had a real completeness defect (CR-01: 3 URL/link columns —
      `entrevistas_online.gravacao_url`, `entrevistas_online.link_videochamada`,
      `candidatos.avatar_url` — rode unfiltered into both delivered files) that is fixed in
      the repo (commit cbd5358, verified present: `FORA_DO_ARQUIVO_LEGIVEL` is now a
      generated Map, not a one-element hardcoded Set) but has never been exercised against
      a real payload.
    artifacts:
      - path: "src/features/privacidade/services/exportacaoService.ts"
        issue: "Fix verified present in repo (line ~294, `FORA_DO_ARQUIVO_LEGIVEL` derived from the generated allowlist) — code-level gap closed, production-exercise gap open."
    missing:
      - "One real production run producing a `.json`/`.html` pair for a titular with actual data in the linked tables, to confirm the fixed exclusion set and the date-formatting fix (CR-02) behave correctly outside of unit-test mocks."
  - truth: "EXPORT-03 — Currículo entregue por signed URL de TTL curto, nunca inline/base64 (SC#2, roadmap)"
    status: failed
    reason: >
      Client-side minting is implemented per BD-7 (auth.uid()-prefixed path, 60s TTL,
      service_role out of the path) and unit-tested with negative probes for base64/inline
      content. REQUIREMENTS.md and the 44-07 SUMMARY correctly leave this `[ ]`: "as três
      metades verificáveis por código estão feitas... a que falta é a única que importa
      para o titular: ninguém abriu um currículo." No human has opened their own CV through
      the new client-minted URL. That refusal is upheld.
    artifacts:
      - path: "src/features/privacidade/services/exportacaoService.ts"
        issue: "mintarUrlCurriculoProprio implemented and unit-tested; zero live exercise."
    missing:
      - "A real candidate opening their own currículo through the new client-side signed URL, confirming TTL expiry and the three DevTools negative assertions (44-07 Task 3 human-check, deferred by the operator)."
  - truth: "EXPORT-05 — O prazo do Art. 19, II está visível ao RH; um pedido perto do prazo é distinguível de um recém-chegado (SC#4, roadmap)"
    status: partial
    reason: >
      REQUIREMENTS.md marks this Complete and the 44-09 SUMMARY defends that as a
      deliberate, reasoned distinction from EXPORT-01 (visibility is a renderable property,
      asserted by 24 component/unit assertions; a titular's act is not). That reasoning is
      sound for the UI layer taken alone. But this verifier does not accept it as fully
      closed, because the orchestrator's own live measurement in
      44-09-EVIDENCIA-BD8.md finds the RH branch of the BD-8 scope predicate
      (`vagas.created_by = auth.uid()`) cannot return a row for ANY current recruiter in
      production: 0 of 9 vagas with a non-null `created_by` belong to a `rh`-role user (6
      NULL, 3 administrador). The measured "fila ≡ contador" equality was 0=0 for both
      roles — true only vacuously, not a proof the predicate is correct. If a candidate
      requests an export today and it fails (the only case that consumes the 15-day
      clock), no recruiter would see it in the queue — only an administrador would, and
      only by the fallback branch. This directly undercuts "visível ao RH" as a load-bearing
      SC#4 claim, not merely an unmeasured nicety.
    artifacts:
      - path: "supabase/migrations/20260804000002_p44_solicitacoes_dados.sql"
        issue: "RPC scope predicate for role=rh keyed on vagas.created_by, which is unpopulated for every rh user in the current production dataset (measured, not inferred)."
    missing:
      - "Operator decision named in 44-09-EVIDENCIA-BD8.md §3: populate created_by on the 6 orphan vagas, switch the predicate to vagas_associadas_recrutadores, or explicitly accept the queue as administrador-only. Until one of these lands, the rh-visible half of SC#4 is not deliverable, in production, as designed."
      - "A live UAT with one pending row scoped to a real recruiter, per 44-09 §Checkpoint (deferred by the operator)."
deferred: []
behavior_unverified_items:
  - truth: "Caminho feliz ponta a ponta do EXPORT-01 (clique → 2 arquivos → 1 linha atendido)"
    test: "Um titular real clica em '/candidato/privacidade' e recebe o .json e o .html"
    expected: "1 linha nova em solicitacoes_dados (tipo=acesso, situacao=atendido, causa NULL), dois arquivos coerentes entre si"
    why_human: "Requires a real candidate session; deliberately deferred by the operator (44-05 §Ainda em aberto) to avoid burning the 24h cooldown of the test account before the first human click."
  - truth: "EXPORT-03 signed URL do próprio CV, expiração do TTL de 60s"
    test: "Um candidato real abre o próprio currículo pela nova URL cunhada no cliente e observa a URL expirar após 60s"
    expected: "CV abre; a mesma URL falha após 60s; DevTools não mostra service_role nem token vazando fora do fluxo esperado"
    why_human: "Requires real candidate login and browser DevTools observation; deferred by the operator (44-07 Task 3 human-check)."
  - truth: "BD-8 — fila do RH ≡ contador do menu, nos dois papéis (rh e administrador), com pelo menos uma linha pendente real"
    test: "Um RH real e um administrador real abrem /rh/pedidos-dados com uma linha pendente escopada para o RH"
    expected: "Contagem da fila bate com o badge do menu para ambos os papéis, e a linha aparece para o RH dono da vaga associada"
    why_human: "Requires real recruiter/admin login; and per 44-09-EVIDENCIA-BD8.md, is currently unmeasurable as designed because no live vaga has created_by=rh — the precondition itself needs an operator decision before the UAT can even be meaningful."
human_verification:
  - test: "Um titular real clica em '/candidato/privacidade' → 'Pedir cópia dos meus dados' e confirma que recebe os dois arquivos coerentes"
    expected: "download de .json e .html, 1 linha em solicitacoes_dados com situacao=atendido"
    why_human: "Runtime browser + real session; explicitly deferred by the operator on 2026-08-04"
  - test: "Um candidato real abre o próprio currículo pela URL assinada cunhada no cliente e observa expiração aos 60s"
    expected: "CV abre; URL expira; nenhum vazamento de service_role no DevTools"
    why_human: "Runtime browser + real session; explicitly deferred by the operator on 2026-08-04"
  - test: "Um RH real e um administrador real abrem /rh/pedidos-dados com ao menos uma linha pendente escopada corretamente"
    expected: "Fila e contador do menu batem nos dois papéis; o RH dono da vaga associada vê o pedido"
    why_human: "Runtime browser + real session; AND currently unmeasurable as designed per 44-09-EVIDENCIA-BD8.md (0 vagas owned by rh in production) — requires an operator decision on the scope predicate or the data before it is even testable"
---

# Phase 44: Exportação & Acesso Verification Report

**Phase Goal:** O candidato recebe uma cópia honesta dos próprios dados — e o sistema ganha, **exercitado em produção**, o inventário de PII que a fase irreversível vai consumir como plano de exclusão em vez de um palpite novo.

**Verified:** 2026-08-04
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### The load-bearing clause: "exercitado em produção"

The phase goal does not say "the export mechanism exists" — it says the PII inventory is
**exercised in production**, explicitly framed as the alternative to Phase 45 doing "um
levantamento novo feito sob a pressão de uma migration destrutiva." That clause is the
actual deliverable, not a nice-to-have on top of working code.

Measured directly:

- `solicitacoes_dados` (the table that IS the record of every request, per 44-CONTEXT §Área
  1) holds **0 rows** in production, confirmed twice — once immediately after the 44-05
  deploy probes (which are non-writing by design) and independently by the 44-09 BD-8
  measurement.
- No `.json`/`.html` pair has ever been produced for a real titular.
- No candidate has ever opened their own currículo through the new client-minted signed URL.
- No RH or administrador has ever opened `/rh/pedidos-dados` in a browser.

This is not a gap in test coverage — the automated suite is genuinely strong (1596 unit
tests, 20 Deno tests, negative probes with meta-assertions proving they can find what they
search for, per 44-REVIEW.md's own "What Was Checked and Found Sound" section). The gap is
specifically the clause the phase goal names explicitly: nothing has run against production
data for a production user. The executors' own restraint — refusing to mark EXPORT-01,
EXPORT-03, and (per this verifier, see G4 below) the RH half of EXPORT-05 as complete — is
correct and is being upheld, not second-guessed, by this verification.

**A second, independent reason the clause is unmet even setting the "never clicked" fact
aside:** the code review (44-REVIEW.md) found 2 BLOCKERs and 13 warnings. All are fixed in
the repository (commits `1538887`, `cbd5358`, `81c40cc`, `f86d737`, `aa59e19`, `fa51132`,
`c7f6cea`, `07ab8a0` — all verified present on `main` by this verifier). But the Edge
Function `exportar-meus-dados` has **not been redeployed** since those fixes landed —
production still serves **version 1**, the pre-fix code. Concretely, the currently-live
function:

- Fails the cooldown check **open** on an unparseable `solicitado_em` (pre-WR-02 shape —
  the fixed guard closing this is in the repo but not deployed).
- Discards the error on both `UPDATE`s that mark a request `atendido`/failed (pre-WR-03).
- Always tells the titular their own just-fulfilled request is `pendente` in the delivered
  copy (pre-WR-04, self-falsifying compliance artifact).

So even if a titular clicked the button today, the artifact they would receive would carry
known, already-fixed-in-repo defects. "Exercised in production" cannot mean "exercised
against a version the team already knows is wrong." Closing this phase honestly requires
redeploying before the first real exercise, not after.

### Observable Truths (Roadmap Success Criteria)

| # | Truth (roadmap SC) | Status | Evidence |
|---|---|---|---|
| 1 | Candidato pede cópia pelo painel e recebe JSON por allowlist explícita, nunca `select('*')` | ✗ FAILED (mechanism present, never exercised; deployed EF is pre-fix) | Code: `exportar-meus-dados/index.ts` uses `.select(def.colunas.join(', '))` everywhere, confirmed by grep; snapshot + negative probes pass (1596/1596). Production: 0 rows in `solicitacoes_dados`; EF at version 1, pre-fix. |
| 2 | Currículo entregue por signed URL TTL curto, nunca inline/base64 | ✗ FAILED (mechanism present, never exercised) | `mintarUrlCurriculoProprio` client-side, 60s TTL, `service_role` out of path (BD-7 confirmed: 3/3 live CVs use the `auth.uid()` prefix). Never opened by a real candidate. |
| 3 | Coluna nova quebra o snapshot test das chaves do export | ✓ VERIFIED | `docs/compliance/__tests__/exportAllowlist.test.ts` has 3 `toMatchInlineSnapshot` assertions (lines 133, 170, 633) pinning allowlist keys; `check:export-allowlist` (BD-6 generator, `--check`) confirmed wired into `package.json` (WR-08 fix, commit `aa59e19`) and exits 0 in the orchestrator's measured run. This truth is genuinely code-verifiable and does not depend on a live titular exercise. |
| 4 | Prazo Art. 19, II medido a partir do registro e visível ao RH; pedido perto do prazo distinguível de recém-chegado | ⚠️ PARTIAL (visibility UI verified by test; RH-scoped visibility structurally unproven/unworkable with current production data — see gap G4) | `SituacaoPedidoBadge`, `FilaPedidosDadosTable`, SLA classifier all tested (24 assertions per 44-09 SUMMARY). But `44-09-EVIDENCIA-BD8.md` measured that the `rh` branch of the scope predicate (`vagas.created_by = auth.uid()`) cannot return a row for any current recruiter — 0 of 9 non-null `created_by` values belong to an `rh` user. The measured queue≡counter equality (0=0) is vacuous, not a proof. |
| 5 | Inventário é artefato nomeado, versionado, consumível pela Phase 45 | ✓ VERIFIED (as an artifact; not yet actually consumed since Phase 45 doesn't exist yet) | `docs/compliance/export-allowlist.json` exists, generated (not hand-written), carries `meta`/`consumidores` block per the same pattern as `pii-inventory.yaml`. Cross-referenced against the live catalog (BD-6 closure: 67 tables / 1025 cols measured post-apply in 44-04, allowlist regenerated to match). |

**Score:** 2/5 roadmap SCs fully verified (SC#3, SC#5). SC#1 and SC#2 fail the phase's own "exercised in production" bar. SC#4 is downgraded from the executors' claimed-Complete to partial.

### Requirements Coverage

| Requirement | Description | REQUIREMENTS.md status | This verifier's assessment | Evidence |
|---|---|---|---|---|
| EXPORT-01 | Candidato solicita cópia pelo painel | `[ ]` Pending | **Agrees — FAILED (production-exercise gap)** | Code complete, deployed; 0 rows in `solicitacoes_dados`; 44-05/44-09 SUMMARYs correctly refuse to close it |
| EXPORT-02 | Export em JSON por allowlist explícita, nunca `select('*')` | `[ ]` Pending | **Agrees — FAILED (production-exercise gap)**, plus a real completeness bug (CR-01) fixed in repo but not yet deployed or exercised | Allowlist mechanism sound and tested; CR-01 fix (`FORA_DO_ARQUIVO_LEGIVEL` derived, not hardcoded) verified present at `exportacaoService.ts:~294`; never run against real data |
| EXPORT-03 | Currículo por signed URL TTL curto | `[ ]` Pending | **Agrees — FAILED (production-exercise gap)** | Client-side minting implemented and unit-tested (BD-7); never opened live |
| EXPORT-04 | Chaves do export cobertas por snapshot test | `[x]` Complete | **Agrees — VERIFIED** | 3 inline snapshots + wired `--check` CI gate; genuinely code-verifiable, no live-exercise dependency in the requirement's own wording |
| EXPORT-05 | Pedido atendido dentro do prazo Art. 19, II, visível ao RH | `[x]` Complete | **Disagrees — downgraded to PARTIAL.** UI-visibility mechanism is real and tested; but the `rh`-scoped half of the underlying BD-8 predicate cannot surface a row for any current recruiter in production (measured, not inferred). The "visível ao RH" clause is the entire point of SC#4 and it does not hold for the `rh` role today. | `44-09-EVIDENCIA-BD8.md` §3: 0 of 9 vagas with non-null `created_by` belong to `rh`; queue≡counter equality is vacuous (0=0) |
| EXPORT-06 | O inventário construído aqui é consumido pela Phase 45 | `[ ]` Pending | **Agrees — appropriately Pending.** The artifact exists, is versioned, and declares its intended consumer, but "consumed by Phase 45" cannot be true before Phase 45 exists; and the underlying export flow that the inventory backs has itself never run in production. | `docs/compliance/export-allowlist.json` present, generated, `meta.consumidores` names Phase 45 |

**No orphaned requirements** — all 6 EXPORT-* IDs are accounted for across the 9 plans and match REQUIREMENTS.md's traceability table exactly.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `supabase/functions/exportar-meus-dados/index.ts` | EF: authenticate→authorize→cooldown→register→project, allowlist-driven, no body read | ✓ VERIFIED (code) / ⚠ STALE (deployed) | Ordering, non-read of request body, and allowlist projection confirmed sound by 44-REVIEW.md ("What Was Checked and Found Sound"). Deployed version is v1, predates 8 fix commits. |
| `supabase/functions/_shared/exportAllowlist.ts` | Generated allowlist, no hand-written wildcard | ✓ VERIFIED, WIRED | Bundled into the deployed EF (A1 closed by discriminating probe B in 44-05-EVIDENCIA-DEPLOY.md) |
| `docs/compliance/export-allowlist.json` | Versioned artifact, `meta.consumidores` | ✓ VERIFIED | Present, generated by `gen-export-allowlist.cjs`, matches live catalog (BD-6 M3 remeasurement in 44-04) |
| `src/features/privacidade/services/exportacaoService.ts` | JSON + HTML generation, honest exclusions, correct dates | ✓ VERIFIED (post-fix), never exercised live | CR-01 and CR-02 fixes both confirmed present in current source |
| `supabase/migrations/20260804000001/002_p44_*.sql` | `config_sla_dados`, `solicitacoes_dados`, RPCs, RLS | ✓ VERIFIED, APPLIED, WIRED | Applied in 44-04 checkpoint; M3 policies read live (44-05-EVIDENCIA-DEPLOY.md §4): candidate own-row SELECT only, zero candidate write policy, RH via `SECURITY DEFINER` RPCs only |
| `src/features/pedidos-dados/*` (RH queue) | `/rh/pedidos-dados`, badge, table, sidebar entries | ✓ VERIFIED, WIRED (code) / ⚠ STRUCTURALLY LIMITED (data) | Route, menu, badge all wired and tested; the `rh`-scoped RPC branch cannot surface a row given current `vagas.created_by` population |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `exportar-meus-dados` EF | `payload[tabela]` | `supabaseAdmin.from(tabela).select(allowlist).eq/in(chaveDoTitular, ...)` | Yes, mechanism confirmed against real schema (BD-6 catalog match); never invoked with a real JWT in production | ⚠ MECHANISM SOUND, UNEXERCISED |
| `useFilaPedidosDados` (RH queue) | `listar_pedidos_dados()` RPC result | `SECURITY DEFINER` RPC reading `solicitacoes_dados` scoped by role | Table has 0 rows; RPC's `rh` branch structurally cannot return any row given current `vagas.created_by` data | ✗ STRUCTURALLY DISCONNECTED for role=rh |
| `usePedidosDadosPendentesCount` (menu badge) | Same RPC pair, `contar_pedidos_dados_pendentes()` | Same predicate as the queue (proven identical by `pg_get_functiondef`, 44-09-EVIDENCIA-BD8.md §1) | Same limitation | ✗ STRUCTURALLY DISCONNECTED for role=rh |

### Behavioral Spot-Checks / Probe Execution

Not applicable in the conventional sense — this phase's "probes" are the live orchestrator-executed evidence files (`44-05-EVIDENCIA-DEPLOY.md`, `44-09-EVIDENCIA-BD8.md`), which this verifier read and cross-checked rather than re-running (they require production JWTs/service_role access this verifier does not have). Their content was treated as primary evidence, not narration, and is reflected throughout this report. Full local test suite and probe-equivalent checks per the orchestrator's own independently-run gates: `npm run test:run` (1596 passing), `deno test` for the EF (20 passing), `npx tsc --noEmit` (97 errors = frozen baseline, no regression), `npm run build` + chunk assertion (passed), `npm run check:export-allowlist` (exit 0).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `supabase/functions/exportar-meus-dados/index.ts` (deployed v1, not current repo HEAD) | n/a — version drift | Deployed artifact predates 8 fix commits including 2 code-review BLOCKERs | 🛑 Blocker (for the "exercised in production" clause specifically — a live exercise today would run known-buggy code) | Cooldown fails open on unparseable timestamp; both `UPDATE`s swallow errors; self-falsifying "pendente" line in the delivered copy of the very request that produced it |
| `supabase/migrations/20260804000002_p44_solicitacoes_dados.sql` | RPC scope predicate | `vagas.created_by = auth.uid()` cannot resolve for any current `rh` user | 🛑 Blocker (for SC#4's RH-visibility clause specifically) | RH queue is structurally empty for every recruiter today; only an administrador would ever see a pending request |

No `TODO`/`FIXME`/`XXX`/`HACK`/placeholder markers found in the phase's key files (confirmed by 44-09 SUMMARY's own scan and spot-checked by this verifier in `exportacaoService.ts` and `index.ts`).

### Human Verification Required

See frontmatter `human_verification` — three items, all deliberately deferred by the operator on 2026-08-04: the EXPORT-01 happy path, the EXPORT-03 CV open, and the BD-8 dual-role UAT (which additionally cannot be meaningfully run yet without an operator decision on the `rh` scope predicate or data).

### Gaps Summary

Phase 44 built a genuinely strong, well-tested, well-reviewed implementation across all six
EXPORT-* requirements — the code review itself found the authorization spine sound, and the
negative-assertion discipline (meta-probes proving probes can find what they search for) is
better than most phases in this project's history. That is real and should not be
discounted.

But the phase's own stated goal is narrower and stricter than "the code exists": it demands
the PII inventory be **exercised in production**. On that specific bar:

1. **Zero end-to-end production exercises exist** for EXPORT-01 and EXPORT-03 — `solicitacoes_dados` has 0 rows, no titular has ever downloaded an export or opened a CV through the new path. The executors' own restraint (refusing to close these) is correct and is upheld unchanged.
2. **The deployed Edge Function is stale** — it predates 8 fix commits, including both code-review BLOCKERs (CR-01 PII/link leak into the delivered file, CR-02 wrong date of birth) and 5 warnings. Redeployment must happen before the first real exercise, or "exercised in production" would mean "exercised against code the team already knows is wrong."
3. **EXPORT-05's "visível ao RH" clause does not hold for the `rh` role today**, measured directly: 0 of 9 vagas with a populated `created_by` belong to an `rh` user, so the queue's `rh` branch is structurally empty regardless of how many requests exist. This verifier downgrades EXPORT-05 from the claimed Complete to partial — the visibility UI is real and tested, but the underlying data/predicate match that SC#4 depends on is not just unmeasured, it is currently unworkable as designed. This needs an operator decision (named in `44-09-EVIDENCIA-BD8.md` §3), not just a UAT click.

None of this is attributable to sloppy execution — every gap above is already named, measured, and reasoned about in the phase's own evidence files by the team that built it. The purpose of this verification is to hold the line the executors themselves drew, cross-check the one place (EXPORT-05) where the claimed status looks more confident than the live evidence supports, and make explicit that closing this phase requires three concrete actions before the goal can be called achieved: (a) redeploy the Edge Function with the fix commits, (b) run the three deferred human exercises, and (c) resolve the `rh` scope-predicate/data mismatch for BD-8.

---

_Verified: 2026-08-04_
_Verifier: Claude (gsd-verifier)_
