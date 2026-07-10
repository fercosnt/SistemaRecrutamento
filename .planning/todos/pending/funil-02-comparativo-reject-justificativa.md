---
id: funil-02-comparativo-reject-justificativa
created: 2026-07-09
source: Phase 25 planning (RESEARCH Open Q2 — deviation candidate, accepted-as-residual by Fernando)
priority: low
resolves_phase: null
tags: [funil-02, rnf-07a, comparativo, justificativa, audit-trail, deferred, m4-hardening-scope]
---

# Comparativo inline reject — make justificativa mandatory

**Deferred** during Phase 25 autonomous planning (2026-07-09). Fernando chose
"Accept as residual" — M4 is hardening, não expansão, and this is a product expansion.

## Current state (what's fine)
The `ComparativoCandidatosPage` "rejeitar" action (`handleRejeitar` →
`updateCandidaturaEtapa(id, 'rejeitado')`) transitions `etapa_atual`, which fires the
`avancar_etapa` trigger → **writes a `historico_candidatura` audit row**. So the reject
IS audited (has a trail) and, post-Phase-25, is also protected by the hybrid reject-guard
trigger (25-01). RNF-07a's core invariant (a human decides; system never auto-rejects by
score) holds.

## The residual gap
This triagem-stage screening reject is **justificativa-optional** — it does not require the
≥50-char `justificativa` + `por_usuario` that the formal `registrar_decisao` / `decisao_final`
path enforces. FUNIL-02's wording ("sem auditoria/justificativa") is only partially met on
this specific path (audit yes, mandatory justificativa no).

## What closing it would take
Route the comparativo reject through `registrar_decisao` (or a thin justificativa-collecting
RPC) + add a justificativa-collection UI on the comparativo page. This changes the action's
semantics from a triagem screening move to a formal *decisão final* — the reason it was left
out of the hardening scope.

## Candidate home
M5 (Operação & Comunicação) or a Phase-26 follow-up if the funnel-semantics rework touches
this surface. Not blocking; the hybrid guard keeps the path working + audited regardless.
