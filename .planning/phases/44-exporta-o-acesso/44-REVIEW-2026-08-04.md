---
phase: 44-exporta-o-acesso
reviewed: 2026-08-04T00:00:00Z
depth: standard
files_reviewed: 44
files_reviewed_list:
  - supabase/functions/exportar-meus-dados/index.ts
  - supabase/functions/exportar-meus-dados/__tests__/index.test.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/migrations/20260804000001_p44_config_sla_dados.sql
  - supabase/migrations/20260804000002_p44_solicitacoes_dados.sql
  - supabase/tests/p44_pedidos_dados_smoke.sql
  - src/features/privacidade/services/exportacaoService.ts
  - src/features/privacidade/services/__tests__/exportacaoService.test.ts
  - src/features/privacidade/hooks/useExportarMeusDados.ts
  - src/features/privacidade/hooks/useMeusCurriculos.ts
  - src/features/privacidade/hooks/usePrivacidade.ts
  - src/features/privacidade/hooks/useUltimoPedidoDados.ts
  - src/features/privacidade/components/PedirCopiaBloco.tsx
  - src/features/privacidade/components/CurriculosBloco.tsx
  - src/features/privacidade/components/PrivacidadeCandidatoPage.tsx
  - src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx
  - src/features/privacidade/components/__tests__/CurriculosBloco.test.tsx
  - src/features/privacidade/components/__tests__/PrivacidadeCandidatoPage.test.tsx
  - src/features/pedidos-dados/services/pedidosDadosService.ts
  - src/features/pedidos-dados/services/__tests__/pedidosDadosService.test.ts
  - src/features/pedidos-dados/constants/slaDados.ts
  - src/features/pedidos-dados/constants/__tests__/slaDados.test.ts
  - src/features/pedidos-dados/hooks/useFilaPedidosDados.ts
  - src/features/pedidos-dados/hooks/useConfigSlaDados.ts
  - src/features/pedidos-dados/hooks/usePedidosDadosPendentesCount.ts
  - src/features/pedidos-dados/hooks/__tests__/useFilaPedidosDados.test.ts
  - src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx
  - src/features/pedidos-dados/components/PedidosDadosRHPage.tsx
  - src/features/pedidos-dados/components/SituacaoPedidoBadge.tsx
  - src/features/pedidos-dados/components/__tests__/FilaPedidosDadosTable.test.tsx
  - src/features/pedidos-dados/components/__tests__/PedidosDadosRHPage.test.tsx
  - src/features/pedidos-dados/components/__tests__/SituacaoPedidoBadge.test.tsx
  - src/features/revisao/components/RevisaoSlaBadge.tsx
  - src/components/RHSidebar.tsx
  - src/components/__tests__/RHSidebarPedidosDados.test.tsx
  - src/router/routes.tsx
  - docs/compliance/sql/gen-export-allowlist.cjs
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/__tests__/genExportAllowlist.test.ts
  - vite.config.ts
  - .husky/pre-commit
  - .github/workflows/ci.yml
findings:
  critical: 2
  warning: 13
  info: 0
  total: 15
status: issues_found
---

# Phase 44: Code Review Report

**Reviewed:** 2026-08-04
**Depth:** standard
**Files Reviewed:** 44
**Status:** issues_found

## Summary

The core authorization spine of this phase holds up under adversarial reading. `authenticate → authorize → cooldown → register → project` runs in that order; the request body is genuinely never read; the projection is driven entirely by the generated artifact with no wildcard anywhere; the RPC role guards use `IS DISTINCT FROM` and are correct; `service_role` never touches the CV path. The negative assertions in the Deno and Vitest suites are real (they carry meta-probes proving they can find what they search for), which is rare and worth saying.

The defects are concentrated **downstream of authorization — in what the delivered artifact actually says**, which is exactly where an export-rights phase can fail without anyone noticing, because nobody diffs a `.html` file against a database.

Two BLOCKERs:

