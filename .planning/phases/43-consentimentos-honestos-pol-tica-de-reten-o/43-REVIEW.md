---
phase: 43-consentimentos-honestos-pol-tica-de-reten-o
reviewed: 2026-08-02T00:00:00Z
depth: standard
files_reviewed: 65
files_reviewed_list:
  - docs/compliance/marketing-consentimento-escopo.md
  - docs/compliance/reten06-veredito-retain-until.md
  - src/__tests__/copyPortoesLgpd.test.ts
  - src/components/RHSidebar.tsx
  - src/components/__tests__/RHSidebarRetencao.test.tsx
  - src/components/pages/MeuPerfilCandidatoPage.tsx
  - src/features/admin/retencao/components/EditarJanelaDialog.tsx
  - src/features/admin/retencao/components/MatrizRetencaoTable.tsx
  - src/features/admin/retencao/components/PreviaRetencaoBloco.tsx
  - src/features/admin/retencao/components/RetencaoPage.tsx
  - src/features/admin/retencao/components/__tests__/EditarJanelaDialog.test.tsx
  - src/features/admin/retencao/components/__tests__/MatrizRetencaoTable.test.tsx
  - src/features/admin/retencao/components/__tests__/PreviaRetencaoBloco.test.tsx
  - src/features/admin/retencao/components/__tests__/RetencaoPage.test.tsx
  - src/features/admin/retencao/hooks/useMatrizRetencao.ts
  - src/features/admin/retencao/hooks/usePreviaRetencao.ts
  - src/features/admin/retencao/hooks/useSalvarJanela.ts
  - src/features/admin/retencao/schemas/janelaRetencaoSchema.ts
  - src/features/admin/retencao/services/retencaoService.ts
  - src/features/cadastro/__tests__/consentTextFonteUnica.test.ts
  - src/features/cadastro/__tests__/sitiosDeCampoCliente.test.ts
  - src/features/cadastro/components/CadastroMultiStepForm.tsx
  - src/features/cadastro/components/steps/AutorizacoesStep.tsx
  - src/features/cadastro/components/steps/__tests__/AutorizacoesStep.test.tsx
  - src/features/cadastro/constants.ts
  - src/features/cadastro/schemas/candidatoSchema.ts
  - src/features/cadastro/services/__tests__/cadastroService.test.ts
  - src/features/cadastro/services/cadastroService.ts
  - src/features/cadastro/types/formTypes.ts
  - src/features/decisao/components/RegistrarDecisaoForm.tsx
  - src/features/decisao/components/__tests__/RegistrarDecisaoForm.test.tsx
  - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
  - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
  - src/features/privacidade/components/AutorizacoesLista.tsx
  - src/features/privacidade/components/ConsentimentoSwitchRow.tsx
  - src/features/privacidade/components/GuardaCurriculoBloco.tsx
  - src/features/privacidade/components/PrivacidadeCandidatoPage.tsx
  - src/features/privacidade/components/__tests__/ConsentimentoSwitchRow.test.tsx
  - src/features/privacidade/components/__tests__/GuardaCurriculoBloco.test.tsx
  - src/features/privacidade/components/__tests__/PrivacidadeCandidatoPage.test.tsx
  - src/features/privacidade/hooks/usePrivacidade.ts
  - src/features/privacidade/hooks/useRevogarMarketing.ts
  - src/features/privacidade/lib/datas.ts
  - src/features/privacidade/services/privacidadeService.ts
  - src/router/routes.tsx
  - supabase/functions/_shared/__tests__/autorizacoes-registro.test.ts
  - supabase/functions/_shared/__tests__/consent-hash.test.ts
  - supabase/functions/_shared/autorizacoes-registro.ts
  - supabase/functions/_shared/consent-hash.ts
  - supabase/functions/_shared/consent-text.json
  - supabase/functions/_shared/consent-text.v1-historico.json
  - supabase/functions/_shared/constants.ts
  - supabase/functions/_shared/schemas.ts
  - supabase/functions/cadastrar-candidato/index.ts
  - supabase/migrations/20260801000001_p43_consent_prova_e_marketing.sql
  - supabase/migrations/20260801000002_p43_config_retencao.sql
  - supabase/migrations/20260801000003_p43_guard_marketing.sql
  - supabase/migrations/20260801000004_p43_previa_retencao.sql
  - supabase/tests/p43_consent_prova_smoke.sql
  - supabase/tests/p43_guard_marketing_smoke.sql
  - supabase/tests/p43_matriz_retencao_smoke.sql
  - supabase/tests/p43_previa_smoke.sql
  - vite.config.ts
