---
phase: 44-exporta-o-acesso
reviewed: 2026-10-07T01:25:33Z
depth: standard
diff_base: 0fde284f
diff_head: 31d24652
files_reviewed: 10
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/__tests__/genExportAllowlist.test.ts
  - src/features/cadastro/components/steps/AutorizacoesStep.tsx
  - src/features/cadastro/components/steps/__tests__/AutorizacoesStep.test.tsx
  - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
  - src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts
  - src/features/privacidade/constants/canalPrivacidade.ts
  - src/features/privacidade/services/__tests__/exportacaoService.test.ts
  - src/features/privacidade/services/exportacaoService.ts
  - supabase/tests/p44_export_drift_smoke.sql
findings:
  critical: 1
  warning: 6
  info: 2
  total: 9
status: issues_found
---

# Phase 44: Code Review Report (post-CR-01 round, 44-14..44-16)

**Reviewed:** 2026-10-07T01:25:33Z
**Depth:** standard
**Files Reviewed:** 10 (diff `0fde284f..31d24652`, already published)
**Status:** issues_found

## Summary

This round claims fixes for CR-01, WR-01, WR-02, WR-03 and WR-07 from `44-REVIEW-2026-10-06-G5.md`. It also moves the privacy channel to `rh@` and makes the cadastro step read it from the constant.

**Verified:**
- All 15 affected Vitest files pass (264/264).
- The old claim («descrevem o sistema, não você») is gone from the copy.
- The generator sort key in WR-07 is now correct.
- The smoke now fails closed when a key is missing.
- The (cr1) gate **derives** families from `EXPORT_ALLOWLIST` at run time. It checks the literal clause map by set equality in both directions (`familiaSemClausula` / `clausulaOrfa`), so the map is a deliberate scope and does not freeze a snapshot.
- Layer direction (question d) is respected. `AutorizacoesStep.tsx` imports a constants leaf (`canalPrivacidade.ts` has no imports at all). `privacidade` imports nothing from `cadastro`, so there is no cycle. Component → constant is the right direction.
- `git grep` for the dead address finds it only under `.planning/` at `31d24652`.

**What breaks:**
1. **The new boundary sentence is still false for at least one withheld category, and the gate cannot see it (CR-01 below).** The gate works at the granularity of the reason *family*. A table that was mislabeled at family level ships under a clause whose wording does not fit it. `entrevista_guias` is a per-candidatura guide derived from the titular's CV, withheld as `configuracao_do_produto`. The sentence says that category «é o mesmo para todos os candidatos».
2. **The sentence's closing promise («ou pedir algum deles») offers material the business has decided not to deliver** (WR-01). That includes the BD-10 text that the operator explicitly ruled the titular has no right to, other people's PII, and secrets.
3. **The hardened drift gates still fail open, proven by execution.** The four mutations listed below leave (k), (k3) and the whole suite green (WR-04, WR-05). I extracted the real `paresDoTexto` / `problemasDoPredicado` / `problemasDaEstrutura` and ran them against the smoke with each mutation applied:
   - a `::text` cast inside a VALUES tuple;
   - a `UNION ALL SELECT` row added to the `allowlist` CTE;
   - a `RETURN;` before the drift guard;
   - a reassignment of `r` before the drift guard.

## Status of prior findings