1. The "no infrastructure identifier / no link in the two delivered files" invariant is enforced by a **hand-written one-element set** (`curriculo_url`) sitting under an allowlist that grows by code generation. Three sibling URL columns — `entrevistas_online.gravacao_url`, `entrevistas_online.link_videochamada`, `candidatos.avatar_url` — are already in the allowlist today and ride into both files unfiltered. The service docblock explicitly reasons that hand-maintained safe-lists rot next to a generated allowlist, and then builds one anyway.
2. Every **date-only** column in the copy (`candidatos.data_nascimento`, `disponibilidade.data_disponibilidade`) is rendered **one day early with a spurious time** in the `.html`, because `PADRAO_ISO` matches bare `aaaa-mm-dd` and `new Date('1990-05-12')` parses as UTC midnight, then formats in local time. Measured: `1990-05-12` → `11/05/1990 às 21:00`. The legally-mandated copy misstates the titular's date of birth.

The warnings cluster around fail-open/fail-silent edges in the Edge Function (a TOCTOU race on the cooldown, an unparseable-timestamp branch that skips the cooldown, two unchecked `UPDATE`s), one hardcoded structural assumption that contradicts the module's own stated principle (the bridge key is inferred as `id`, not read from the artifact), and one process gap: the `--check` gate that four separate docblocks describe as authoritative is not wired into `package.json`, `.husky/pre-commit`, or `ci.yml` and runs only when a human remembers.

## Critical Issues

### CR-01: The "no link, no infrastructure identifier" invariant is enforced by a one-element hardcoded set, and three URL columns already bypass it

**File:** `src/features/privacidade/services/exportacaoService.ts:234`
**Also:** `supabase/functions/_shared/exportAllowlist.ts:306,640,642` · `src/features/privacidade/services/__tests__/exportacaoService.test.ts:383`

**Issue:**
`COLUNAS_FORA_DO_ARQUIVO_LEGIVEL` contains exactly one column and its docblock asserts that as the complete answer ("a lista tem UM item"), justified as: `curriculo_url` is "o CAMINHO do arquivo no Storage: um identificador interno de infraestrutura, que não diz nada ao titular e é a semente do link assinado".

That exact justification applies verbatim to three columns already in the generated allowlist:

- `entrevistas_online.gravacao_url` (`exportAllowlist.ts:640`) — `pii-inventory.yaml:246` annotates it literally as `"⚠ Ponteiro de Storage — ERASE-04"`. Same class of object as `curriculo_url`. Column type is unconstrained `text`; nothing in the schema prevents it from holding a full Supabase `/object/sign/...?token=...` URL, which would put a live signed URL into a file the person keeps on their device and may forward.
- `entrevistas_online.link_videochamada` (`exportAllowlist.ts:642`) — a meeting URL.
- `candidatos.avatar_url` (`exportAllowlist.ts:306`) — `pii-inventory.yaml:108`: `"⚠ Aponta para Storage"`.

None are filtered. All three land in the `.json` **and** in the `.html`, where they are rendered as visible `<dd>` values.

The self-contradiction is what makes this a blocker rather than a taste question. The module's own `escapeHtml` docblock (lines 62-72) argues, correctly, that "uma lista de 'campos seguros' é exatamente o tipo de coisa que envelhece mal: a allowlist do export cresce por geração automática (44-01/44-03), e a coluna nova entraria sem ninguém revisitar a lista." That reasoning was applied to escaping and then not applied 160 lines later to the exclusion set, which is the same shape of problem with a worse blast radius.

Test `(p)` (`exportacaoService.test.ts:383`) probes only for `token=`, `/object/sign/`, `data:application/pdf;base64,` and the literal `curriculo_url` fixture value. It has no fixture for `gravacao_url`, so the gap is invisible to the suite. The EF-side probe (`index.test.ts:507`) has the same shape and the same blind spot.

**Fix:** Derive the exclusion from a *property* of the column, not from a hand-kept name list, and pin it with a test that enumerates the generated allowlist instead of one fixture.

```ts
// exportacaoService.ts — replace the one-element Set
/**
 * Colunas que ficam fora do arquivo LEGÍVEL: todo ponteiro de infraestrutura.
 * DERIVADO por sufixo, não enumerado à mão — a allowlist cresce por geração
 * (44-01/44-03) e um Set literal envelhece contra ela (mesmo argumento do
 * docblock de `escapeHtml`). O `.json` continua carregando o caminho cru.
 */
const SUFIXOS_PONTEIRO_INFRA = ['_url', '_link']
const COLUNAS_FORA_DO_ARQUIVO_LEGIVEL = new Set(['curriculo_url', 'link_videochamada'])

function forasDoArquivoLegivel(coluna: string): boolean {
  if (COLUNAS_FORA_DO_ARQUIVO_LEGIVEL.has(coluna)) return true
  return SUFIXOS_PONTEIRO_INFRA.some((s) => coluna.endsWith(s))
}
// ...
.filter(([coluna]) => !forasDoArquivoLegivel(coluna))
```

