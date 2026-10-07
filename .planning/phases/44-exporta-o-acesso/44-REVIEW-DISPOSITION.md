---
phase: 44-exporta-o-acesso
review: 44-REVIEW.md
reviewed: 2026-10-06T21:25:28Z
counts: {critical: 1, warning: 7, info: 7}
---

# Disposição dos achados — re-revisão do G5

Todas as linhas nascem `open`. CR-01 é texto ao titular JÁ PUBLICADO (front no ar desde 21:13Z); WR-05/WR-06 pedem decisão do operador.

> Atualizada em 2026-10-06 pelo 44-16 (publicação em 2026-10-07T01:14Z, push `31d24652`): CR-01, WR-01, WR-02, WR-03 e WR-07 `fixed`; WR-06 `decided` (BD-16). O que segue `open` (WR-04, WR-05, IN-01..IN-07) segue por BD-15.

| ID | Severidade | Achado | Disposição |
|---|---|---|---|
| CR-01 | critical | The "what is not in this copy" statement in both delivered files is false under allowlist 1.4.0 — titular data is withheld without the titular being told | fixed — d5402c1c (44-14) · publicado em index-DTxaEkc3.js (push 31d24652) |
| WR-01 | warning | Assertion (k) cannot see `VALUES` rows outside the canonical format, so the PROD drift gate can be silenced with every local gate green (proven) | fixed — a38041ae (44-15 Task 2) |
| WR-02 | warning | Nothing pins the smoke's fail-loud structure or its predicate — (k2) compares only the five verdict strings | fixed — f2e357a8 (44-15 Task 1) |
| WR-03 | warning | The smoke guard fails OPEN on NULL — a renamed or missing JSON key silently disables both checks | fixed — f2e357a8 (44-15 Task 1) |
| WR-04 | warning | The "READ-ONLY in PROD" invariant of both drift files is enforced by keyword grep, which misses most ways to write | open |
| WR-05 | warning | BD-9 withholds `cognitivo_liberacao.liberado_por/revogado_por` from the titular, but RLS already serves them to the same titular | open |
| WR-06 | warning | `solicitacoes_dados.plano` is withheld wholesale on a key-names-only inspection, by a decision the operator never made, although most of its keys describe the titular's own data | decided — BD-16 (operador, 2026-10-06): plano fica fora e a frase nomeia a categoria; sem mudança de código |
| WR-07 | warning | (i2) sortedness assertion rejects CORRECT generator output on real data — it passes only because the fixture has no prefix-sharing table names | fixed — 813b191c (44-15 Task 3) |
| IN-01 | info | `set_config(..., false)` leaves a session-level GUC on the pooled backend | open |
| IN-02 | info | Column labels are keyed by column name only — the same label carries opposite meanings, and the BD-10 "base" is rendered as a raw enum token | open |
| IN-03 | info | The scope rules still state the exact belief G5 disproved | open |
| IN-04 | info | The BD-14 reminder in `p46apply` covers only part of the apply paths and fires on nearly every migration | open |
| IN-05 | info | The drift universe comes from `information_schema`, which filters by privilege | open |
| IN-06 | info | (19) checks only negatives for the two new tables | open |
| IN-07 | info | The premise behind BD-11 is not watched by any gate | open |