findings:
  critical: 1
  warning: 11
  info: 4
  total: 16
status: issues_found
---

# Phase 43: Code Review Report

**Reviewed:** 2026-08-02
**Depth:** standard
**Files Reviewed:** 65
**Status:** issues_found

## Summary

Phase 43's premise — a consent checkbox must have real consequence, and the system
must never assert something the person did not declare — is honoured in the places
the phase looked hardest at. The two server-side sites that decide the stored value
(`_shared/schemas.ts`, `_shared/autorizacoes-registro.ts`) carry no `??`, no
`.default()`, and the client mirrors are equally clean; a repo-wide sweep for
`?? true` / `.default(true)` / a DDL `DEFAULT` on the four new columns turns up only
prose describing the removed defect. Every SECURITY DEFINER guard in the four
migrations uses `IS DISTINCT FROM`, never `NOT IN`. The prévia is aggregate-only at
the signature level and the one function that returns identifiable rows is revoked
with no grant back. The single consent text has one source read by both runtimes and
a parity test on the version constant.

What the phase did **not** close is the write side of the same table it just turned
into a probative record. `public.autorizacoes` carries a broad row-level UPDATE policy
for the data subject and no column-level grant anywhere in the repository; Phase 43
added `consent_text_hash`, `consent_text_version`, `consent_registrado_em` and
`autorizacao_marketing_vagas` to that table, and the phase's own shipped client proves
the write path is reachable from a browser. The threat the phase names by name
(T-43-01: *"um hash controlado pelo titular não prova nada"*) is closed on the Edge
Function path and left open on the PostgREST path. That is CR-01 and it is the one
finding that must be fixed before this is treated as evidence.

Beyond that, the recurring defect class is **artefacts that were true at the instant
of the checkpoint and are false or self-defeating afterwards**: a compliance document
that still declares the guard absent from PROD, two smoke assertions that will accuse
the operator of back-filling consent the first time a real candidate registers, and
two migration files edited after their own apply so their documented `md5` fidelity
check can never match again. The phase's own doctrine — *"um teste que reprova o
comportamento correto é pior que teste nenhum: ele treina quem executa a desligá-lo"*
— indicts these.

## Critical Issues

### CR-01: The data subject can forge or erase their own consent proof — the new proof columns sit on a table the candidate can UPDATE

**File:** `supabase/migrations/20260801000001_p43_consent_prova_e_marketing.sql:180-184`
(and `:148-166`, the declared negative scope) · `src/features/privacidade/services/privacidadeService.ts:154-166`

**Issue:**
The migration adds four columns to `public.autorizacoes`:

```sql
ALTER TABLE public.autorizacoes
  ADD COLUMN consent_text_version   text,
  ADD COLUMN consent_text_hash      text,
  ADD COLUMN consent_registrado_em  timestamptz,
  ADD COLUMN autorizacao_marketing_vagas boolean;
```

and then explicitly declines to touch any policy (`⛔ ESCOPO NEGATIVO — ESTA MIGRATION
NÃO TOCA POLICY ALGUMA`). The table's live policy set, transcribed in the same header,
includes `"Candidatos podem atualizar suas autorizacoes"` — a plain `UPDATE` policy with
`qual` and `with_check`.

Postgres RLS is **row**-level. It does not restrict which *columns* an UPDATE may write.
Column restriction requires `GRANT UPDATE (col, …)`, and `grep -rn "autorizacoes"
supabase/migrations/*.sql | grep -i "grant\|revoke"` returns nothing — no column grant
exists anywhere in the repository. Under Supabase defaults, `authenticated` therefore
holds table-wide UPDATE on `public.autorizacoes`.

This is not hypothetical: this same phase ships the proof that the path is open.
`privacidadeService.revogarMarketing` executes an UPDATE on that table **from the
browser**, with the anon client and the candidate's own JWT:

```ts
const { data, error } = await supabase
  .from('autorizacoes')
  .update({
    autorizacao_marketing_vagas: novoValor,
    updated_at: new Date().toISOString(),
  })
  .eq('id', idAutorizacao)
```