```ts
// exportacaoService.test.ts — a probe that cannot rot behind the generator
import { EXPORT_ALLOWLIST } from '../../../../../supabase/functions/_shared/exportAllowlist'

it('(p2) NENHUMA coluna de ponteiro de infra da allowlist entra no arquivo legível', () => {
  const suspeitas = Object.entries(EXPORT_ALLOWLIST.tabelas).flatMap(([t, d]) =>
    (d as { colunas: readonly string[] }).colunas
      .filter((c) => c.endsWith('_url') || c.endsWith('_link'))
      .map((c) => [t, c] as const),
  )
  expect(suspeitas.length, 'a sonda não achou coluna nenhuma — é no-op').toBeGreaterThan(0)
  for (const [tabela, coluna] of suspeitas) {
    const marca = `MARCA-${tabela}-${coluna}`
    const html = gerarHtmlExport(resposta({ payload: { [tabela]: [{ [coluna]: marca }] } }))
    expect(html, `${tabela}.${coluna} vazou para o arquivo legível`).not.toContain(marca)
  }
})
```

If the operator decides `gravacao_url` must stay in the human-readable file, that is a decision to record in `export-scope-rules.yaml` with a named `razao` — not an omission that survives because the filter was a literal.

---

### CR-02: Date-only columns are rendered one day early, with a fabricated time, in the delivered `.html`

**File:** `src/features/privacidade/services/exportacaoService.ts:89, 99-114, 280-282`

**Issue:**
`PADRAO_ISO` (line 89) deliberately matches a bare date: `/^\d{4}-\d{2}-\d{2}(T...)?$/`. `renderizarValor` (line 280) therefore routes any date-only PostgREST value through `formatarDataHoraPtBr`, which does `new Date(iso)` (line 101).

Per ECMA-262, a date-only ISO string is parsed as **UTC midnight**; `toLocaleDateString`/`toLocaleTimeString` then format in the **local** zone. For any negative UTC offset — which is every Brazilian zone, i.e. the entire user base — the rendered day is the *previous* day, plus a time component that does not exist in the source data.

Measured under `TZ=America/Sao_Paulo`:

```
input:    1990-05-12          (candidatos.data_nascimento, type `date`)
rendered: 11/05/1990 às 21:00
```

Affected columns already in the allowlist:

- `candidatos.data_nascimento` (`exportAllowlist.ts:319`)
- `disponibilidade.data_disponibilidade` (`exportAllowlist.ts:568`)

This is a correctness defect in the artifact that satisfies Art. 18, II. The copy the person downloads asserts the wrong date of birth and invents a 21:00 timestamp on a column that has no time. It is silent — the `.json` is correct, so a reader comparing the two would see them disagree with no explanation.

Test `(n)` (`exportacaoService.test.ts:358`) only regex-matches the *shape* `\d{2}\/\d{2}\/\d{4}`, so it passes on a wrong day. No test feeds a date-only value.

**Fix:** Separate the two cases — a date has no clock, and must not be pushed through a `Date` at all.

```ts
/** Só a data — sem componente de hora, e por isso sem conversão de fuso. */
const PADRAO_DATA_PURA = /^\d{4}-\d{2}-\d{2}$/
const PADRAO_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/

/**
 * `aaaa-mm-dd` → `dd/mm/aaaa`, por FATIA de string.
 * ⚠ Nunca por `new Date`: uma data pura é parseada como meia-noite UTC e
 * formatada em hora local, e em todo fuso negativo (todo o Brasil) isso
 * entrega o DIA ANTERIOR mais uma hora inventada na cópia do titular.
 */
export function formatarDataPtBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function renderizarValor(valor: unknown): string {
  if (typeof valor === 'boolean') return escapeHtml(valor ? 'Sim' : 'Não')
  if (typeof valor === 'string' && PADRAO_DATA_PURA.test(valor)) {
    return escapeHtml(formatarDataPtBr(valor))
  }
  if (typeof valor === 'string' && PADRAO_ISO.test(valor)) {
    return escapeHtml(formatarDataHoraPtBr(valor))
  }
  // ...
}
```

