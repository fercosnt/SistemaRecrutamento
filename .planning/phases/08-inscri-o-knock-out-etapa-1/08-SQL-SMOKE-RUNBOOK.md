---
phase: 8
slug: inscri-o-knock-out-etapa-1
artifact: sql-smoke-runbook
project_ref: isljnozzlvckrgjjbjwp
consumed_by:
  - "Plan 08-04 RPC-apply checkpoint (run AFTER submit_candidatura_atomic gains the knockout sweep)"
  - "/gsd:verify-work (live DB sign-off before phase close)"
created: 2026-06-08
---

# Phase 8 — Live SQL Smoke Runbook (Inscrição & Knock-out Etapa 1)

> Copy-pasteable SQL smoke steps to run against the **LIVE** project
> (`isljnozzlvckrgjjbjwp`) **after Plan 08-04 lands the knockout sweep** inside
> `submit_candidatura_atomic` (the candidatura columns `motivo_rejeicao`,
> `opcao_knockout_id`, `feedback_rejeicao` + the `vagas.qualificacao_etapa1`
> jsonb snapshot must already be applied — Plans 08-02/08-03).
>
> **How to run:** Supabase SQL Editor (RH/admin session) for the privileged
> fixture setup; switch the session role with `set_config('request.jwt.claims', …)`
> to simulate candidato/RH for the RLS-relevant calls. Apply the PL/pgSQL
> migration set via the **Supabase MCP `execute_sql`** path (Pitfall 2 —
> SQLSTATE 42601: a `$$` body adjacent to `COMMENT`/`GRANT` trips the pooler;
> MCP `execute_sql` bypasses it — see CLAUDE.md ## Commands + Phase 7 D-22).
>
> **Disposable-fixture idiom (mirrors Phase 7 runbook):** create a throwaway
> vaga + knockout pergunta + `pergunta_opcao_metadata` row (tag='knockout') +
> candidato, exercise the RPC, then **ROLLBACK-free cleanup** by `DELETE`ing the
> fixture rows by their captured ids. Do NOT wrap the smokes in a single
> `BEGIN; … ROLLBACK;` — the RPC commits its own work and we assert post-commit
> state.
>
> **Secrets note:** procedure only. Live JWTs / `request.jwt.claims` payloads are
> supplied at run-time by the operator — never paste a real JWT into this file.
>
> Each section states an **Expected result** and has a **pass/fail** box.

---

## ⚠️ [VERIFY LIVE — A4] — re-confirm `resposta_opcoes` shape BEFORE locking the join

The knockout sweep joins the answer key by **option TEXT**, not `opcao_id`
(D-10 / Pitfall 6): the candidate form writes `respostas_formulario.resposta_opcoes`
as a jsonb array of option **text strings** (e.g. `["Não"]`), while
`pergunta_opcao_metadata` carries both `opcao_id` and `opcao_texto`. The predicate
is therefore:

```sql
-- Texto-join (answer-key = texto-join, NOT opcao_id):
r.resposta_opcoes @> to_jsonb(m.opcao_texto)   -- jsonb text containment
```

**[VERIFY LIVE — A4]:** before locking the RPC in Plan 08-04, re-confirm via
Supabase MCP `execute_sql` what an EXISTING candidatura actually stored in
`resposta_opcoes` for a single_choice pergunta — it should be `["Não"]`, but if
a `permite_outros` pergunta wraps it in `{outros: …}` the `@>` predicate must be
revisited. Knockout questions are NOT `permite_outros`, so the simple array case
should hold; verify anyway.

```sql
-- A4 verification probe (read-only):
SELECT r.pergunta_id, r.resposta_opcoes, jsonb_typeof(r.resposta_opcoes) AS shape
FROM   public.respostas_formulario r
JOIN   public.perguntas_formulario p ON p.id = r.pergunta_id
WHERE  p.tipo_resposta IN ('single_choice','multiple_choice')
LIMIT  5;
-- Expect: resposta_opcoes shape = 'array'; elements are TEXT (e.g. "Não").
```

- [ ] A4 verified — `resposta_opcoes` is a text-string array; `@> to_jsonb(opcao_texto)` is safe

---

## Fixture setup (RH/admin session)

```sql
-- Capture ids in psql \gset or note them manually as <VAGA_ID>, <PERGUNTA_ID>,
-- <OPCAO_KO_ID>, <CANDIDATO_ID>.

-- 1. Disposable vaga (status ativa, qualificacao_etapa1 snapshot present):
INSERT INTO public.vagas (titulo, slug, status, pesos_avaliacao, testes_aplicaveis)
VALUES ('SMOKE-08 Disposable', 'smoke-08-disposable',
        'ativa'::public.status_vaga,
        '{"triagem":30,"work_sample_sjt":30,"redacao_cultural":15,"entrevista":25}'::jsonb,
        '[{"teste":"triagem","obrigatorio":true,"customizado":false}]'::jsonb)
RETURNING id;  -- → <VAGA_ID>

-- 2. Knockout pergunta (Etapa-1 qualification, single_choice, obrigatoria):
INSERT INTO public.perguntas_formulario
  (vaga_id, tipo_resposta, texto_pergunta, obrigatoria, opcoes_resposta)
VALUES ('<VAGA_ID>'::uuid, 'single_choice',
        'Você tem disponibilidade para trabalhar presencialmente em São Paulo, perto dos metros Brigadeiro e Paraíso?',
        true,
        '[{"id":"<OID_SIM>","texto":"Sim"},{"id":"<OID_NAO>","texto":"Não"}]'::jsonb)
RETURNING id;  -- → <PERGUNTA_ID>

-- 3. Tag the "Não" option as knockout in pergunta_opcao_metadata:
INSERT INTO public.pergunta_opcao_metadata
  (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
VALUES ('<PERGUNTA_ID>'::uuid, '<OID_NAO>'::uuid, 'Não', 'knockout', 0, 1)
RETURNING opcao_id;  -- → <OPCAO_KO_ID>  (= <OID_NAO>)

-- 4. Disposable candidato (or reuse an existing test candidato id):
--    capture as <CANDIDATO_ID>.
```

---

## SMOKE-1 — knockout-fires (answer "Não" → auto-rejection)

Submit a candidatura whose answer to the knockout pergunta is **"Não"**.

```sql
SELECT public.submit_candidatura_atomic(
  '<CANDIDATO_ID>'::uuid,
  '<VAGA_ID>'::uuid,
  'curriculos/<CANDIDATO_ID>/smoke.pdf',
  'smoke.pdf',
  123456,
  '[{"pergunta_id":"<PERGUNTA_ID>","resposta_opcoes":["Não"]}]'::jsonb
);

-- Assert the rejection state on the candidatura row:
SELECT status, etapa_atual, motivo_rejeicao, opcao_knockout_id, feedback_rejeicao
FROM   public.candidaturas
WHERE  candidato_id = '<CANDIDATO_ID>'::uuid AND vaga_id = '<VAGA_ID>'::uuid;
```

**Expected result:**
- `status = 'rejeitado'`
- `etapa_atual = 'inscricao'`
- `motivo_rejeicao = 'knockout_automatico'`
- `opcao_knockout_id = <OPCAO_KO_ID>` (the matched "Não" metadata `opcao_id`)
- `feedback_rejeicao = 'Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.'` (D-15 neutral)

- [ ] PASS  - [ ] FAIL

---

## SMOKE-2 — survivor-passes (answer "Sim" → advances to triagem)

Submit a candidatura whose answer is **"Sim"** (no knockout option matched).

```sql
-- Use a fresh candidato (<CANDIDATO_ID_2>) to avoid the CAND-04 UNIQUE guard:
SELECT public.submit_candidatura_atomic(
  '<CANDIDATO_ID_2>'::uuid,
  '<VAGA_ID>'::uuid,
  'curriculos/<CANDIDATO_ID_2>/smoke.pdf',
  'smoke.pdf',
  123456,
  '[{"pergunta_id":"<PERGUNTA_ID>","resposta_opcoes":["Sim"]}]'::jsonb
);

SELECT status, etapa_atual, motivo_rejeicao, opcao_knockout_id
FROM   public.candidaturas
WHERE  candidato_id = '<CANDIDATO_ID_2>'::uuid AND vaga_id = '<VAGA_ID>'::uuid;
```

**Expected result:**
- `etapa_atual = 'triagem'`
- `status` is NOT `'rejeitado'` (a survivor — `aguardando_resposta` / normal handoff status)
- `motivo_rejeicao IS NULL` and `opcao_knockout_id IS NULL`

- [ ] PASS  - [ ] FAIL

---

## SMOKE-3 — single-history-row (no double-write on knockout)

After SMOKE-1 (a knockout), assert there is **exactly ONE**
`historico_candidatura` row for the rejected candidatura, written by the
explicit D-13 RPC INSERT (`auto_rejeitado=true`, `ator IS NULL`) — and that the
`avancar_etapa()` trigger did NOT add a second row (it is `BEFORE UPDATE OF
etapa_atual` only, and the knockout keeps `etapa_atual='inscricao'` unchanged, so
its `IS NOT DISTINCT FROM` guard skips it).

```sql
SELECT count(*)                          AS hist_rows,
       bool_and(auto_rejeitado)          AS all_auto_rejeitado,
       bool_and(ator IS NULL)            AS all_ator_null
FROM   public.historico_candidatura h
JOIN   public.candidaturas c ON c.id = h.candidatura_id
WHERE  c.candidato_id = '<CANDIDATO_ID>'::uuid AND c.vaga_id = '<VAGA_ID>'::uuid;
```

**Expected result:**
- `hist_rows = 1` (exactly one row — no double-write)
- `all_auto_rejeitado = true`
- `all_ator_null = true` (`ator IS NULL` — service-role/automatic rejection)

- [ ] PASS  - [ ] FAIL

---

## SMOKE-4 — seeded-defaults (presencial-SP for any cargo; harmonização only for dentista)

Assert the Plan 08-03 template seed is reflected in `vagas.qualificacao_etapa1`:
the presencial-SP knockout question is present for ANY cargo, and the
harmonização-orofacial knockout appears ONLY for `dentista`.

```sql
-- presencial-SP knockout present for a non-dentista cargo (e.g. recepcionista):
SELECT v.titulo,
       v.qualificacao_etapa1 @> '[{"texto_pergunta":"Você tem disponibilidade para trabalhar presencialmente em São Paulo, perto dos metros Brigadeiro e Paraíso?"}]'::jsonb
         AS tem_presencial_sp
FROM   public.vagas v
WHERE  v.cargo_slug = 'recepcionista' AND v.qualificacao_etapa1 IS NOT NULL
LIMIT  1;

-- harmonização knockout present ONLY for dentista:
SELECT v.cargo_slug,
       (v.qualificacao_etapa1::text ILIKE '%harmoniza%') AS tem_harmonizacao
FROM   public.vagas v
WHERE  v.qualificacao_etapa1 IS NOT NULL
  AND  v.cargo_slug IN ('dentista','recepcionista','asb');
```

**Expected result:**
- presencial-SP: `tem_presencial_sp = true` for the non-dentista cargo.
- harmonização: `tem_harmonizacao = true` ONLY for `cargo_slug='dentista'`;
  `false` for every other cargo.

- [ ] PASS  - [ ] FAIL

---

## Cleanup (ROLLBACK-free)

```sql
-- Delete fixture rows by captured id (order respects FKs):
DELETE FROM public.historico_candidatura
  WHERE candidatura_id IN (SELECT id FROM public.candidaturas WHERE vaga_id = '<VAGA_ID>'::uuid);
DELETE FROM public.respostas_formulario
  WHERE candidatura_id IN (SELECT id FROM public.candidaturas WHERE vaga_id = '<VAGA_ID>'::uuid);
DELETE FROM public.candidaturas               WHERE vaga_id = '<VAGA_ID>'::uuid;
DELETE FROM public.pergunta_opcao_metadata    WHERE pergunta_id = '<PERGUNTA_ID>'::uuid;
DELETE FROM public.perguntas_formulario       WHERE vaga_id = '<VAGA_ID>'::uuid;
DELETE FROM public.vagas                       WHERE id = '<VAGA_ID>'::uuid;
-- (drop disposable candidatos if they were created solely for the smoke)
```

---

## Sign-off

- [ ] [VERIFY LIVE — A4] `resposta_opcoes` shape confirmed; `@> to_jsonb(opcao_texto)` locked
- [ ] SMOKE-1 knockout-fires PASS (status=rejeitado, etapa=inscricao, motivo=knockout_automatico, opcao_knockout_id set, neutral feedback)
- [ ] SMOKE-2 survivor-passes PASS (etapa=triagem, status≠rejeitado)
- [ ] SMOKE-3 single-history-row PASS (1 row, auto_rejeitado=true, ator IS NULL)
- [ ] SMOKE-4 seeded-defaults PASS (presencial-SP any cargo; harmonização dentista-only)

**Operator:** ______________________  **Date:** ____________