| ID | Claimed | Verified in source? | Notes |
|---|---|---|---|
| CR-01 | fixed | **Partially.** | `exportacaoService.ts:555` now names every *family* the artifact produces, plus the channel. (cr1)–(cr3) bind the sentence to the artifact and the gate fails when a family is added or removed. But the new wording introduces a factual claim that is false for `entrevista_guias`, and family-level matching cannot detect it. See **CR-01** (new) below. Not closed. |
| WR-01 | fixed | **Yes, for the reported forms.** | `exportAllowlist.test.ts:181-183` adds a comment-stripped permissive tuple count per block, and (k) requires it to equal the canonical count. M1, M2 and M1+M2 reproduce the reviewer's 526→528 case. It still misses executed rows that are not `('x','y')` literals. See **WR-04**. |
| WR-02 | fixed | **Yes, for the reported routes.** | `problemasDoPredicado` compares `com_veredito` / `tabelas_vivas` / `vivo` and both `drift` arms against the `05` report. `problemasDaEstrutura` pins `DO $gate$`, the absence of `EXCEPTION WHEN`, both RAISEs and the bare-count aggregators. (k4) bites on 18 mutations. Control flow *inside* the block is not pinned. See **WR-05**. |
| WR-03 | fixed | **Yes.** | `p44_export_drift_smoke.sql:710-718` uses `coalesce(…,0) = 0` and `IS DISTINCT FROM 0`. (k3) forbids bare `(r->>'k')::int <op>` and requires every key read with `->>` to be built by the first `json_build_object`. M6 and M7 bite. A missing `smoke44.r` raises, because there is no `missing_ok`. |
| WR-07 | fixed | **Yes.** | `ordenadoComoOGerador` (`genExportAllowlist.test.ts:88-91`) uses `trim()` and drops the trailing comma. That is exactly the `.sort()` key of `paresPor`/`paresTabelas` (`gen-export-allowlist.cjs:636,662`). (i3) proves two things: the fixture exercises the shared prefix, and the check bites when the order is inverted. |

Not claimed and still open: WR-04 (READ ONLY by grep), WR-05 (RLS on `cognitivo_liberacao`), WR-06 (`plano` authorship) and IN-01..IN-07.

## Critical Issues

### CR-01: The new boundary sentence says withheld product configuration «é o mesmo para todos os candidatos», but `entrevista_guias` is per-candidatura and derived from the titular's CV. The family-keyed gate cannot see it

**File:** `src/features/privacidade/services/exportacaoService.ts:555` (same string in the `.html` at `:481` and the `.json` at `:730`). Gate: `src/features/privacidade/services/__tests__/exportacaoService.test.ts:740-750, 775-818`.

**Issue:**
The published sentence reads «… nem a configuração do próprio sistema, como o texto das vagas e das perguntas, **que é o mesmo para todos os candidatos**». The `configuracao_do_produto` family that this clause covers (`CLAUSULA_POR_FAMILIA`, test `:744`) includes `entrevista_guias` (`export-allowlist.json:19`). That table is:

- `candidatura_id uuid NOT NULL REFERENCES candidaturas(id)` and `guia jsonb NOT NULL`. It holds the STAR/PEI interview script that `gerar-guia-entrevista` generated *for this candidatura* (`supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql:61-71`).
- Per `pii-inventory.yaml:565,606`: «o guia é DERIVADO do currículo».

So the copy withholds per-person data derived from the titular, and the sentence tells her it is generic content that is identical for everyone. This is the same class of defect as the original CR-01: a false statement to the titular about withheld data that concerns her. It is in production now.

The (cr1) gate passes because it matches at *family* granularity. Every item labelled `configuracao_do_produto` satisfies the clause regardless of whether the clause's wording fits it. The family label in `export-scope-rules.yaml:372` comes with no rationale. The vocabulary defines it as «conteúdo do produto, não do candidato» (`:347`), and that is false for this table.

Two other items should be checked under the same lens:
- `comparativo_solicitado`, excluded as `pii_de_terceiro`. It is an AI ranking whose `candidatura_ids`/`ranking` include the titular's own position. The clause «dados que identificam outras pessoas» describes only half of it.
- `logs_auditoria`, under `telemetria_interna`. Its `dados_antes`/`dados_depois` hold snapshots of the titular's own rows, yet the sentence describes them as «registros técnicos de funcionamento do sistema».

**Fix:** Do both of these:
1. Correct the sentence through the 44-UI-SPEC. Either drop the false generalisation («que é o mesmo para todos os candidatos»), or name the guide explicitly. For example: «… nem a configuração do próprio sistema, como o texto das vagas e das perguntas; também não entra o roteiro que a equipe usa para conduzir a sua entrevista». The better option is to reclassify `entrevista_guias` and decide with the operator whether the titular receives it, because Art. 18, II covers data derived from her.
2. Make the gate see per-titular tables hidden inside a "generic" family. Any table excluded as `configuracao_do_produto` or `vocabulario_do_sistema` that has a titular link in the live catalog (a `candidatura_id`/`candidato_id` column) must fail (cr1) unless it carries an explicit per-table verdict:
```ts
const catalogo = JSON.parse(readFileSync(resolve(REPO, 'docs/compliance/catalogo-vivo-44.json'), 'utf8'))
const ligadas = new Set(catalogo.colunas.filter((c) => /^(candidatura|candidato)_id$/.test(c.coluna)).map((c) => c.tabela))
const genericasLigadas = Object.entries(EXPORT_ALLOWLIST.excluidas)
  .filter(([t, r]) => ['configuracao_do_produto', 'vocabulario_do_sistema'].includes(r) && ligadas.has(t))
  .map(([t]) => t)
expect(genericasLigadas, 'tabela "genérica" com vínculo ao titular — a cláusula «o mesmo para todos» é falsa para ela').toEqual([])
```