Pin it with a timezone-explicit test (`vi.stubEnv('TZ', 'America/Sao_Paulo')` or `process.env.TZ` in the suite setup) asserting `1990-05-12 → 12/05/1990` and that the output carries no `às`.

## Warnings

### WR-01: The 24 h cooldown is a read-then-write race with nothing serializing it

**File:** `supabase/functions/exportar-meus-dados/index.ts:194-228`
**Issue:** Step 3 `SELECT`s the last `solicitacoes_dados` row and step 4 `INSERT`s a new one, with no transaction, no unique constraint, and no conditional insert between them. Two POSTs issued concurrently with the same JWT both observe "no recent request" and both proceed to a full projection of every table in the allowlist. There is no unique index on `(candidato_id, tipo)` and no partial index over a time window in `20260804000002_p44_solicitacoes_dados.sql` — the only index is `idx_solicitacoes_dados_cooldown`, which is for reads.

The module docblock states the purpose plainly: without the cap "o endpoint de export é um amplificador de exfiltração". A control that can be defeated by issuing N requests in the same second is not a cap. The blast radius is bounded (the caller only ever gets their own data), which is why this is a WARNING and not a BLOCKER — but the rate limit is the *only* thing bounding how often the full PII set of an account leaves the database, and an attacker holding a stolen JWT is precisely the actor who would parallelize.

**Fix:** Make the register step itself enforce the window, so the database decides:

```sql
-- migration nova
CREATE UNIQUE INDEX uq_solicitacoes_dados_cooldown_24h
  ON public.solicitacoes_dados (candidato_id, tipo, (date_trunc('day', solicitado_em)));
```

or, without changing the schema, make the INSERT conditional and treat zero affected rows as the cooldown branch:

```ts
const { data: pedido, error: insErr } = await supabaseAdmin.rpc('registrar_pedido_dados', {
  p_candidato_id: candidatoId,
  p_janela_horas: 24,
})   // SECURITY DEFINER: INSERT ... SELECT WHERE NOT EXISTS (... solicitado_em > now() - interval)
if (!pedido?.id) return jsonResponse({ ok: false, error_code: 'COOLDOWN', liberado_em }, 429)
```

Keep the step-3 read for the `liberado_em` copy; it just stops being the authority.

---

### WR-02: The cooldown fails OPEN when `solicitado_em` is unparseable

**File:** `supabase/functions/exportar-meus-dados/index.ts:207`
**Issue:**
```ts
if (Number.isFinite(solicitadoEm) && Date.now() - solicitadoEm < JANELA_COOLDOWN_MS) { ... 429 }
```
If `new Date(ultimo.solicitado_em)` yields `NaN`, the guard is skipped and the request proceeds. A security control whose unreadable-input branch is "allow" is the same shape as the `NOT IN` / NULL defect this phase's own migration comment (`20260804000002:242-247`) calls out as "REAL, medido na 42-06". The direction is wrong even though the column is `timestamptz NOT NULL` and today always serializes cleanly.

**Fix:**
```ts
if (ultimo?.solicitado_em) {
  const solicitadoEm = new Date(ultimo.solicitado_em).getTime()
  // FECHA no ilegível: um marco que não sabemos ler não é um marco expirado.
  if (!Number.isFinite(solicitadoEm)) {
    return errorResponse('SERVER_ERROR', 'Falha ao verificar pedidos anteriores.', 500)
  }
  if (Date.now() - solicitadoEm < JANELA_COOLDOWN_MS) { /* 429 */ }
}
```

---

### WR-03: Both `UPDATE`s on `solicitacoes_dados` discard their error

**File:** `supabase/functions/exportar-meus-dados/index.ts:284-287, 306-309`
**Issue:** Neither the success mark nor the failure mark checks `error`:

