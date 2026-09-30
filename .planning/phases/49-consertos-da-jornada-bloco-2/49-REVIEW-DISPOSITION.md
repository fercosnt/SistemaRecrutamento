---
phase: 49
review: 49-REVIEW.md
titles: json
findings:
  - id: CR-01
    severity: critical
    disposition: fixed
    title: "The pt-BR injection patterns flag ordinary Portuguese, so AI evaluation is refused for real candidates"
  - id: CR-02
    severity: critical
    disposition: fixed
    title: "The upsert on a fallback row's idempotency key erases the fallback's audit row and cost, and rewrites the provenance pointer"
  - id: CR-03
    severity: critical
    disposition: fixed
    title: "Two vigente interview analyses (one per `tipo`) can deadlock the funnel, because the UI only exposes the most recent one"
  - id: WR-01
    severity: warning
    disposition: deferred
    title: "The replay guard lets legacy fallback results through, because it matches the prefix instead of the provider"
  - id: WR-02
    severity: warning
    disposition: deferred
    title: "The D-40 short-circuit in the transcript EF makes fallback analyses permanent and superseded analyses unrecoverable"
  - id: WR-03
    severity: warning
    disposition: deferred
    title: "The SJT composite silently re-weights when rubric keys are missing or duplicated"
  - id: WR-04
    severity: warning
    disposition: deferred
    title: "The SJT rubric block sends dentist-case criteria and red flags for every open case, including the live marketing items"
  - id: WR-05
    severity: warning
    disposition: deferred
    title: "The `scores_candidato` INSERT in avaliar-redacao now returns 500 on every retry after a failed row"
  - id: WR-06
    severity: warning
    disposition: deferred
    title: "`registrar_decisao` sanctions a stage change out of any closed candidatura, which bypasses the D-35 lock and the Art. 20 flow"
  - id: WR-07
    severity: warning
    disposition: deferred
    title: "The comparativo EF treats failed or pending analyses as «com análise» and accepts a null result from a provider that did respond"
  - id: WR-08
    severity: warning
    disposition: deferred
    title: "The new comparativo refusal messages never reach the screen"
  - id: WR-09
    severity: warning
    disposition: deferred
    title: "The finalists list includes soft-deleted and withdrawn candidaturas"
  - id: WR-10
    severity: warning
    disposition: deferred
    title: "The RNF-07a negation filter lets the most common knockout instruction through"
  - id: WR-11
    severity: warning
    disposition: deferred
    title: "The retroactive provenance fill used the configured model, not the model that responded"
  - id: WR-12
    severity: warning
    disposition: deferred
    title: "Several checks in the readiness and proof gates cannot fail, and others compare against a snapshot"
  - id: WR-13
    severity: warning
    disposition: deferred
    title: "Several p49 migrations abort on any database other than PROD as of 2026-09-22"
  - id: IN-01
    severity: info
    disposition: deferred
    title: "The provenance badge presents unknown provenance as primary, and prints «modelo modelo»"
  - id: IN-02
    severity: info
    disposition: deferred
    title: "The structural predicate is not used where the module docblock says it is"
  - id: IN-03
    severity: info
    disposition: deferred
    title: "The SJT generator's dollar-quote helper corrupts content containing \"among\""
  - id: IN-04
    severity: info
    disposition: deferred
    title: "The comparativo can show an Avançar button that always fails"
  - id: IN-05
    severity: info
    disposition: deferred
    title: "ai-client counts config errors as breaker failures, and ignores attempt-row write errors"
  - id: IN-06
    severity: info
    disposition: deferred
    title: "The shape checker only strips whole-line comments"
open: 0
total: 22
recorded: 2026-09-29T05:54:58.295Z
---

# Phase 49: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | fixed | 49-33 (padrões pt-BR ancorados no modelo e no imperativo) + 49-34 (7 EFs no ar); reconfirmação pela re-verificação |
| CR-02 | critical | fixed | 49-32 (linha do fallback sem chave de idempotência) + 49-34 (7 EFs no ar); reconfirmação pela re-verificação |
| CR-03 | critical | fixed | 49-30 (RPC grava na análise nomeada, migration 20260929000003) + 49-31 (uma confirmação por vigente pendente; o scorecard nomeia e escolhe a análise); reconfirmação pela re-verificação |
| WR-01 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3. Razão medida própria: 3 linhas legadas interview_guide com chave (06/09, provider openai, medidas no 49-32 e no 49-34) ficariam expostas ao sobrescrito que o CR-02 fechou se a guarda do replay passasse a olhar o provedor antes de liberar a chave delas; liberar é UPDATE retroativo em PROD, com checkpoint D-54 do operador, não executado |
| WR-02 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-03 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-04 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-05 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-06 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-07 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-08 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-09 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-10 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-11 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-12 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| WR-13 | warning | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| IN-01 | info | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| IN-02 | info | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| IN-03 | info | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| IN-04 | info | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| IN-05 | info | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |
| IN-06 | info | deferred | deferred: fora do fechamento de lacunas da Phase 49, que cobre só CR-01..03 — proposta do orquestrador na revisão dos planos 49-30..35 (2026-09-29), a confirmar pelo operador; triagem no Bloco 3 |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