## Warnings

### WR-01: «ou pedir algum deles» invites requests for items the controller has decided not to deliver

**File:** `src/features/privacidade/services/exportacaoService.ts:555` (last sentence)

**Issue:** The closing sentence offers every listed item as something the titular can request: «Se quiser saber mais sobre algum desses itens, **ou pedir algum deles**, escreva para…». The list includes:
- `retencao_hold.detalhe`. BD-10 has **operator** authorship: «o titular tem direito ao fato e à base … **não ao raciocínio interno de quem retém**». The text may contain litigation strategy.
- Other people's PII (`pii_de_terceiro`: staff UUIDs, the interviewer's *name*, `redacoes_candidato.referencia_match` = other candidates' ids). This cannot be handed over without infringing third parties' rights.
- `segredo` (`configuracoes_empresa`, `webhooks_config`), which sits under «a configuração do próprio sistema».
- `decisao_final.justificativa`. It was withheld by a security correction (Phase-24 CR-01, «must not» be undone) while BD-9 is open. An e-mailed manual delivery reopens that same leak with nobody's sign-off.

Nothing documents how `rh@` should answer such a request. A sentence that invites requests the business has already decided to refuse is an over-promise in the opposite direction to the original CR-01. The operator approved the wording («publicar», 44-16 SUMMARY), but the checkpoint did not show the conflict with BD-10.

**Fix:** Limit the invitation to what can be honoured. For example: «Se quiser saber mais sobre algum desses itens, escreva para o nosso canal de privacidade: …». Alternatively, make it explicit: «… ou pedir o que for seu — dados de outras pessoas e anotações internas de conservação não são entregues». Raise this with the operator as a BD item, and record the RH handling procedure for such requests.

### WR-02: The sentence's positive claims («o motivo e as datas entram», «o andamento e as datas do pedido entram», «a decisão em si entra») are not gated

**File:** `src/features/privacidade/services/exportacaoService.ts:555`; `src/features/privacidade/services/__tests__/exportacaoService.test.ts:872-899`

**Issue:** (cr1) only checks that each withheld family has a marker substring. The three parentheticals are statements about what IS delivered. Today they match 1.4.0:
- `retencao_hold.colunas` ⊇ {`motivo`, `criado_em`, `liberado_em`};
- `solicitacoes_dados.colunas` ⊇ {`situacao`, `solicitado_em`, `atendido_em`, …};
- `decisao_final.colunas` ∋ `decisao`.

Nothing binds them, though. A later veto of `retencao_hold.motivo` with a `BD-10` reason maps to an existing family with a marker that is present, so (cr1) stays green while the sentence promises a field the copy no longer carries. This is the «copy mais generosa que a promessa» direction that the `oQueEsta` docblock already calls a defect.

**Fix:** Add a (cr4) that ties each parenthetical to columns in the artifact:
```ts
const ENTRAM: Record<string, { tabela: string; colunas: string[] }> = {
  '(o motivo e as datas entram)': { tabela: 'retencao_hold', colunas: ['motivo', 'criado_em', 'liberado_em'] },
  '(o andamento e as datas do pedido entram)': { tabela: 'solicitacoes_dados', colunas: ['situacao', 'solicitado_em', 'atendido_em'] },
  '(a decisão em si entra)': { tabela: 'decisao_final', colunas: ['decisao'] },
}
for (const [trecho, { tabela, colunas }] of Object.entries(ENTRAM)) {
  if (!frase.includes(trecho)) continue
  expect(EXPORT_ALLOWLIST.tabelas[tabela].colunas).toEqual(expect.arrayContaining(colunas))
}
```