- If the step-6 `UPDATE` fails, the titular receives a `200` and both files, while the row stays `pendente` with `causa = NULL`. The RH queue then renders `traduzirCausa(null)` → `"Motivo não registrado."` plus `"Atender pelo Encarregado de Dados e responder ao titular."` for a request that was in fact fulfilled — the operator is dispatched to chase work that does not exist, against a 15-day clock.
- If the catch-block `UPDATE` fails, the failure cause is lost entirely and the row is indistinguishable from the previous case.

Neither path logs anything, so the divergence is unobservable from either side.

**Fix:**
```ts
const { error: marcaErr } = await supabaseAdmin
  .from('solicitacoes_dados')
  .update({ situacao: 'atendido', atendido_em: new Date().toISOString() })
  .eq('id', pedidoId)
if (marcaErr) {
  // A cópia FOI entregue; só o carimbo falhou. Não vira 500 — vira sinal.
  console.error('[exportar-meus-dados] marca falhou', { pedido_id: pedidoId })
}
```
Same treatment in the `catch`. Keep the redacted shape (`pedido_id` only).

---

### WR-04: The delivered copy always tells the titular their own request was not fulfilled

**File:** `supabase/functions/exportar-meus-dados/index.ts:245-281` vs `283-287`
**Issue:** `solicitacoes_dados` is projected in step 5, which runs **before** the step-6 `UPDATE`. The row for the request currently being served is therefore always read as `situacao: 'pendente'`, `atendido_em: null`.

The `.html` renders that block under the label `"Seus pedidos de cópia dos dados"` (`exportacaoService.ts:146`), so the file the person just successfully downloaded contains a record stating that the very request which produced it is unfulfilled. In a compliance artifact whose entire premise is honesty about what the company holds, this is a self-falsifying line.

**Fix:** Patch the current row in the payload just before responding — the value is already known and does not require a re-read:

```ts
const atendidoEm = new Date().toISOString()
await supabaseAdmin.from('solicitacoes_dados')
  .update({ situacao: 'atendido', atendido_em: atendidoEm }).eq('id', pedidoId)

// O bloco foi lido ANTES da marca; sem isto a cópia afirma que o próprio
// pedido que a gerou ficou sem atendimento.
payload.solicitacoes_dados = (payload.solicitacoes_dados ?? []).map((l) =>
  (l as { id?: string }).id === pedidoId
    ? { ...(l as object), situacao: 'atendido', atendido_em: atendidoEm }
    : l,
)
```

---

### WR-05: The bridge join key is inferred as `id` in code — the one thing the module says it must never do — and its failure is silent

**File:** `supabase/functions/exportar-meus-dados/index.ts:266-274`
**Issue:** `chaveDoTitular` correctly reads the titular key from the artifact and throws for anything undeclared. The bridge side does not: line 267 hardcodes `(linha as { id?: unknown }).id`. `ligacao: "via:candidaturas"` names *which* table, never which column of it joins.

This directly contradicts the docblock two functions above (lines 120-129): "A coluna pela qual uma tabela se liga ao titular — **DADO do artefato, nunca inferência do código**. Inferir por nome ... é exatamente como uma tabela nova entra lendo a linha errada."

The failure mode is worse than the contradiction. If `candidaturas.id` ever leaves the projection, or a future bridge table has a differently-named primary key, `ids` is `[]` and line 272 assigns `payload[tabela] = []` — the same value produced when the person genuinely has no candidaturas. **All 18 indirectly-linked tables would silently come back empty and the export would present itself as complete.** No error, no log, no test failure (the empty case is a legitimate branch). Today only the inline snapshot in `exportAllowlist.test.ts:169` incidentally pins `candidaturas.id`; nothing states it as an invariant.

**Fix:** Declare the bridge column in `export-scope-rules.yaml` (`ligacao: "via:candidaturas.id"`) and read it; and at minimum, distinguish "bridge had rows but yielded no ids" from "bridge was empty":

```ts
const ids = linhasDaPonte
  .map((linha) => (linha as Record<string, unknown>)[colunaDaPonte(def)])
  .filter((id): id is string => typeof id === 'string')

// FALHA FECHADA: ponte com linhas e sem ids é defeito estrutural, nunca
// "o titular não tem candidatura". Os dois produziriam o MESMO [] silencioso.
if (linhasDaPonte.length > 0 && ids.length === 0) {
  throw new Error(`ponte ${ponte} não produziu ids para ${tabela}`)
}
if (ids.length === 0) { payload[tabela] = []; continue }
```

