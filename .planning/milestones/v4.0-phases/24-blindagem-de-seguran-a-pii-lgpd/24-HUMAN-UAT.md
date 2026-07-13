# Phase 24 — Human UAT (live checks deferred)

Everything else in Phase 24 was verified live (SQL smokes + EF 401 smokes). These need a **real authenticated session** the orchestrator can't cleanly simulate, and are safe to run whenever convenient — the security boundaries are already enforced live.

## 1. UX-08 — live 116-item Big-Five submit (candidate session)
**Why manual:** `submit-bigfive-final` is `verify_jwt=true`, so a raw curl 401s at the gateway before the body is validated. Needs a candidate logged in, on a candidatura in etapa `avaliacao_assincrona`.
**Steps:**
1. Log in as `candidato.funil@teste.com` (or seed a candidatura to etapa `avaliacao_assincrona`).
2. Open the Big-Five questionnaire — confirm it shows **116** items (not 120), with no political/opinion items.
3. Submit all 116 answers → expect **success** (neutral `{ ok:true }`, no score shown), a `scores_candidato` row written, and **`candidaturas.status` unchanged** (RNF-07a — no auto-reject).
4. (Optional negative) A crafted 120-item body → **400** (proves the old bundle is gone). Covered by deno test `UX-08 — a 120-item body … is rejected 400`.
**Expected:** 116-item submit scores with prorated O; no auto-reject.

## 2. SEC-01/02/07 — live candidate API projection (candidate session)
**Why manual:** proves the *real* PostgREST projection a logged-in candidate sees.
**Steps (as a logged-in candidato):**
- `GET /rest/v1/perguntas?select=rubric` → **0 rubric values** (permission denied / column absent).
- `GET /rest/v1/redacoes_candidato?select=red_flag_etico` on own row → **0 rows**; the "minha redação" screen still renders via `get_minha_redacao` (texto/status only, no score/color).
- `GET /rest/v1/cognitivo_itens?select=gabarito_idx` → **0 rows** (row-deny).
**Expected:** every sensitive column unreachable; the candidate UI still works via the DEFINER RPCs.

## 3. SEC-05/06/08 — two-recruiter horizontal check (two RH sessions)
**Why manual:** the SQL smoke simulated a non-owner via `set_config`; a real second-recruiter session is the belt-and-suspenders proof.
**Steps:** with two RH accounts (owner of a vaga + a non-owner), the non-owner opens the owner's vaga's candidates/analyses → **denied / empty**; the owner + an `administrador` still see them.
**Expected:** non-owner blocked; owner + admin unaffected.

## 4. SEC-04 — correct-Bearer devolutiva (optional)
The no-Bearer/wrong-Bearer 401s are already proven live. A full 200 requires the service Bearer + a real `score_id` (triggers a real devolutiva generation) — exercise only if you want the end-to-end confirmation.

---
*None of these block the phase — the boundaries are enforced live. They confirm the authenticated end-user experience.*