### WR-03: The boundary sentence comes from the bundle's allowlist, but the file is stamped with the Edge Function's allowlist version — deploy skew makes it false again

**File:** `src/features/privacidade/services/exportacaoService.ts:484, 727-731` (and the `oQueNaoEsta` docblock at `:540-544`)

**Issue:** (cr1) proves that the sentence matches `EXPORT_ALLOWLIST` *as compiled into the front bundle*. The data, and `versao_allowlist` in the footer and in the `.json`, come from the **deployed EF**. The service's own docblock (`:317-322`) says the two «divergem na janela entre um regenerar e o deploy seguinte».

CLAUDE.md documents that the EF (MCP / Management API) and the front (Vercel push) ship through independent channels. Suppose a future 1.5.0 veto is deployed to the EF before the Vercel push lands. In that window every copy says «Versão da lista … 1.5.0» and carries the 1.4.0 boundary. The docblock's claim «Um veto novo … não sobe sem esta frase mudar» holds for the repository only, not for what is served.

**Fix:** Fail closed on mismatch. In `gerarHtmlExport`/`gerarJsonExport`, or before calling them, compare `resposta.versao_allowlist` with `EXPORT_ALLOWLIST.meta.versao`. If they differ, use a neutral boundary («Esta cópia foi gerada com uma versão da lista de dados diferente da desta página; escreva para … para saber o que não está nela») or refuse with a retry message. Add a test with `versao_allowlist: '9.9.9'`.

### WR-04: (k) still cannot see executed rows that are not `('x','y')` literals — two routes proven to leave every local gate green

**File:** `docs/compliance/__tests__/exportAllowlist.test.ts:177-183`

**Issue:** The permissive count only recognises `\(\s*'[^']*'\s*,\s*'[^']*'\s*\)`. I ran the real `paresDoTexto` (plus `problemasDoPredicado` and `problemasDaEstrutura`) on in-memory mutations of `p44_export_drift_smoke.sql`:
- `    ('candidatos'::text,'coluna_nova_vazando'),` added to `allowlist` VALUES: canonical is unchanged, the permissive count is unchanged, and (k) and (k3) are green.
- `  UNION ALL SELECT 'candidatos','coluna_nova_vazando'` appended inside the `allowlist` CTE body: same result, all green.

Both forms are valid SQL. Each adds a pair that hides a new live column from the PROD drift report. The WR-01 fix proves «tuplas no formato `('x','y')` == extraídas», but not «linhas que o SQL produz == extraídas», and the latter is what the comment at `:1221-1229` claims. CLAUDE.md calls this exact situation a scan that does not see the idiom of the file it watches.

**Fix:** Stop counting and pin the whole CTE body. For each of the three blocks, compare the comment-stripped, whitespace-collapsed body of `allowlist(tabela, coluna) AS (` / `excluidas(...)` / `disposicao_tabelas(...)` (the `corpoDaCte` helper already exists) with `colapsar('VALUES ' + <generator output>)`. Anything except the generator's exact output then fails, whatever form it takes. Add M19 (cast) and M20 (`UNION ALL SELECT`) to (k4).

### WR-05: (k3) does not pin control flow inside `DO $gate$` — `RETURN;`, an `IF false THEN` wrapper, or reassigning `r` silence the drift guard with every gate green (proven)

**File:** `docs/compliance/__tests__/exportAllowlist.test.ts:408-510` (`problemasDaEstrutura`), `:483`

**Issue:** The drift guard is matched as a contiguous substring anywhere in the block. Nothing requires that the guard is reachable, or that `r` reaches it unmodified. Running the real `problemasDaEstrutura` and `problemasDoPredicado` on the smoke with each of these mutations returns `[]`:
- `  RETURN;` inserted before `IF (r->>'n_drift')…` (early exit; the file reaches `'pass', true`);
- `IF false THEN IF (r->>'n_drift')::int IS DISTINCT FROM 0 THEN … END IF; END IF;`;
- `  r := r || '{"n_drift":0}'::jsonb;` before the guard.