---

### WR-06: `nomesArquivosExport` reads the clock twice on the fallback path — the exact divergence it exists to prevent

**File:** `src/features/privacidade/services/exportacaoService.ts:590-621`
**Issue:** The docblock at 602-611 states the function exists so the two filenames "saem do MESMO instante ... Duas derivações independentes divergiriam na virada de dia em UTC — e o titular procuraria na pasta de downloads um nome que ninguém escreveu."

But when `resposta.gerado_em` is unparseable, `nomeArquivoExport` falls back to `new Date()` **inside** itself (line 593), and it is called twice (lines 618-619). Those are two independent clock reads. Across a UTC midnight boundary the `.json` and `.html` get different dates — and `PedirCopiaBloco` (line 179) renders `sucessoCorpo(nomes.html, nomes.json)` from a *third* invocation, so the success text can name files that were never written.

**Fix:** Resolve the instant once, in the caller:

```ts
export function nomesArquivosExport(resposta: RespostaExport) {
  const bruto = new Date(resposta.gerado_em)
  // UM instante para os dois nomes — inclusive no fallback.
  const quando = Number.isNaN(bruto.getTime()) ? new Date() : bruto
  return { json: nomeArquivoExport('json', quando), html: nomeArquivoExport('html', quando) }
}
```

---

### WR-07: The service layer imports from the component layer

**File:** `src/features/privacidade/services/exportacaoService.ts:50`
**Issue:** `import { ENCARREGADO_EMAIL } from '../components/AutorizacoesLista'` inverts the dependency direction of the project's own layering (`CLAUDE.md` §File Structure / §Key Conventions). It drags a React component module — and transitively React, `lucide-react`, and the glass primitives — into the module graph of a service whose docblock advertises `gerarJsonExport`/`gerarHtmlExport` as pure, DOM-free functions. It also blocks any future reuse of these generators outside a browser context.

**Fix:** Move the constant to a layer both can depend on, e.g. `src/features/privacidade/constants/encarregado.ts`, and re-export it from `AutorizacoesLista` for the existing consumers so no call site changes.

---

### WR-08: The `--check` gate that four docblocks treat as authoritative is not wired to anything

**File:** `docs/compliance/sql/gen-export-allowlist.cjs:544` · `package.json` (scripts) · `.husky/pre-commit` · `.github/workflows/ci.yml`
**Issue:** `supabase/functions/_shared/exportAllowlist.ts:6-9` states "`--check` reprova qualquer divergência"; the generator docblock, `05-export-allowlist-drift.sql`, and the plan summaries all lean on it. Grep of `package.json` scripts, `.husky/pre-commit`, and `.github/workflows/ci.yml` shows **zero** invocations. It runs only when a human types it.

What *is* automated covers artifact↔artifact (`exportAllowlist.test.ts (h)`) and artifact↔smoke `VALUES` (`(k)`), plus inline snapshots freezing the artifact content. What is **not** covered is the direction that matters: a change to `export-scope-rules.yaml`, `pii-inventory.yaml`, or `catalogo-vivo-44.json` without regenerating passes the whole suite green. Given that flipping one `decisoes_por_coluna.*.export` from `false` to `true` is described in `exportAllowlist.ts:500` as a one-word operator action, the sources are expected to be edited.

**Fix:**
```json
"check:export-allowlist": "node docs/compliance/sql/gen-export-allowlist.cjs --check"
```
and add it as a blocking CI step next to `npm run test:run` in `.github/workflows/ci.yml`. It exits 0/1 already and needs no database.

---

### WR-09: No closure over `decisoes_por_coluna` / `colunas_nunca` keys — a stale exclusion silently stops excluding

**File:** `docs/compliance/sql/gen-export-allowlist.cjs:283, 296-310`
**Issue:** The generator enforces a closure in one direction only. Every column named in the R2 pattern must appear in `ponteiros` (lines 198-213), and every live column must be resolved by *some* source (line 350). But nothing checks the reverse: that every key in `decisoes_por_coluna` and every entry in `colunas_nunca` still corresponds to a live column of a table in scope.