The same credential can therefore issue:

```
PATCH /rest/v1/autorizacoes?id=eq.<own-row>
{ "consent_text_hash": "<any 64 hex>", "consent_text_version": "v2-2026-08",
  "consent_registrado_em": "2020-01-01T00:00:00Z", "autorizacao_uso_dados": false,
  "policy_version": "v9", "ip_aceite": null }
```

Every consequence the phase built the hash for is undone by that request:

- **T-43-01 is reopened.** `consent-hash.ts` states *"O hash é calculado EXCLUSIVAMENTE
  no servidor… Um hash controlado pelo titular não prova nada: o atacante escolheria o
  texto ao qual a linha 'corresponde'."* The `.strict()` on `autorizacoesSchema` closes
  the Edge Function door; PostgREST is a second door that was never closed.
- **SC#1 is reopened in the other direction.** The migration's whole argument is that
  `NULL` is the honest discriminator between pre- and post-enforcement rows. A titular
  can NULL their own proof columns and become indistinguishable from a historic row —
  or fill a historic row and become indistinguishable from a proven one.
- **The submit gate becomes retroactively deniable.** `autorizacao_uso_dados` is the
  D-15 gate; it is writable to `false` after the fact.
- **BD-4's honest absence is forgeable.** A candidate with no row cannot create one
  (INSERT policy absent), but any candidate *with* a row can rewrite its provenance.

The `p43_consent_prova_smoke.sql` assertion (e) counts the three policies and confirms
the UPDATE policy has `qual` and `with_check` — it asserts the policy was *not touched*,
which is exactly the state that leaves this open. No assertion anywhere covers column
privileges on this table.

**Fix:** Two layers, because a grant alone still permits the candidate to blank a column
they are allowed to write today.

```sql
-- 1. Column-level privilege: authenticated may write ONLY the revocable consent flags.
REVOKE UPDATE ON public.autorizacoes FROM authenticated, anon;
GRANT  UPDATE (autorizacao_marketing_vagas, autorizacao_retencao_curriculo, updated_at)
  ON public.autorizacoes TO authenticated;
-- (INSERT/DELETE stay revoked; service_role and the table owner are unaffected.)

-- 2. Immutability trigger: the proof is append-once, whoever the writer is.
CREATE OR REPLACE FUNCTION public.guard_prova_consentimento_imutavel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.consent_text_hash    IS DISTINCT FROM OLD.consent_text_hash
  OR NEW.consent_text_version IS DISTINCT FROM OLD.consent_text_version
  OR NEW.consent_registrado_em IS DISTINCT FROM OLD.consent_registrado_em
  OR NEW.policy_version       IS DISTINCT FROM OLD.policy_version
  OR NEW.ip_aceite            IS DISTINCT FROM OLD.ip_aceite
  OR NEW.autorizacao_uso_dados IS DISTINCT FROM OLD.autorizacao_uso_dados
  OR NEW.candidato_id         IS DISTINCT FROM OLD.candidato_id THEN
    RAISE EXCEPTION 'P43-PROVA: as colunas de prova de consentimento sao imutaveis apos o registro'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_prova_consentimento_imutavel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prova_consentimento_imutavel ON public.autorizacoes;
CREATE TRIGGER trg_prova_consentimento_imutavel
  BEFORE UPDATE ON public.autorizacoes
  FOR EACH ROW EXECUTE FUNCTION public.guard_prova_consentimento_imutavel();
```

Then extend `p43_consent_prova_smoke.sql` with a negative assertion that impersonates a
candidate JWT, attempts to write `consent_text_hash` on its own row, and requires the
refusal — the same "prove it by real write, not by reading a flag" standard the phase
applied to SC#2.

## Warnings

### WR-01: The compliance artefact for the marketing guard states the opposite of production reality

**File:** `docs/compliance/marketing-consentimento-escopo.md:155-163`

**Issue:** Section 6 reads:

> **⛔ NADA FOI APLICADO EM PRODUÇÃO PELO PLANO 43-05.** A migration `20260801000003` e o
> smoke `p43_guard_marketing_smoke.sql` são **arquivos**. O guard não existe em PROD, a
> tabela `classe_evento_notificacao` não existe, o CHECK ainda tem 6 valores, e o smoke
> está deliberadamente RED contra o banco atual.

