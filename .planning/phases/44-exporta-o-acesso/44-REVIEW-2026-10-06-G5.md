---
phase: 44-exporta-o-acesso
reviewed: 2026-10-06T21:25:28Z
depth: standard
diff_base: 797c6110
files_reviewed: 13
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/__tests__/genExportAllowlist.test.ts
  - docs/compliance/export-allowlist.json
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/sql/gen-export-allowlist.cjs
  - p46apply.cjs
  - src/features/privacidade/services/__tests__/exportacaoService.test.ts
  - src/features/privacidade/services/exportacaoService.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/exportar-meus-dados/__tests__/index.test.ts
  - supabase/tests/p44_export_drift_smoke.sql
  - docs/compliance/catalogo-vivo-44.json
findings:
  critical: 1
  warning: 7
  info: 7
  total: 15
status: issues_found
---

# Phase 44: Code Review Report (G5 re-review, 44-10..44-13)

**Reviewed:** 2026-10-06T21:25:28Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This review covers the G5 gap-closure round: the drift gate now checks against the live catalog, allowlist 1.4.0 is in place, assertions (l) and (19) are named, and the product labels are new. The previous review (`44-REVIEW-2026-08-04.md`) is unchanged.

**What was checked and holds up:**
- **Mirror vs. generator.** `export-allowlist.json` and the `EXPORT_ALLOWLIST` literal in `_shared/exportAllowlist.ts` parse to byte-identical JSON. `gen-export-allowlist.cjs --check` exits 0.
- **Vetoed columns.** None of the vetoed columns appear in `tabelas.*.colunas`: `retencao_hold.detalhe/criado_por/liberado_por`, `cognitivo_liberacao.liberado_por/revogado_por`, `solicitacoes_dados.plano/recibo_enviado_em`.
- **How the EF reads the two new tables.** The EF reads them generically, after the `candidaturas` bridge, with `.in("candidatura_id", ids)`. It never filters them by `eq`.
- **No new staff pointers missed.** `criado_por` and `liberado_por` in `ponteiros.de_terceiro` do not catch any previously-exported column. A catalog scan found no other in-scope `*_por`/`*_by` column outside the veto.
- **Test suites.** The three Vitest suites pass (77/77).

**Issues found:**
- **The titular-facing boundary statement is now false.** Both delivered files (`.html` and `.json`) still say the copy leaves out only system telemetry. Since 1.4.0 the copy also deliberately leaves out RH's free text about retaining *this person's* data, plus the deletion-engine jsonb. That is CR-01.
- **The gates around the drift smoke can fail open, or be silenced, while every local gate stays green.** This was proven by injection for (k) (WR-01). The smoke's fail-loud structure is not pinned (WR-02). Its guard treats NULL as pass (WR-03). Its READ-ONLY claim is enforced only by grepping for keywords (WR-04).
- **`cognitivo_liberacao` RLS already exposes the staff ids that BD-9 withholds** (WR-05).
- **A gate assertion reproves correct output on real data** (WR-07).

## Critical Issues

### CR-01: The "what is not in this copy" statement in both delivered files is false under allowlist 1.4.0 — titular data is withheld without the titular being told

**File:** `src/features/privacidade/services/exportacaoService.ts:530-531` (rendered at `:481` in the `.html` and embedded at `:706` as `o_que_nao_esta_nesta_copia` in the `.json`)

**Issue:**
The only boundary statement shipped to the titular is:

> «Não entram os registros internos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia. Eles descrevem o sistema, não você.»

Allowlist 1.4.0 (44-11) now deliberately withholds data that, by the artifact's own reasoning, is *about the titular*:
- `retencao_hold.detalhe`: «TEXTO LIVRE do RH sobre a retenção … o raciocínio interno de quem retém». This is the RH's text about keeping *this person's* data past the deadline. The artifact itself notes that the only PROD row has it filled («protege um dado que existe hoje»).
- `solicitacoes_dados.plano`: the deletion engine's plan for *this person's* exclusion request (`achados_resumo`, `contagens`, `previsto`).
- Staff identifiers on four more columns (`criado_por`, `liberado_por`, `revogado_por`).

