---
phase: 35-painel-do-candidato-leitura-do-agendamento
reviewed: 2026-07-17T05:10:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/lib/datetime/formatDataHoraSP.ts
  - src/lib/datetime/__tests__/formatDataHoraSP.test.ts
  - src/features/agendamento/services/agendamentoCandidatoService.ts
  - src/features/agendamento/services/__tests__/agendamentoCandidatoService.test.ts
  - src/features/agendamento/hooks/useMeuAgendamento.ts
  - src/features/agendamento/components/AgendamentoCandidatoCard.tsx
  - src/features/agendamento/components/__tests__/AgendamentoCandidatoCard.test.tsx
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/features/entrevista/components/EntrevistaDashboard.tsx
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: resolved
resolution:
  fixed: [WR-01, WR-02, IN-03]
  fix_commits: [cd668d9, e44d6b3]
  remaining_info: [IN-01, IN-02, IN-04]
  note: >-
    Both Warnings fixed during autonomous code-review-fix chain. WR-01: online link scheme
    validated (isSafeHttpUrl, http/https allowlist; unsafe javascript:/data: → inert text; RTL
    tests added). WR-02: RFC 5545 §3.1 UTF-8 octet-aware line folding added. IN-03 (unguarded
    RangeError in .ics builder) folded into the WR-02 commit (typed INVALID_INPUT guard).
    Post-fix: agendamento 48/48 green, build green, tsc 97 (0 new in touched files).
    3 advisory INFO remain (Blob-revoke timing, aria-label on <p>, upcoming gate only excludes cancelada).
---

# Phase 35: Code Review Report

**Reviewed:** 2026-07-17T05:10:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 35 ships the candidate-facing READ-ONLY agendamento card, the client-side
`.ics` builder (AGEND-05), and extracts the SP-pinned datetime formatter into a
shared util. The security-critical surfaces are **correctly built** — I verified each
of the stated priorities and found no BLOCKER:

- **SEG-03 / PII (verified clean):** The candidate read goes ONLY through
  `supabase.rpc('get_meu_agendamento')` — no `.from('agendamentos_entrevista')`, no
  `select('*')`. The domain `MeuAgendamentoRow` type carries exactly the 7-col
  allowlist; `observacoes_rh`, `entrevistador`, `vaga_id`, `agendado_por`, `updated_by`
  are absent from the type, the card, and the `.ics` file (SUMMARY is a generic
  constant). The guard test asserts both the RPC call and the absence of RH-internal keys.
- **.ics correctness (verified):** CRLF line joins, correct TEXT-escaping order
  (backslash-first), UTC basic-form DTSTART/DTEND(+1h)/DTSTAMP, and a UID are all present.
  `toIcsUtc` produces the correct `YYYYMMDDTHHMMSSZ` form. Blob URL IS revoked (no leak).
- **Gating (verified):** `.ics` button gated by `upcoming`, badge by `dentro24h =
  upcoming && estaDentroDe24h`. `ehUpcomingNaoCancelada` returns `future && status !==
  'cancelada'` — no inverted boolean; a future+cancelada row shows neither control, and
  the RTL suite genuinely covers cases (a)/(b)/(c).
- **Link safety (verified):** online link uses `rel="noopener noreferrer" target="_blank"`;
  presencial is always plain text.
- **Timezone (verified):** both consumers import the shared `formatDataHoraSP`; the
  `EntrevistaDashboard` extraction is verbatim and no caller broke.

**Adversarial note (false positive avoided):** I traced the concern that the card's
interactive controls (`.ics` button, video `<a>`, retry) would bubble their click to
the parent `GlassCard onClick` (which navigates to the vaga) because — unlike the
sibling "Próximo passo" / LGPD blocks — the card adds no `stopPropagation`. On
inspection this is a **non-issue**: `Glass` (glass.tsx:45-86) never destructures or
forwards `onClick`, so the `GlassCard onClick` in `DashboardCandidatoPage` is silently
dropped and no navigation handler is attached to bubble to. That dropped `onClick` is
the pre-existing `GlassProps` defect the review brief flagged as out-of-scope, so no
action is required here — but if `Glass` is ever fixed to forward `onClick`, the
agendamento card's controls WILL need `stopPropagation`.

Remaining findings are hardening (2 WARNING) and quality/robustness notes (4 INFO).

## Warnings

### WR-01: Online meeting link rendered as `href` without URL-scheme validation