All four statements are false as of checkpoint 43-07: the migration is applied, the table
exists, the CHECK carries seven values, and the smoke passed 9/9. This is the *compliance*
folder — the document whose stated purpose is *"o limite de uma prova é parte da prova. Um
controle cujo alcance não está escrito é lido, seis meses depois, como se alcançasse
tudo."* A reader six months out concludes the marketing guard is unimplemented and either
rebuilds it or reports to a regulator that it does not exist. The same section also
forward-references the md5 fidelity proof and the smoke run as future work.

**Fix:** Replace §6 with the measured post-apply state, dated, naming the ledger version and
the smoke result:

```markdown
## 6. Estado de aplicação

**APLICADO EM PRODUÇÃO no checkpoint 43-07 (2026-08-02).** `20260801000003` está viva
(`schema_migrations.version = '20260801000003'`, md5 conferido contra o arquivo),
`classe_evento_notificacao` existe com 7 linhas, o CHECK de `evento` carrega 7 valores,
e `p43_guard_marketing_smoke.sql` passou 9/9. O escopo honesto das seções 1-5
permanece inalterado: nenhum e-mail de marketing deixou de sair, porque nenhum jamais saiu.
```

### WR-02: Two assertions of the consent-proof smoke invert their meaning after the first real registration

**File:** `supabase/tests/p43_consent_prova_smoke.sql:163-176` (assertion b) and `:84`, `:320-332` (assertion f)

**Issue:** Assertion (b) requires **zero** rows with a non-null `consent_text_version`,
`consent_text_hash`, `consent_registrado_em` or `autorizacao_marketing_vagas`. Assertion (f)
requires `count(*) = 17`, hard-coded at line 84.

Both hold only at the instant of apply. The Edge Function is deployed at v16 and now writes
exactly those columns on every successful cadastro (`autorizacoes-registro.ts:152-157`), and
every new candidate adds a row. The first legitimate registration after the checkpoint makes
this smoke permanently RED, with failure text that accuses the operator of something that
did not happen:

> `P43C FAIL (b): 1 linha(s) com consent_text_version … já preenchidas — o apply BACK-FILLOU
> prova de consentimento. Essas linhas agora AFIRMAM que o titular leu um texto que ele nunca viu`

A gate that reports a fabricated back-fill every time the product is used correctly is the
exact failure mode the phase catalogued twice (`20260801000001:104-117`, `copyPortoesLgpd.test.ts:19-20`):
it trains whoever runs it to switch it off.

**Fix:** Scope both assertions to rows that predate enforcement instead of to the whole table.

```sql
-- (b) — pre-enforcement rows only: no row created BEFORE the apply may carry proof.
SELECT count(*) FILTER (WHERE consent_text_hash IS NOT NULL)
  INTO v_hash
  FROM public.autorizacoes
 WHERE created_at < current_setting('smoke43c.apply_em')::timestamptz;

-- (f) — the invariant that survives normal use is that nothing was DELETED.
IF v_agora < v_esperado THEN
  RAISE EXCEPTION 'P43C FAIL (f): public.autorizacoes tem % linhas, MENOS que as % de antes do apply — linha(s) de prova desapareceram', v_agora, v_esperado;
END IF;
```

Seed `smoke43c.apply_em` from `schema_migrations` rather than by hand, so re-running the smoke
never depends on transcription.

### WR-03: Migrations 01 and 03 were edited in the same commit that applied them — their own md5 fidelity check can never match again

**File:** `supabase/migrations/20260801000001_p43_consent_prova_e_marketing.sql:137-138` ·
`supabase/migrations/20260801000003_p43_guard_marketing.sql:89-96`

**Issue:** Both files instruct a future auditor to run:

```
SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations WHERE version = '2026080100000X';
-- comparar com: printf '%s' "$(cat supabase/migrations/2026080100000X_*.sql)" | md5
-- Divergência ⇒ o conteúdo aplicado NÃO é este arquivo.
```

Commit `6a1b13f` ("as 4 migrations vivas em PROD") both applied the migrations *and* filled in
the `>>> depois:` measurement lines — measurements that by definition can only be taken after
the apply. The bytes in the ledger therefore cannot include those lines, and the documented
check will report divergence forever. For `20260801000003` the file itself says the loss of a
comment is **not** benign, so the auditor is told to treat divergence as a serious signal.