None of these "describe the system, not you". The `.json` carries the same sentence as machine-readable metadata (`o_que_nao_esta_nesta_copia`), so the false claim travels with the copy.

The project already treated the opposite mismatch as a defect: §7.22 in the `oQueEsta` docblock says «Uma cópia mais generosa que a promessa ainda é uma promessa errada». A copy that is *less* generous than the promise, and says so falsely, is the worse direction. `decisao_final.justificativa` had the same gap before 1.4.0. G5 widened it with an operator-decided withholding of data that exists in PROD.

None of the G5 plans (44-10..44-13) touched this copy. The (p5) test pins only labels.

**Fix:** The withholding itself is the operator's decision (BD-10, BD-13 (ii)). The *statement* must match it. Amend `oQueNaoEsta` through the UI-SPEC with named categories. For example:
```ts
oQueNaoEsta:
  'Não entram os registros internos de funcionamento do sistema — por exemplo, o tempo e o custo de processamento das nossas ferramentas de tecnologia. ' +
  'Também não entram a identificação das pessoas da equipe que agiram no seu processo, as anotações internas da equipe sobre a conservação dos seus dados além do prazo (o motivo e as datas entram) ' +
  'e a ficha técnica do motor de exclusão. Se quiser saber mais sobre algum desses itens, escreva para ' + CANAL_PRIVACIDADE_EMAIL + '.',
```
Then add a test assertion tying the statement to the artifact: every `colunas_excluidas` reason family (`pii_de_terceiro`, `decisoes_por_coluna: BD-10`, and so on) must map to a clause in `oQueNaoEsta`. That way the next veto cannot ship without updating the statement.

## Warnings

### WR-01: Assertion (k) cannot see `VALUES` rows outside the canonical format, so the PROD drift gate can be silenced with every local gate green (proven)

**File:** `docs/compliance/__tests__/exportAllowlist.test.ts:156`

**Issue:** The extractor only matches `^ {4}\('x','y'\),?$`. A row that differs in any way still executes in SQL but is invisible to (k). Examples: indentation other than exactly 4 spaces, a space after the comma, a trailing `-- comment`, two tuples on one line, or a tuple on the `VALUES` line itself.

(k) only proves that *extracted set == artifact*. It does not prove that *SQL tuples == extracted set*. The generator docblock (`gen-export-allowlist.cjs`, comment above `INDENT_VALUES`) defends the strict regex against the "too loose" failure. It misses this one: extra rows go unseen.

I measured this on a scratch copy of `p44_export_drift_smoke.sql` by injecting two rows into the `allowlist` CTE:
```
  ('candidatos','coluna_nova_vazando'),     -- 2-space indent
    ('candidatos', 'outra'),                -- space after comma
```
Result: (k) still extracts 526 pairs (= 395 + 56 + 75), so it stays green. The SQL now holds 528 tuples. A pair added this way stops a new live column from being reported, and nothing local notices. This is the CLAUDE.md failure mode «um padrão de varredura que não enxerga o idioma do arquivo que ele vigia».

**Fix:** In `paresDoArquivo`, also count every tuple in the comment-stripped slice with a permissive regex. Fail if that count differs from the strict extraction:
```ts
const solto = (t: string) => (semComentarioTexto(t).match(/\(\s*'[^']*'\s*,\s*'[^']*'\s*\)/g) ?? []).length
expect(solto(sql.slice(0, cortes[1])), `${nome}: tupla fora do formato canônico na CTE allowlist`).toBe(allowlist.length)
// idem excluidas / tabelas
```

### WR-02: Nothing pins the smoke's fail-loud structure or its predicate — (k2) compares only the five verdict strings

**File:** `docs/compliance/__tests__/exportAllowlist.test.ts:895-905`; `supabase/tests/p44_export_drift_smoke.sql:620-711`

**Issue:** The smoke header says it runs «o MESMO predicado» as `05-export-allowlist-drift.sql`, and (k2) is described as what «prende que os dois arquivos não divergem». In fact (k2) extracts only literals that start with `COLUNA`/`TABELA`. All of the following leave (k), (k2) and (l) green:
- editing `vivo`, `tabelas_vivas` or the `FULL OUTER JOIN … WHERE` in the smoke only (for example `AND t.table_name NOT LIKE 'purga%'`);
- deleting the `DO $gate$` block;
- wrapping it in `EXCEPTION WHEN OTHERS`;
- removing the `n_drift > 0` branch.