**File:** `src/features/agendamento/components/AgendamentoCandidatoCard.tsx:191-196`
**Issue:** For `tipo === 'online'`, `row.local_ou_link` is interpolated directly into
`<a href={row.local_ou_link}>`. The value is RH-written (via the agendamento write
layer), so a malicious/compromised RH user (or bad data) could set it to a
`javascript:` or `data:` URL, which the candidate then clicks. `rel="noopener
noreferrer" target="_blank"` mitigates opener/referrer leakage but does NOT sanitize
the scheme. This is a candidate-facing surface, so defense-in-depth warrants validating
the scheme before rendering an anchor.
**Fix:** Validate `http(s):` before linkifying; otherwise render as text (same fallback
as the null case):
```tsx
const isSafeHttpUrl = (u: string) => /^https?:\/\//i.test(u.trim())
// ...
row.tipo === 'online' ? (
  row.local_ou_link && isSafeHttpUrl(row.local_ou_link) ? (
    <a href={row.local_ou_link} target="_blank" rel="noopener noreferrer" ...>
      Entrar na videochamada
    </a>
  ) : (
    <p className="text-sm text-white/70">Link da videochamada será informado em breve</p>
  )
) : ( /* presencial: always text */ )
```

### WR-02: `.ics` builder does not fold lines longer than 75 octets (RFC 5545 §3.1)

**File:** `src/features/agendamento/services/agendamentoCandidatoService.ts:128-154`
**Issue:** `gerarIcsAgendamento` emits each property on a single unfolded line. RFC 5545
§3.1 requires content lines longer than 75 octets to be folded (CRLF + a leading space).
A long `LOCATION` — an online meeting URL or a full street address after `escapeIcsText`
adds `\,` sequences — can easily exceed 75 octets. Google/Apple/modern Outlook tolerate
unfolded lines, but strict/legacy parsers may truncate or reject the VEVENT. The builder
otherwise claims §3.3.11 compliance, so this is a genuine spec gap in a hand-rolled
generator (real-world risk is low, hence WARNING not BLOCKER).
**Fix:** Fold each assembled line before the CRLF join:
```ts
function foldIcsLine(line: string): string {
  // fold on 75 octets; continuation lines start with a single space
  const chunks: string[] = []
  let rest = line
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75))
    rest = ' ' + rest.slice(75)
  }
  chunks.push(rest)
  return chunks.join('\r\n')
}
// return lines.map(foldIcsLine).join('\r\n')
```

## Info

### IN-01: `URL.revokeObjectURL` runs synchronously in the same task as `link.click()`

**File:** `src/features/agendamento/services/agendamentoCandidatoService.ts:169-171`
**Issue:** `link.click()` immediately followed by `URL.revokeObjectURL(url)` in the same
synchronous task can cancel the download in some browsers (historically Firefox) before
the blob is read. The AGEND-05 "no leak" requirement is satisfied (the URL IS revoked),
and this mirrors the established `biasAuditService.ts:155` pattern, so it is called out
only as a robustness note.
**Fix:** Defer the revoke a tick: `setTimeout(() => URL.revokeObjectURL(url), 0)`.

### IN-02: `aria-label` on a `<p>` (paragraph role) is ARIA-prohibited

**File:** `src/features/agendamento/components/AgendamentoCandidatoCard.tsx:178-185`
**Issue:** The datetime `<p>` sets `aria-label={dataHoraLonga}`. The implicit
`paragraph` role does not support naming from author, so some assistive tech / axe-core
will drop the long-form label. Impact is limited because the visible short form
(`dd/mm/aaaa às hh:mm (horário de Brasília)`) is already read by screen readers.
**Fix:** Move the long form to a visually-hidden `<span className="sr-only">` sibling
instead of `aria-label`, or wrap the value in a role that supports naming.

### IN-03: `gerarIcsAgendamento` / `toIcsUtc` throw `RangeError` on an invalid `data_hora`

**File:** `src/features/agendamento/services/agendamentoCandidatoService.ts:110-133`
**Issue:** `new Date(iso).toISOString()` throws `RangeError: Invalid time value` for an
unparseable/empty `data_hora`. These functions are exported and rely entirely on the
caller's `upcoming` gate (which requires a valid future date) for protection — but the
sibling predicates (`ehUpcomingNaoCancelada`, `estaDentroDe24h`) all guard with
`Number.isNaN`, so the builder is the one un-guarded seam.
**Fix:** Add an early guard in `gerarIcsAgendamento` (or `toIcsUtc`) that treats an
invalid date as a caller error / no-op, mirroring the `Number.isNaN` guards elsewhere.

### IN-04: `upcoming` gate only excludes `cancelada`, not other terminal statuses

**File:** `src/features/agendamento/services/agendamentoCandidatoService.ts:178-186`
**Issue:** `ehUpcomingNaoCancelada` returns `future && status !== 'cancelada'`. A row with
a FUTURE `data_hora` but a terminal status of `concluida` or `nao_compareceu`
(contradictory but reachable via RH data entry) would still show the `.ics` button and
the ≤24h badge. The spec only requires `cancelada` to gate, so this is per-spec, but the
gate name ("upcoming") implies "still active," which `concluida`/`nao_compareceu` are not.
**Fix (optional):** If product intent is "only actively-scheduled interviews expose the
controls," widen the exclusion, e.g. `['cancelada','concluida','nao_compareceu']
.includes(status) === false`.

---

_Reviewed: 2026-07-17T05:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