The same mechanism is load-bearing one level up: `p43_previa_smoke.sql:99-106` defines its
*only authorised* divergence path as "the pin failed **and** the apply md5 matched" — a
discriminator that is now unusable for these two migrations.

**Fix:** Record the expected divergence in the file, next to the instruction it invalidates:

```sql
-- ⚠ NOTA PÓS-APPLY (2026-08-02): as linhas `>>> depois:` acima foram preenchidas DEPOIS
-- do apply, no mesmo commit (6a1b13f). O md5 deste ARQUIVO já NÃO bate o
-- md5(statements[1]) do ledger, e isso é ESPERADO. O md5 do conteúdo efetivamente
-- aplicado é <valor medido>; confira contra ELE, não contra o arquivo.
```

For future migrations, keep the post-apply measurement in the SUMMARY (or in a
`COMMENT ON …` applied by a follow-up migration) so the applied artefact stays immutable.

### WR-04: The marketing guard is BEFORE INSERT only — an UPDATE of `evento` escapes it and the retry cron would dispatch

**File:** `supabase/migrations/20260801000003_p43_guard_marketing.sql:452-456`

**Issue:**

```sql
CREATE TRIGGER trg_guard_marketing_consentimento
  BEFORE INSERT ON public.notificacoes_enviadas
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketing_consentimento();
```

The file's argument for the choke point (`:368-379`) is that a control living in one emitter
protects one emitter, and that the ledger *"alcança todo caminho presente e futuro"*. That is
true of INSERT and untrue of UPDATE. `notificacoes_enviadas` already carries a
`BEFORE UPDATE` trigger (`trg_notificacoes_atualizado_em`), so updates to this table are a
live path, and the guard smoke itself documents (`:37-40`) that a row left at
`status = 'pendente'` is swept by `varrer_retry_notificacoes` every 15 minutes and
re-dispatched. A transacional row whose `evento` is later changed to `divulgacao_vagas` while
still pendente would be dispatched with no consent consultation at all — the CHECK accepts the
value, the guard never runs.

**Fix:** Add the UPDATE arm, narrowed so the five live transacional flows pay nothing:

```sql
DROP TRIGGER IF EXISTS trg_guard_marketing_consentimento_upd ON public.notificacoes_enviadas;
CREATE TRIGGER trg_guard_marketing_consentimento_upd
  BEFORE UPDATE OF evento, candidato_id ON public.notificacoes_enviadas
  FOR EACH ROW
  WHEN (NEW.evento IS DISTINCT FROM OLD.evento
     OR NEW.candidato_id IS DISTINCT FROM OLD.candidato_id)
  EXECUTE FUNCTION public.guard_marketing_consentimento();
```

and update assertion (h) of `p43_guard_marketing_smoke.sql` from `v_total <> 2` to `<> 3`.

### WR-05: Guard-smoke assertion (i) can fail on a decrease and blame a phantom e-mail dispatch

**File:** `supabase/tests/p43_guard_marketing_smoke.sql:637-644` (and the same shape at `:676` and `:705`)

**Issue:**

```sql
IF v_agora <> v_antes THEN
  RAISE EXCEPTION 'P43G FAIL (i): net._http_response saiu de % para % linhas — ALGO FOI DESPACHADO durante o smoke. NOTIFICACOES_MODO é producao em PROD: verificar imediatamente se um e-mail REAL saiu', v_antes, v_agora;
```

`net._http_response` is pruned by pg_net's own TTL worker. A row expiring mid-run makes
`v_agora < v_antes`, which trips `<>` and emits an urgent, false claim that a real e-mail may
have gone out. The assertion's job is to detect an *increase*; `<>` also detects garbage
collection and mislabels it. `(y1)` and `(y2)` have the same shape against
`notificacoes_enviadas` and `autorizacoes`, tables that receive legitimate concurrent writes
in PROD, so a real cadastro landing during the smoke would be reported as "o smoke deixou
efeito colateral".

**Fix:**