The consequence is not cosmetic. `decisoes_por_coluna` is consulted at line 301 as `esc.decisoes_por_coluna['tabela.coluna']`. If a column is renamed by a migration, the old key becomes dead and the *new* name falls through to steps 5-7 — where `R3` (line 339) admits **any** `boolean | integer | numeric | date | timestamp | USER-DEFINED` column unconditionally. A column deliberately excluded as `telemetria_interna` would silently re-enter the export under its new name with provenance `"R3"`, and the only signal would be a changed inline snapshot in a 700-line test file.

This is the same class of rot that `05-export-allowlist-drift.sql:67-71` already names ("veredito ÓRFÃO"), but that query is manual and read-only against PROD; the generator can catch it for free.

**Fix:** Add a closure pass before `if (erros.length) morrer(...)`:

```js
// Fecho INVERSO: veredito que não aponta mais para coluna viva de tabela em
// escopo é veredito ÓRFÃO, e uma exclusão órfã DEIXA DE EXCLUIR em silêncio —
// a coluna renomeada cai em R3 e volta para a cópia com proveniência "R3".
const emEscopoSet = new Set(emEscopo);
for (const chave of Object.keys(esc.decisoes_por_coluna)) {
  const [tabela, coluna] = chave.split('.');
  if (!emEscopoSet.has(tabela)) continue;               // tabela fora: já coberto
  if (!vivo.get(tabela)?.has(coluna)) {
    erros.push(`VEREDITO ÓRFÃO: \`${chave}\` tem decisão em ${REL(ESCOPO)} e não existe no catálogo vivo.`);
  }
}
```

---

### WR-10: "Todos os não atendidos aparecem" is false above 200 unattended requests

**File:** `supabase/migrations/20260804000002_p44_solicitacoes_dados.sql:291` · `src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx:115, 314`
**Issue:** The composite `ORDER BY` guarantees unattended rows sort first, and the migration comment plus the table docblock both declare that this is what makes `avisoCorte` truthful. It does — but only while `count(pendentes) < 200`. `LIMIT 200` is applied after ordering, so with 200+ unattended requests the notice claims completeness for a list that is silently truncated, and `contar_pedidos_dados_pendentes` (which has no cap, by design) would report a number larger than the rows on screen. That is the exact BD-8 failure the two functions were written together to prevent, reached through the cap rather than through a divergent predicate.

Unlikely at current volume, but the entire supervision design rests on this sentence being true.

**Fix:** Make the notice conditional on the fact rather than on the row count:

```tsx
const naoAtendidosNaTela = linhas.filter((l) => l.situacao !== 'atendido').length
const truncouNaoAtendidos = linhas.length >= CAP_LEITURA && naoAtendidosNaTela >= CAP_LEITURA
{linhas.length >= CAP_LEITURA && (
  <p className="text-sm text-white/60">
    {truncouNaoAtendidos ? FILA_COPY.avisoCorteTotal : FILA_COPY.avisoCorte}
  </p>
)}
```
with `avisoCorteTotal` saying that even unattended requests were cut. Alternatively raise the cap and keep one sentence.

---

### WR-11: An unknown `situacao` token paints the row amber but renders a neutral badge

**File:** `src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx:247` vs `src/features/pedidos-dados/components/SituacaoPedidoBadge.tsx:74`
**Issue:** The table computes `naoAtendido = linha.situacao !== 'atendido'` and documents the choice explicitly — an unknown token must be treated as needing attention. The badge computes `naoAtendido = token === 'pendente'` and renders anything else with `NEUTRO_CLASSES`.

For a token outside the vocabulary the row is amber, carries the SLA badge and the `proximoPasso` line, while the badge next to it is styled as the happy path. The Invariante 6 requirement is that colour is never the only channel; here the two channels actively disagree, which is worse than colour alone.

**Fix:** Give the badge the same predicate the table uses:
```ts
// Mesmo eixo do realce da linha: tudo o que não é o caminho feliz FECHADO
// pede alguém — inclusive um token que o servidor venha a introduzir.
const naoAtendido = token !== 'atendido'
```

---

### WR-12: A non-null but unparseable `atendido_em` renders "Atendido no mesmo dia"

**File:** `src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx:160-165, 248-251`
**Issue:** `rotularAtendimento`'s docblock states that "atendido sem timestamp legível" must resolve to the travessão, because "'não há valor' é um fato diferente de 'atendido em algum prazo'". The code only reaches that branch for `null`: line 249 checks `linha.atendido_em` truthiness, so a garbage non-empty string passes, `diasEmEspera` clamps its `NaN` to `0` (`slaRevisao.ts`), and `dias <= 0` renders `"Atendido no mesmo dia"` — an affirmative claim about a timestamp nobody could read.

**Fix:** Test legibility, not truthiness:
```ts
const carimbo = linha.atendido_em ? new Date(linha.atendido_em) : null
const carimboLegivel = carimbo && !Number.isNaN(carimbo.getTime()) ? carimbo : null
const diasAtendimento =
  !naoAtendido && carimboLegivel ? diasEmEspera(linha.solicitado_em, carimboLegivel) : null
