---
phase: 15-decis-o-final-audit-vel-lgpd-art-20
status: partial
created: 2026-06-26
updated: 2026-06-26
source: 15-VERIFICATION.md (status human_needed, 5/5 must-haves verified in code)
blocking: false
note: >
  The full code path for both items is VERIFIED statically. Only the live
  round-trip (real decided data + N8N webhook delivery) cannot be exercised by
  unit/grep. Same deferral shape as Phase 14. Run when a real decided population
  exists in PROD; none of these block the milestone close.
---

# Phase 15 — Human UAT (deferred live round-trips)

## Resultado da sessão live 2026-06-26 (seed E2E do funil)

Candidatura de teste `a1dd4c42-bc92-4c37-a584-dc19a59a631d`, decisão `rejeitado`
registrada (justificativa 264 chars, por_usuario NOT NULL).

- **UAT-15-01 — Explicação LGPD Art. 20 (candidato): ✅ PASS.** Página
  `/candidato/explicacao/:id` mostra motivo respeitoso/templated, **sem vazar
  score/percentil/QI/banda** (LGPD-04 / RNF-07a); botão "Solicitar revisão por pessoa
  natural" idempotente (já solicitada → desabilitado + "Você já solicitou a revisão").
  Stamps `explicacao_solicitada_em` + `revisao_solicitada_em` confirmados via RPC.
- **Consolidação de decisão:** funciona (breakdown por etapa + recomendação advisory
  "decisão é sempre humana"), mas com **1 bug aberto** `DEC-CONSOLIDA-SJT-01` [alta] —
  SJT vira N/A e triagem-fantasma puxa o score consolidado para 0
  (ver `.planning/todos/pending/`).
- **Comparativo:** ✅ empty-state correto ("Nenhum finalista para comparar ainda").
- **Append-only:** ✅ detecta decisão existente ("Já existe uma decisão registrada").
- **Pendente:** entrega real do webhook N8N (`revisao_solicitada`) não verificada
  in-session.

Two items require **real production data** and an **external delivery channel** that
cannot be observed by automated tests. The implementations are verified in code
(see `15-VERIFICATION.md`, 5/5 must-haves); these are live-data confirmations only.

---

## UAT-15-01 — LGPD Art. 20 candidate round-trip (over a REAL rejected candidatura)

**Requirement:** DECISAO-04 / LGPD Art. 20
**Why human:** needs a live `decisao_final.decisao='rejeitado'` row + the live N8N webhook endpoint; the round-trip and notification delivery cannot be exercised by grep/unit tests.

**Pre-condition:** a candidatura that has a recorded final decision of `rejeitado`
(via the RH decision surface `/rh/candidato/:id/decisao`).

**Steps:**
1. Log in as the **candidate** who owns that rejected candidatura.
2. Open `/candidato/explicacao/:id`.
3. Confirm the page renders a **respectful, non-clinical templated reason** — and
   that **no score / band / percentil / QI** appears anywhere (LGPD-04 / RNF-07a).
4. Confirm the visit stamps `explicacao_solicitada_em` (one-shot; revisiting does not re-stamp).
5. Click **"Solicitar revisão por pessoa natural"**.
6. Confirm `revisao_solicitada_em` is set (idempotently — re-click does not duplicate).
7. Confirm the **N8N webhook** delivers the `decisao.revisao_solicitada` notification to
   the responsible RH (`vaga.created_by`).

**Expected:** templated reason (never the raw `justificativa`, never a score); visit
stamp; idempotent revision request; RH notified. A candidate whose decision is
`aprovado` / `em_espera`, or who has no decision row, sees **"Esta página não está disponível"**.

**Result:** ⬜ PASS · ⬜ FAIL — notes: __________

---

## UAT-15-02 — Bias-audit snapshot + CSV over a REAL decided population

**Requirement:** LGPD-03
**Why human:** needs a live population of decided candidaturas with `data_nascimento`
so EEOC 4/5 banding produces real (non-empty) bands; the live snapshot math + CSV
blob cannot be exercised without real rows.

**Steps:**
1. Log in as **administrador**, open `/admin/bias-audit`.
2. Pick a period that has **decided candidaturas with birthdates**, click **"Gerar snapshot"**.
3. Confirm **one** `bias_audit_log` row writes with **banded aggregates only** (no per-candidate PII).
4. Confirm each band shows `selection_rate` + `razao_4_5` + the **flag tint when ratio < 0.8**,
   with the correct reference-band micro-label (highest selection rate).
5. Confirm the honest **"apenas faixa etária — raça/gênero não coletados (LGPD-01)"** banner is always visible.
6. Confirm the **`excluidos_sem_data` footnote** appears when birthdates are missing (>0).
7. Confirm the **CSV download** exports `dados.bands[]`.

**Expected:** banded-aggregates-only persistence; per-band 4/5 math + flag; AGE-only
banner always present; missing-birthdate footnote when applicable; CSV blob downloads.

**Result:** ⬜ PASS · ⬜ FAIL — notes: __________

---

*Deferred from the autonomous run 2026-06-26. Neither item blocks Phase 16 or the
v2.0 milestone close — they are live-data confirmations of an already-verified path.*