```sql
IF v_agora > v_antes THEN
  RAISE EXCEPTION 'P43G FAIL (i): net._http_response subiu de % para % linhas — ALGO FOI DESPACHADO …', v_antes, v_agora;
ELSIF v_agora < v_antes THEN
  RAISE NOTICE 'PASS (i): net._http_response caiu de % para % (TTL do pg_net) — zero requisição nova', v_antes, v_agora;
END IF;
```

For (y1)/(y2), keep the exact `dedupe_key LIKE 'smoke43g:%'` / marketing-`true` residue checks
(which are precise) and relax the whole-table count comparisons to `<` (rows lost) rather than
`<>`.

### WR-06: `revogarMarketing` scopes the write by `id` alone, and the policy it leans on exists only in PROD

**File:** `src/features/privacidade/services/privacidadeService.ts:154-166`

**Issue:** The UPDATE targets `.eq('id', idAutorizacao)` with no `candidato_id` predicate. The
module docblock (`:31-37`) is explicit that this is safe *because* the live policy
`"Candidatos podem atualizar suas autorizacoes"` carries `qual` **and** `with_check`. But the
same repository records (`20260801000001:153-157`) that those three policies exist **in PROD
and in no migration file** — the fourth open instance of the drift TODO — and that
`supabase db reset` would silently lose them. The service's only defence against a candidate
writing another candidate's consent row is an object that is not in version control.

**Fix:** Add the redundant predicate. It costs nothing, it is correct even if the policy is
reconstructed wrongly, and it makes the intent legible at the call site:

```ts
  .eq('id', idAutorizacao)
  .eq('candidato_id', candidatoId)   // defesa em profundidade: a policy viva não está em arquivo nenhum
```

(`candidatoId` is already in hand at both call sites — `useRevogarMarketing` receives it.)
Separately, promote the three live policies into a migration so a reset reproduces them; that
is a prerequisite for CR-01's fix landing on a reproducible baseline.

### WR-07: `updated_at` on the consent row is written from the client clock

**File:** `src/features/privacidade/services/privacidadeService.ts:158-161`

**Issue:**

```ts
updated_at: new Date().toISOString(),
```

This value comes from the browser and is the value the UI renders as the dated statement of
record — `ConsentimentoSwitchRow` shows `Desativado em {formatarDataPtBr(confirmadoEm)}` from
exactly this column. A user with a skewed or deliberately altered clock (or a crafted
PATCH — see CR-01) dates their own revocation arbitrarily, and the screen presents that as
fact. In a phase whose thesis is that the record must not assert what the person did not do,
a client-authored timestamp on a consent row is the wrong direction.

**Fix:** Let the server stamp it, matching the `calculada_em := now()` reasoning already
adopted for the prévia (lesson 42-12):

```sql
CREATE TRIGGER trg_autorizacoes_atualizado_em
  BEFORE UPDATE ON public.autorizacoes
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();  -- reusa a função viva da P37
```

then drop `updated_at` from the client payload and keep it in the read allowlist only.

### WR-08: `ConsentimentoSwitchRow` renders the row's label as its state text when the value is `true` with no date

**File:** `src/features/privacidade/components/ConsentimentoSwitchRow.tsx:84-88`

**Issue:**

```ts
if (valor === true) {
  return data
    ? COPY_CONSENTIMENTO_MARKETING.ativoDesde(data)
    : COPY_CONSENTIMENTO_MARKETING.rotulo          // ← "Avisos sobre novas vagas"
}
```

The fallback yields the *label* string, not a state. The line rendered under the switch — the
one the component's own rule 4 declares to be the colourblind-safe statement of state
(*"o estado é dito em TEXTO ao lado do controle, nunca só pela posição do switch"*) — becomes a
verbatim repeat of the label directly above it, saying nothing about on/off. The branch is
reachable whenever `formatarDataPtBr` returns `''`: a null/unparseable `updated_at`, which is
precisely what a partially-written or migrated row would carry. The suite covers
`true`+date, `false`+date and `null`, but not `true` without date
(`__tests__/ConsentimentoSwitchRow.test.tsx:152-183`), so the branch is untested.

**Fix:** Add the missing state string and a case for it.

```ts
export const COPY_CONSENTIMENTO_MARKETING = {
  // …
  ativo: 'Ativo',
} as const

if (valor === true) {
  return data
    ? COPY_CONSENTIMENTO_MARKETING.ativoDesde(data)
    : COPY_CONSENTIMENTO_MARKETING.ativo
}
```

