# Phase 20 — Deferred Items / Known Limitations

## Top-level guide fields not preserved across a manual save (review aside, not a numbered finding)

- **What:** `saveGuiaEdits` persists only `{ perguntas: [...] }` to the RPC (anti-tamper
  T-20-09 — the RH write-path carries only the editable questions, not arbitrary guide JSON).
  Consequence: after a manual question save, the guide's top-level IA fields
  (`introduction`, `closing`, `scoring_instructions`, `foco`) are not re-rendered until the
  RH regenerates the guide ("Gerar guia").
- **Severity:** Low/recoverable. The edited questions (the phase's actual deliverable) persist
  correctly; a regen restores the top-level sections AND now merge-preserves the manual
  questions (20-04). The numbered review findings (CR-01 blocker, WR-03, WR-04) are all FIXED.
- **Why deferred (not fixed inline):** it's a genuine design tradeoff (anti-tamper vs.
  preservation) that deserves explicit design input — the clean fix is a server-side merge in
  the RPC (keep existing top-level fields, replace only `perguntas`), which is an RPC/migration
  change, OR a client-side spread of the current guide (re-opens the anti-tamper question).
- **Fix when in scope:** make the RPC (or saveGuiaEdits) merge the edited `perguntas` into the
  EXISTING stored guide rather than replacing the whole `guia` jsonb — preserving top-level
  fields while keeping the RH write surface limited to questions. Candidate for a Phase 21
  follow-up or M4.

## From the code review (INFO, skipped per fix scope)

- IN-01 / IN-02 / IN-03 (20-REVIEW.md) — non-trivial behavior/copy refinements, left for backlog.

## From 20 UI review (advisory, 21/24 — non-blocking polish backlog)

- **Save-error reuses static band, not `<AsyncState>`** — UI-SPEC contracts a "Tentar novamente"
  retry + slow@8s via AsyncState; the panel hand-rolled a static error band (GuiaEntrevistaPanel
  ~L568). Recoverable (Salvar stays enabled, draft preserved). Fix: route save-error through
  `<AsyncState onRetry={handleSave} retrying={saving}>`. (Experience Design 2/4.)
- **Hardcoded `#00109E` on the Select popover** (GuiaEntrevistaPanel ~L223 `bg-[#00109E]/95`) →
  use the `bg-primary/95` token (per reference_bg_primary_token_fixed). One-line token swap.
- **AsyncState slow@8s dropped on save** — folded in once save-error routes through AsyncState (fix #1).