```

---

### WR-13: `Access-Control-Allow-Origin: *` on the PII export endpoint

**File:** `supabase/functions/exportar-meus-dados/index.ts:64-68`
**Issue:** Copied verbatim from the `get-curriculo-url` mould, as documented. Because authorization travels in the `Authorization` header rather than a cookie, a wildcard origin is not directly exploitable — a hostile page cannot read the response without already possessing the titular's JWT.

Recording it anyway because this endpoint's response body is the complete PII set of an account in one payload, which makes it the single worst thing in this codebase to have reachable from arbitrary origins. The blanket wildcard means any injected script on any page the titular visits with a live token can drive a full export and read the result cross-origin; every other endpoint leaks a fragment.

**Fix:** Restrict to the deployed front-end origins, keeping the mould's shape:
```ts
const ORIGENS_PERMITIDAS = new Set([
  Deno.env.get('APP_ORIGIN') ?? '',
  'http://localhost:3003',
].filter(Boolean))

function corsPara(req: Request) {
  const origem = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGENS_PERMITIDAS.has(origem) ? origem : 'null',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}
```
If the project prefers to keep the wildcard for consistency across all EFs, that is a defensible call — but it should be a recorded decision rather than an inherited default, given what this particular response carries.

---

## What Was Checked and Found Sound

Recorded so a later reader does not re-litigate it:

- **Ordering of the seven steps.** `getUser()` precedes every privileged read; case (3) of the Deno suite asserts `admin.ops.length === 0` on the no-session path, which is a real proof and not a presence check.
- **The request body is genuinely never read.** No `req.json()`, no `req.text()` anywhere in `index.ts`. Case (6) proves it by byte-comparing two executions rather than by reading the source.
- **No wildcard projection.** Every read is `select(def.colunas.join(', '))` from the generated artifact; both negative probes carry meta-assertions proving they can find `*` if it appears.
- **RPC role guards.** Both use `IS DISTINCT FROM` (`20260804000002:248, 343`), not `NOT IN`. `REVOKE` names `anon` explicitly, and smoke `(f)` asks `has_function_privilege` rather than reading the `REVOKE` text.
- **Third-party PII.** `redacoes_candidato.referencia_match`, `agendamentos_entrevista.entrevistador`, `candidate_ai_decisions.ai_call_log_ids`, and every `*_por`/`*_por_usuario`/`avaliador_id`/`revisada_por` column are excluded with named reasons; the generator orders the pointer partition (step 3) *before* the inventory entry (step 4) specifically so an inventory `preservar` cannot override an exclusion.
- **BD-7.** No signed URL is minted server-side; `mintarUrlCurriculoProprio` uses the anon client with the titular's JWT at 60 s, the URL never enters state or cache, and `(af)` proves the service module contains no log call.
- **Logging.** The single `console.error` in the failure path carries `{ pedido_id }` only, and `(14b)` asserts the captured argument by deep equality plus a negative on the request body value.
- **Client-side cooldown is advisory.** `calcularLiberacaoCooldown` returning `null` on unreadable input is correct here (the opposite of WR-02) — a client that locks its own button moves the barrier to the client, and the server re-evaluates on every click.
- **Smoke assertion count.** (a)-(n) is exactly 14, matching `v_esperado`; GUC increments are correctly placed outside the rolled-back subtransactions.

---

_Reviewed: 2026-08-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