There is a smaller hole as well. The population guard checks that each `OR` term is well-formed, but not *which* keys it covers. Dropping `OR coalesce((r->>'n_colunas_vivas_em_escopo')::int, 0) = 0` is not detected.

The block is short and its whole purpose is fixed, so pinning its exact text is a deliberate scope, not a snapshot.

**Fix:** Pin the block exactly. Compare `colapsar(semComentarioSql(<DO $gate$ … $gate$; body>))`, with only the message strings normalised, to a canonical template held in the test. Alternatively, keep the structural check and add these rules:
- exactly two `IF` statements;
- no `RETURN`, no `:=` after `DECLARE`, no nested `IF`;
- the population guard's key set equals `{n_tabelas_vivas, n_tabelas_com_disposicao, n_colunas_vivas_em_escopo, n_pares_com_veredito}`. Derive that set from the `json_build_object` keys whose aggregator is not `drift` or `linhas`.

Add the three mutations to (k4).

### WR-06: cp3/cp4 scan only `src/**/*.ts(x)`, which is narrower than the "one channel in the whole system" claim; cp4 also matches by substring

**File:** `src/features/privacidade/constants/__tests__/canalPrivacidade.test.ts:40-56, 74-91`

**Issue:**
- **False negatives (scope).** The suite asserts «o endereço morto não está em arquivo nenhum» and «fonte única», and the constant's docblock says «no sistema inteiro». The scan never reads:
  - `supabase/functions/**`, including `_shared/consent-text.json`, which is **imported into the front bundle** by `AutorizacoesStep.tsx:51` and therefore ships to the browser;
  - `index.html` and `public/`;
  - `.json` files under `src`;
  - DB-held copy (`templates_email`, an admin-editable table).

  Today `git grep` finds the dead address only under `.planning/`, so nothing slips through *now*. A reintroduction in any of those places would leave cp3 and cp4 green.
- **False positive (substring).** `quemContem` uses `includes('rh@beautysmile.com.br')`. Any production string such as `novo.rh@beautysmile.com.br` (that exact form already exists in `gerenciar-usuario-rh` tests) or `vagas.rh@…` fails cp4. So would any *non-privacy* use of the RH inbox, such as a careers contact or a login placeholder. The diagnosis would be false («importe CANAL_PRIVACIDADE_EMAIL»), because `rh@` is now both the privacy channel and the general RH inbox.

**Fix:** Widen the walk to `src` plus `supabase/functions` plus `index.html` and `public`, with extensions `ts|tsx|json|html`, still excluding tests. Keep cp4 limited to front production files. Match on a boundary: `new RegExp('(^|[^a-z0-9._%+-])' + escape(CANAL_PRIVACIDADE_EMAIL))`. For cp3, add a one-time PROD check of `templates_email` for the dead address and record it in the SUMMARY.

## Info

### IN-01: (cr3) controls 2 and 4 are coupled to two decisions that are still open (BD-13 (ii), BD-9)

**File:** `src/features/privacidade/services/__tests__/exportacaoService.test.ts:946, 958-962`

**Issue:** Control 2 removes `CLAUSULA_POR_FAMILIA['BD-13 (ii)']`. Control 4 deletes `decisao_final(.historico).justificativa`. Both families are expected to change:
- WR-06 of the G5 review asks the operator to decide (ii);
- BD-9 is explicitly «EM ABERTO».

When either decision lands and the sentence is correctly updated, (cr3) fails: control 2 runs `frase.replace(undefined, '')` and the sentence does not change; control 4 reports «a mutação não mudou o artefato». The controls stay accurate, but they fail correct work.

**Fix:** Pick the targets from the derived data, not by name. For control 2, use any family in `l.familias` that has a marker. For control 4, delete every item of one family that `l.itens` reports.

### IN-02: Dead-address and channel history now live in a docblock that states the old local part

**File:** `src/features/privacidade/constants/canalPrivacidade.ts:28-30`

**Issue:** The note says «parte local `lgpd`, mesmo domínio», which makes the dead address reconstructible. This is harmless for cp3, which searches for the full address, but it means a careless "restore" can be made from this file.

**Fix:** None required. If wanted, point to `DECISAO-ENCARREGADO.md` instead of describing the address.

---

_Reviewed: 2026-10-07T01:25:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