### WR-09: `EditarJanelaDialog` can present an enabled save CTA that leads nowhere

**File:** `src/features/admin/retencao/components/EditarJanelaDialog.tsx:150-151, 264-288`

**Issue:** The CTA's enablement and the confirmation dialog's existence use different
conditions:

```ts
const podeSalvar = erro === null && meses !== null && !semMudanca && !salvar.isPending
// …
{meses !== null && atual !== null ? (<AlertDialogContent> … </AlertDialogContent>) : null}
```

When the row exists in the matrix but its window is null (`MatrizRetencaoRow.janela_meses` is
typed `number | null`, and `MATRIZ_COPY.janelaNaoDefinida` exists precisely for that state),
`atual === null`. `MatrizRetencaoTable` only disables the Editar button on `!linha.definida`,
so such a row opens the dialog. The operator types `12`, the CTA enables, the click opens an
`AlertDialog` with no content, and nothing happens — no confirmation, no error, no save. The
dialog's own docblock rule 1 states the no-op rule lives on both sides; this is the inverse
failure, a valid change that has no path to the server.

**Fix:** Make the two conditions agree and handle the "not defined yet" copy explicitly:

```tsx
{meses !== null ? (
  <AlertDialogContent>
    …
    O estado <b>{linha.rotulo}</b> passa de{' '}
    <b>{atual === null ? MATRIZ_COPY.janelaNaoDefinida : MATRIZ_COPY.janelaMeses(atual)}</b>{' '}
    para <b>{MATRIZ_COPY.janelaMeses(meses)}</b>. {DIALOGO_JANELA_COPY.confirmacao.escopo}
    …
  </AlertDialogContent>
) : null}
```

and add a case to `EditarJanelaDialog.test.tsx` opening `linha({ janelaMeses: null })`.

### WR-10: `/candidato/privacidade` renders an unbounded skeleton when the candidate object is missing

**File:** `src/features/privacidade/components/PrivacidadeCandidatoPage.tsx:53-85`

**Issue:**

```ts
const candidato = useCandidato()
const candidatoId = candidato?.id
// …
if (!candidatoId || isLoading) { return <ScreenShell>…skeleton…</ScreenShell> }
```

`usePrivacidade` is `enabled: Boolean(candidatoId)`, so with no `candidatoId` the query never
runs and `isError` never becomes true. The page then pulses forever, with no error copy, no
retry button and no timeout. `RoleGuard role="candidato"` gates on the JWT role, which is a
different fact from the hydrated `candidato` row — the codebase already acknowledges this
race with `waitForCandidatoHydrated` in the cadastro flow. The sibling
`ExplicacaoCandidatoPage` does not have this shape because it reads its id from the route.
On the one screen dedicated to exercising a data-subject right, an unresolvable silent
loading state is the wrong degraded behaviour.

**Fix:** Separate "not hydrated yet" from "loading data", and give the first a bounded outcome:

```tsx
if (!candidatoId) {
  return (
    <ScreenShell>
      <GlassPanel variant="white" blur="xl" className="space-y-4 p-12 text-center text-white">
        <p className="text-xl font-semibold">{COPY_PRIVACIDADE.erroTitulo}</p>
        <p className="text-white/80">{COPY_PRIVACIDADE.erroCorpo}</p>
        <GlassButton variant="white" hover onClick={() => window.location.reload()}
          className="min-h-[44px] text-white">
          {COPY_PRIVACIDADE.tentarNovamente}
        </GlassButton>
      </GlassPanel>
    </ScreenShell>
  )
}
```

(or await hydration with the existing `waitForCandidatoHydrated({ timeoutMs })` helper and fall
through to this state on timeout).

### WR-11: The exclusion-promise copy gate matches only one verb construction

**File:** `src/__tests__/copyPortoesLgpd.test.ts:184-187`

**Issue:**

```ts
const FUTURO_DE_EXCLUSAO = new RegExp(
  [`ser[ao]o?\\s+(${LEXICO_EXCLUSAO})`, `${['exclusao', '\\s+', 'automatic'].join('')}`].join('|'),
  'i',
)
```