The cadence is manual (BD-14), so the smoke is the only gate that sees the live DB. Its fail-loud property is now held only by convention.

**Fix:** Add a (k3) assertion. Normalise whitespace in the CTE bodies `com_veredito`, `tabelas_vivas`, `vivo` and both drift arms, and assert they are equal across the two files. Also assert that the smoke contains `RAISE EXCEPTION 'P44-DRIFT FAIL:` and `RAISE EXCEPTION 'P44-DRIFT FAIL (população vazia)`, and contains no `EXCEPTION WHEN`. The better option is to generate the smoke from the report, or both from one template, so only one copy of the predicate exists.

### WR-03: The smoke guard fails OPEN on NULL — a renamed or missing JSON key silently disables both checks

**File:** `supabase/tests/p44_export_drift_smoke.sql:694-703`

**Issue:** Both guards are `IF (r->>'k')::int = 0 OR …` and `IF (r->>'n_drift')::int > 0`. If a key is renamed in the `json_build_object` at `:673-684` but not in the `DO` block, or the reverse, `r->>'k'` is NULL. Then `NULL > 0` is NULL and the `IF` branch is skipped. The smoke reaches the final `SELECT … 'pass', true`.

Today the keys match. But this is exactly the shape the EF fixed for the cooldown («um controle de segurança cujo ramo de entrada-ilegível é "permitir"», `exportar-meus-dados/index.ts`). WR-02 means no test would catch the rename.

**Fix:** Fail closed:
```sql
IF coalesce((r->>'n_tabelas_vivas')::int, 0) = 0
   OR coalesce((r->>'n_tabelas_com_disposicao')::int, 0) = 0
   OR coalesce((r->>'n_colunas_vivas_em_escopo')::int, 0) = 0
   OR coalesce((r->>'n_pares_com_veredito')::int, 0) = 0 THEN …
IF (r->>'n_drift')::int IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'P44-DRIFT FAIL: …'
```

### WR-04: The "READ-ONLY in PROD" invariant of both drift files is enforced by keyword grep, which misses most ways to write

**File:** `docs/compliance/__tests__/exportAllowlist.test.ts:889-891`; `p46apply.cjs:165-177`

**Issue:** Both files are run against PROD through `p46apply.cjs run`, which sends the body as-is in a read-write transaction. The only guard is `/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|GRANT|REVOKE)\b/`. It does not catch `TRUNCATE`, `MERGE`, `COPY`, `CALL`, `EXECUTE 'DEL' || 'ETE …'` inside the smoke's `DO` block, or (most realistically) `SELECT public.some_mutating_fn()`.

The 44-11 measurements already used the right mechanism (`SET TRANSACTION READ ONLY` as the first statement). The gate files themselves don't.

**Fix:** Make `SET TRANSACTION READ ONLY;` the first statement of both files. `set_config` and `DO` are allowed in read-only transactions. Then assert in (k) that the first non-comment statement is exactly that. The "tabela-sonda" bite proof (smoke header, step 2) then has to *replace* that line in the scratch copy rather than prepend to it. Document that.

### WR-05: BD-9 withholds `cognitivo_liberacao.liberado_por/revogado_por` from the titular, but RLS already serves them to the same titular

**File:** `supabase/migrations/20260826000007_liberacao_individual_do_cognitivo.sql:77-91` (cross-module; this undermines the verdict in `export-scope-rules.yaml` §`ponteiros.de_terceiro` and in `export-allowlist.json` → `cognitivo_liberacao.colunas_excluidas`)

**Issue:** The policy `"Candidato ve a propria liberacao"` (FOR SELECT, own candidatura) combined with a table-level `GRANT SELECT ON public.cognitivo_liberacao TO authenticated` lets the candidate run `GET /rest/v1/cognitivo_liberacao?select=*` and receive the RH user UUIDs in `liberado_por`/`revogado_por`. No migration narrows this to a column-level grant. The app's own reads (`useLiberacaoCognitivo.ts:43`, `ravenService.ts:89`) select only `liberado_em, revogado_em`, so nothing needs the wider grant.

The export's "PII de terceiro" exclusion therefore protects nothing. The project already has this lesson: ids readable by anon/authenticated through a side door («exposição a anon inclui views»). I did not query PROD, so confirm there.

**Fix:** In a new migration, run `REVOKE SELECT ON public.cognitivo_liberacao FROM authenticated;` then `GRANT SELECT (id, candidatura_id, liberado_em, revogado_em, motivo) ON public.cognitivo_liberacao TO authenticated;`. Check first that the RH policy path does not need the `*_por` columns through PostgREST. If it does, give RH a SECURITY DEFINER RPC instead.

### WR-06: `solicitacoes_dados.plano` is withheld wholesale on a key-names-only inspection, by a decision the operator never made, although most of its keys describe the titular's own data

**File:** `docs/compliance/export-scope-rules.yaml` (block «G5 (44-11)», `solicitacoes_dados.plano`); `docs/compliance/export-allowlist.json` → `solicitacoes_dados.colunas_excluidas.plano`

**Issue:** The verdict is labelled `autoria: ORQUESTRADOR (não perguntada ao operador)`. It rests on top-level keys only («só `jsonb_object_keys`, nunca valores»). Three of the five keys (`achados_resumo`, `contagens`, `previsto`) are the engine's inventory of *what it found and planned to delete about this titular*: in effect a map of the titular's data holdings, which is Art. 18, II material. `versao` is engine metadata, and only `executor` is plausibly third-party.

Withholding the whole column because one subkey names an executor is the "exclude the row for one bad column" pattern this phase rejected elsewhere. The operator answered BD-13 (iv) by AskUserQuestion but was not asked about (ii).

**Fix:** Ask the operator to decide (ii) explicitly. If the answer is "the titular gets the inventory", project a sanitised view in the EF (for example `plano - 'executor'`). That needs an artifact-level `transformacoes` concept, so it may stay out for now. Either way, record the operator's authorship in the verdict and mention the category in `oQueNaoEsta` (CR-01).

### WR-07: (i2) sortedness assertion rejects CORRECT generator output on real data — it passes only because the fixture has no prefix-sharing table names

**File:** `docs/compliance/__tests__/genExportAllowlist.test.ts:486` (same pattern pre-existing at `:455`)

**Issue:** `chaves = linhas.map((l) => l.replace(/[(),']/g, '|'))`, followed by `expect([...chaves].sort()).toEqual(chaves)`. The generator sorts strings that still contain `'` (0x27, which sorts before `_` and letters). The test re-sorts after mapping to `|` (0x7C, which sorts after them). Any pair of names where one is a prefix of the other flips order.

Measured on the real `--sql-values-tabelas` output: `decisao_final` / `decisao_final_historico` breaks the assertion. The real artifact also contains `redacoes_candidato` / `redacoes_candidato_em_progresso` and `perguntas` / `perguntas_cultura`. The first time the fixture gains such a pair, the gate fails a correct generator with a misleading diagnosis. This is the first failure mode in CLAUDE.md's gate table.

**Fix:** Compare the raw lines with the trailing comma stripped. That is the generator's own sort key:
```ts
const chaves = linhas.map((l) => l.trim().replace(/,$/, ''))
expect([...chaves].sort()).toEqual(chaves)
```

## Info

### IN-01: `set_config(..., false)` leaves a session-level GUC on the pooled backend

**File:** `supabase/tests/p44_export_drift_smoke.sql:84-85`
**Issue:** `is_local = false` keeps `smoke44.r` on the backend after commit. Nothing reads it today. Since the smoke runs in a single transaction, transaction scope is all it needs.
**Fix:** `set_config('smoke44.r', …, true)`.

### IN-02: Column labels are keyed by column name only — the same label carries opposite meanings, and the BD-10 "base" is rendered as a raw enum token

**File:** `src/features/privacidade/services/exportacaoService.ts:364` (`rotularColuna`)
**Issue:** `liberado_em` is rendered as «Liberado em» both under «Liberação da avaliação cognitiva» (access was *granted*) and under «Conservação dos seus dados além do prazo» (the hold *ended*). `retencao_hold.motivo` is rendered as the raw CHECK token (`obrigacao_legal`, `litigio`), and that is exactly the field BD-10 says the titular is entitled to read.
**Fix:** Allow `rotuloColuna` keys of the form `tabela.coluna`, checked before the bare column name (for example `'retencao_hold.liberado_em': 'Conservação encerrada em'`). Add a small value map for `ck_retencao_hold_motivo`.