After accent folding this catches `será/serão + exclu|apag|delet|elimin|descart` and the noun
phrase. It does not catch the equally common — and equally false — forms a copywriter would
actually produce: *"vão ser apagados"*, *"serem eliminados"*, *"excluiremos"*, *"apagaremos"*,
*"passam a ser excluídos"*, *"até serem descartados"*. The co-occurrence rule at `:213-236`
only fires when the adverb is present, so a promise with no adverb and no `será` slips both
gates. This is the phase's primary automated defence against orphan promises on the candidate
surface, and it is narrower than its own docblock claims (*"Superset das strings soltas da
spec"*).

**Fix:** Widen the future/passive coverage while keeping the runtime-assembled literals:

```ts
const FUTURO_DE_EXCLUSAO = new RegExp(
  [
    `\\bser[ao]o?\\s+(${LEXICO_EXCLUSAO})`,          // será/serão apagado(s)
    `\\bv[ao]o\\s+ser\\s+(${LEXICO_EXCLUSAO})`,      // vão ser apagados
    `\\bserem\\s+(${LEXICO_EXCLUSAO})`,              // serem eliminados
    `\\b(${LEXICO_EXCLUSAO})\\w*(remos|rao|ra)\\b`,  // excluiremos / apagarao / eliminara
    ['exclusao', '\\s+', 'automatic'].join(''),
  ].join('|'),
  'i',
)
```

and add the new forms to the existing self-proof block at `:317-322`.

## Info

### IN-01: `retencaoService` and `MatrizRetencaoTable` document opposite ordering rules

**File:** `src/features/admin/retencao/services/retencaoService.ts:165-167` vs
`src/features/admin/retencao/components/MatrizRetencaoTable.tsx:128-133`

**Issue:** The service says *"A ordem é do servidor (ordem do enum `etapa_processo`); a tela
**não** reordena."* The table's `mesclarComEnum` iterates `ETAPA_M2_OPTIONS` and rebuilds the
list in that order, discarding the server order entirely. The two orders happen to coincide
today, so nothing is visibly wrong — which is exactly why the contradiction will survive.

**Fix:** Correct the service docblock to say the server order is not relied upon and that
`ETAPA_M2_OPTIONS` is the single ordering authority, or drop the ordering claim from the
service entirely.

### IN-02: The draft-key bump rationale describes a failure the code cannot produce

**File:** `src/features/cadastro/constants.ts:41-49`

**Issue:** The comment justifies `CADASTRO_DRAFT_KEY = 'cadastro:draft:v2'` by saying an old
draft *"seria restaurado com a forma ANTIGA e o envio bateria `400 VALIDATION` no schema
`.strict()` do servidor"*. That path is unreachable: `handleFormSubmit` sends
`result.data.autorizacoes` from a non-strict `candidatoFormSchema.safeParse`, which strips
unknown keys before the request is built (`CadastroMultiStepForm.tsx:449-460`,
`cadastroService.ts:205`). The real symptom of a stale draft is a missing
`autorizacao_marketing_vagas` failing client-side validation. The bump is right; the stated
reason is not, and it will be cited later as evidence about the server contract.

**Fix:** Restate the reason as the client-side one (missing required key → opaque local
validation failure on a field the person never saw).

### IN-03: Origem cell tooltip discloses a different string than the cell renders

**File:** `src/features/admin/retencao/components/MatrizRetencaoTable.tsx:224-229`

**Issue:** The cell is `truncate`d and renders `rotularOrigem(linha)` (e.g. `Alterado por Ana
Souza`), but `title={linha.alteradoPorNome ?? undefined}` shows only `Ana Souza`, and is absent
entirely for seed rows whose visible text (`Seed (teto consentido)`) is the one most likely to
be clipped on a narrow viewport. The `truncate`/`title` pairing the docblock calls obligatory
therefore does not restore the truncated content.

**Fix:** `title={rotularOrigem(linha)}`.

### IN-04: RETEN-06 verdict cites the wrong plan for the admin surface

**File:** `docs/compliance/reten06-veredito-retain-until.md:113-114`

**Issue:** *"a superfície de edição do admin, no **43-06** / `/admin/retencao`"*. Plan 43-06
delivered the retention predicate and the two aggregate wrappers (`20260801000004`); the admin
screen was delivered by 43-09. §Rastro at `:151` repeats the same mis-attribution.

**Fix:** Change both references to 43-09.

---

_Reviewed: 2026-08-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