### IN-03: The scope rules still state the exact belief G5 disproved

**File:** `docs/compliance/export-scope-rules.yaml:115-117`
**Issue:** The old paragraph that was kept says «a prova é o fecho executado pelo gerador contra o catálogo VIVO a cada geração. Uma tabela viva que não caia em nenhum dos três baldes falha a geração.» The generator's closure runs against the versioned *snapshot*, not the live DB. That is why the six G5 tables were invisible. It now sits right under the 1.4.0 note, with no correction next to it.
**Fix:** Add an inline correction («⚠ falso até o 44-10: o fecho é contra o snapshot; o universo vivo é o smoke `p44_export_drift`, BD-14»). Keep the original text, as the file's history convention requires.

### IN-04: The BD-14 reminder in `p46apply` covers only part of the apply paths and fires on nearly every migration

**File:** `p46apply.cjs:126-131`
**Issue:**
- It fires only on `migrate`. It does not fire for DDL sent through `run`/`sql`, or through the SQL Editor and MCP paths that CLAUDE.md still documents.
- The regex misses `CREATE UNLOGGED TABLE` and `SELECT … INTO`.
- It matches every `ALTER TABLE … ENABLE ROW LEVEL SECURITY` / `ADD CONSTRAINT`, which trains people to ignore it.
- It prints *before* the apply, so the output after a successful apply has no reminder.
**Fix:** Narrow the regex to column/table shape changes (`ADD|DROP|RENAME COLUMN`, `RENAME TO`, `CREATE [UNLOGGED] TABLE`, `DROP TABLE`). Print the reminder again after the `✅` line. Consider also offering to run the smoke automatically after a successful `migrate`.

### IN-05: The drift universe comes from `information_schema`, which filters by privilege

**File:** `supabase/tests/p44_export_drift_smoke.sql:625-643`; `docs/compliance/sql/05-export-allowlist-drift.sql:757-782`
**Issue:** `information_schema.tables` and `.columns` only show objects on which the current role holds some privilege. Today the role is `postgres`, the owner, so this is fine. A table owned by another role (for example `supabase_admin`) with no grant to `postgres` would be invisible, and the gate would pass silently. The opposite case (fewer visible objects) fails loud, as it should.
**Fix:** Read from `pg_class` (`relkind IN ('r','p')`, `relnamespace = 'public'::regnamespace`) and `pg_attribute` (`attnum > 0 AND NOT attisdropped`), which are not privilege-filtered.

### IN-06: (19) checks only negatives for the two new tables

**File:** `supabase/functions/exportar-meus-dados/__tests__/index.test.ts:786-795`
**Issue:** For `retencao_hold` and `cognitivo_liberacao`, (19) asserts that the vetoed columns are absent but never that `motivo`/`criado_em`/`liberado_em`/`revogado_em` are present. The positive check exists only for `solicitacoes_dados`. Today the EF builds the select from the artifact, so this matches (l). But a handler change that dropped columns for indirect tables would still pass (19).
**Fix:** Assert `tokens(tabela)` equals `EXPORT_ALLOWLIST.tabelas[tabela].colunas` for both tables.

### IN-07: The premise behind BD-11 is not watched by any gate

**File:** `docs/compliance/export-scope-rules.yaml` (`fora_do_escopo.purga_execucao_itens`)
**Issue:** BD-11 excludes a table that does carry `candidato_id`, on the premise that «para titular vivo só há linhas de ensaio». Nothing measures that. A partial purge (for example `desfecho_auth` failing) or a future non-dry-run row for a still-existing titular would quietly falsify the premise.
**Fix:** Add a smoke check (or a line in the drift smoke) that counts `purga_execucao_itens` rows whose `candidato_id` still exists in `candidatos` and whose execution was not a dry run. It should fail loud when the count is > 0.

---

_Reviewed: 2026-10-06T21:25:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
