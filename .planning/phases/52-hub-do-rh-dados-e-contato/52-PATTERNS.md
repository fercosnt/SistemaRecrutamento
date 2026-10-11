# Phase 52: Hub do RH — Dados, Contato e Avaliações do Candidato - Pattern Map

**Mapped:** 2026-10-10
**Files analyzed:** 52 (new + modified, across blocks A/B/C/D + Wave 0)
**Analogs found:** 49 / 52 (3 with partial/no analog — see §No Analog Found)

> Every analog path below was checked with `git ls-files` (tracked source; no install/runtime mirror).
> Line numbers were read in this session (2026-10-10). Where RESEARCH/CONTEXT and the code disagree,
> the code citation here wins and the divergence is flagged with ⚠.
>
> ⛔ Executor rule repeated from the dispatch (F16): **never** `git add -A`, `git commit -a`, `git stash`,
> `git checkout -- .` — `docs/specs/DRAFT-banco-sjt-marketing.md` is an uncommitted draft that the
> current generator reads by fixed path. Stage only enumerated paths.

---

## File Classification

### Bloco B — Hub do RH (server read with log + abas + contato + avaliações)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/functions/ler-cadastro-candidato-rh/index.ts` (new) | EF (controller) | request-response, privileged read + redacted log | `supabase/functions/get-curriculo-url/index.ts` | exact |
| `supabase/functions/ler-cadastro-candidato-rh/index.test.ts` (new) | test (deno) | request-response | `supabase/functions/get-curriculo-url/index.test.ts` | exact |
| `efdeploy.cjs` (modify — `VERIFY_JWT` table) | config | — | same file, lines 44-68 | exact |
| `supabase/migrations/2026101?00000N_p52_leituras_rh.sql` (new — `ler_sjt_mc_rh`, `ler_devolutiva_bigfive_rh`, `ler_contexto_rejeicao_triagem_revisao`) | migration (RPC SECURITY DEFINER) | request-response (read) | `20261008000003_p51_fila_tres_origens.sql` (`ler_contexto_knockout_revisao` :444-528, PRE :131-175, POS :674-699) + `20261005000003_p50_rpcs_leitura_filas.sql` (`ler_resposta_caso_aberto_sjt` :611-671) | exact |
| `supabase/tests/p52_leituras_rh_smoke.sql` (new) | test (SQL smoke per role) | CRUD-read | `supabase/tests/p50_acesso_recrutador_smoke.sql` | exact |
| `src/features/hub-candidato/services/cadastroCandidatoRhService.ts` (new) | service | request-response (EF invoke) | `src/features/vagas/services/cvUploadService.ts:200-214` (invoke) + `src/features/avaliacao/services/scoresRhService.ts:18-32,195-243` (error class + contract validation) | role-match |
| `src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts` (new) | hook | request-response | `src/features/hub-candidato/hooks/useHistoricoCandidatura.ts` | exact |
| `src/features/avaliacao/services/avaliacoesRhService.ts` (new — `lerSjtMcRh`, `lerDevolutivaBigFiveRh`) | service | request-response (RPC) | `scoresRhService.ts:195-243` (`getRespostaCasoAbertoSjt`) | exact |
| `src/features/revisao/services/revisaoService.ts` (modify — `lerContextoRejeicaoTriagem`) | service | request-response (RPC) | same file `lerContextoKnockout` :414-440 | exact |
| `src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx` (new, or inline in dialog) | component | on-demand read | `src/features/revisao/components/ContextoKnockoutRevisao.tsx` | exact |
| `src/features/revisao/components/ResponderRevisaoDialog.tsx` (modify) | component | — | same file :321-351 | exact |
| `src/features/triagem/components/RejeitarCandidaturaDialog.tsx` (modify — export `MOTIVO_OPTIONS`) | component/constant | — | same file :55-63 | exact |
| `src/features/hub-candidato/components/HubCandidatoRH.tsx` (modify — 4 abas, cabeçalho de contato) | component (page) | composition | `src/features/entrevista/components/EntrevistaWorkspace.tsx:162-176` (Tabs RH) | exact |
| `src/features/hub-candidato/components/HubSection.tsx` (modify — `text-2xl`) | component | — | same file :93 | exact |
| `src/features/hub-candidato/components/ContatoCandidatoHeader.tsx` (new) | component | static-render from hook | `HubCandidatoRH.tsx:322-358` (neutral buttons + «botão que some explica por quê» `hub-acoes-encerrada`) | role-match |
| `src/features/hub-candidato/components/DadosCadastroBloco.tsx` (new) | component | static-render | `ResponderRevisaoDialog.tsx:321-344` (grid of label/value) + `ContextoKnockoutRevisao.tsx` `Par` | role-match |
| `src/features/hub-candidato/components/RespostasInscricaoBloco.tsx` (new) | component | static-render, grouped list | `src/components/pages/FormularioCandidaturaPage.tsx:81-115` (`ROTULO_BLOCO` + `groupByBloco`) | role-match |
| `src/features/hub-candidato/lib/contato.ts`, `formatos.ts`, `linkify.ts` (new) | utility (pure) | transform | `src/features/hub-candidato/lib/instrumentosDaVaga.ts` (pure lib, own `__tests__`) + `src/features/auth/utils/resolveRedirect.ts:35-60` (pure validator) | role-match |
| `src/features/avaliacao/lib/bigFiveRotulos.tsx` (new — extracted) | utility/shared constants + tiny component | transform | `src/features/avaliacao/components/DevolutivaBigFiveView.tsx:38-85,126-132` | exact (extraction) |
| `src/features/avaliacao/components/BigFiveResultadoHub.tsx` (new) | component | on-demand read | `ScorecardAvaliacao.tsx:288-303` (`BigFiveEstado`) + `AvaliacoesRespondidasBloco.tsx:44-78` (aria-expanded toggle) | role-match |
| `src/features/avaliacao/components/SjtMcDetalhe.tsx` (new) | component | on-demand read | `ScorecardAvaliacao.tsx:100-149` (`McBreakdown`) | exact (replacement) |
| `src/features/avaliacao/components/TextoComCitacoes.tsx` (new) | component | transform (segments) | `ScorecardAvaliacao.tsx:235-256` + RESEARCH Code Example 4 | role-match |
| `src/features/avaliacao/components/ScorecardAvaliacao.tsx` (modify — restyle, swap McBreakdown/BigFiveEstado in hub) | component | — | same file | exact |
| `src/features/decisao/components/RespostaCasoAbertoSjt.tsx` (modify — hub variant of `RespostaCasoAbertoConteudo`) | component | on-demand read | same file :47-94 | exact |
| `src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx` (leaves the hub; `COPY_AVALIACOES_RESPONDIDAS` stays) | component | — | same file | exact |
| `src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx` (**replace**), `src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx` (**edit, scoped** — only the D-32 `describe` is replaced (52-11) and new `describe`s are appended (52-11, 52-12); the harness, fixtures, UX-07, D-20 and 49-41 blocks stay byte for byte versus `refs/gsd/52/base`, gated in 52-11 and 52-12), new `__tests__` for each new component | test (vitest) | — | `hubVerRespostas.test.tsx:1-40` (mock harness) | exact |
| `src/components/pages/FormularioCandidaturaPage.tsx` (modify — extract `ROTULO_BLOCO`/`groupByBloco`; knockout card colors 532-548) | page | — | same file | exact |

### Bloco A — Telas sem banco

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/features/avaliacao/components/SairDaProvaButton.tsx` (new) | component | event-driven (navigation + confirm) | `SjtMultiplaEscolhaScreen.tsx:122-125` (`COPY_NAV`) + `:272-301` (`AlertDialog`) | role-match |
| `SjtMultiplaEscolhaScreen.tsx` (modify — saída, «Tempo decorrido» :9 docblock + :225) | component (screen) | — | same file | exact |
| `src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx` (modify — shell, instruções, saída, classes) | component (screen) | — | `SjtMultiplaEscolhaScreen.tsx:310-323` (`ScreenShell`) | exact |
| `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx` (modify — saída **com confirmação**, D-36) | component (screen) | — | `SairDaProvaButton` (memory branch) | exact |
| `BigFiveQuestionnaireScreen.tsx`, `RedacaoEditorScreen.tsx`, `SjtCasoAbertoScreen.tsx` (modify — saída direta após `flushNow`) | component (screen) | — | `useAutosaveAvaliacao.ts:123-129` (`flushNow`) | exact |
| `src/features/avaliacao/components/AvaliacaoContainer.tsx` (modify — «Ver devolutiva»; export `deriveCards` + `avaliacoesConcluidas`) | component | — | same file :199-200 (`allDone`), :265-327 (cards/CTA), :410 (`deriveCards`), :474-486 (query keys) | exact |
| `src/components/pages/DashboardCandidatoPage.tsx` (modify — D-27) | page | read-derive | same file :470-479 (neutral `span`) + container query keys | exact |
| `src/components/layouts/CandidatoNavbar.tsx` (modify — «Meu painel») | component | — | same file :103-113 («Área do candidato» button) | exact |
| `src/components/pages/LoginCandidatoPage.tsx` (modify — sessão aberta) | page | — | same file :126-130 + `resolveRedirect.ts:35-60` | exact |
| `src/components/ui/select.tsx` (modify — `SelectItem` :129-136) | ui primitive | — | same file | exact |
| `src/features/entrevista/components/EntrevistaScorecardInline.tsx` (modify — 5 botões `radiogroup`) | component (form) | — | same file :152-180 (análise `radiogroup`) | exact |
| `src/components/RHSidebar.tsx` (modify — extract `getActivePageFromPath`) | component/utility | — | same file :106-127 | exact |
| `src/features/triagem/components/ProvenienciaIABadge.tsx` (modify — `textoProveniencia` + `geradoEm`) | utility (copy) | transform | same file :60-69, :109-126 | exact |
| `src/features/agendamento/components/AgendamentoBlock.tsx` (modify — :99 title only) | component | — | `HubSection.tsx:93` | exact |
| `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts` (keep biting; possibly extend) | test (guard) | file-I/O | same file :38-46 | exact |

### Bloco C — Banco SJT v2 (pré-vendas + marketing)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/geradores/gen-sjt-v2.py` (new) | utility (generator) | file-I/O → SQL | `scripts/geradores/gen-sjt-marketing.py` | exact |
| `scripts/geradores/tabela-comprimento-sjt.py` (new, `--auto-teste`) | utility (gate) | file-I/O → report | `gen-sjt-marketing.py:3-50` (parser to REUSE) | role-match |
| `docs/specs/<texto-sjt-v2>.md` (new file — **not** the DRAFT) | content/doc | — | `docs/specs/DRAFT-banco-sjt-marketing.md` (format only; do not touch) + `docs/conhecimento/sjt/banco-sjt-sdr-social-seller.md` (source) | exact (format) |
| `supabase/migrations/2026101?00000N_p52_banco_sjt_v2.sql` (new — inserts + retirada) | migration (data) | batch | `20260929000001_banco_sjt_marketing.sql` (body) + `20261010000002_p51_limpa_disponibilidade_anonimizados.sql` (PRE/POS with baseline) | exact |
| `supabase/tests/p52_banco_sjt_smoke.sql` (new) | test (SQL smoke) | read | `p50_acesso_recrutador_smoke.sql:365-383` (ensaio guard + pass/esperado) | role-match |

### Bloco D — Limpeza (destrutiva) + dado RH2/RH3

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/tests/p52_populacao_limpeza.sql` (new, read-only varredura) | test/measurement | read | RESEARCH §Bloco D skeleton + `51-23-COMANDO-APPLY.sh:34` (`$SQL` canonical measure) | role-match |
| `supabase/migrations/2026101?00000N_p52_limpeza_dados_teste.sql` (new) | migration (destructive DML) | batch | body: `supabase/tests/p47_teardown_dados_de_teste.sql`; gates: `20261010000002_p51_limpa_disponibilidade_anonimizados.sql` | exact |
| `.planning/phases/52-…/52-NN-COMANDO-APPLY.sh` + `52-NN-DECISAO.md` + `52-NN-POPULACAO.json` (new) | config/gate | batch | `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-COMANDO-APPLY.sh` | exact |
| `scripts/p52_limpeza_portao.cjs` (new, `--auto-teste`) | utility (gate) | transform | inline `CMP` in `51-23-COMANDO-APPLY.sh:38` + `scripts/p51_portao.cjs` | role-match |
| Storage removal script / single-use EF (new) | utility | file-I/O (Storage API) | `supabase/functions/purgar-retencao/index.ts:266-292` (list + lotes via Storage API) | partial |
| `supabase/migrations/2026101?00000N_p52_nomes_rh2_rh3.sql` (new — controlled data write, D-39) | migration (data) | CRUD-update | PRE/POS shape of `20261010000002` (minus DELETE); `20260929000002_jorn50_reaponta_sjt_social_media.sql` (⚠ has no gate — do not copy its shape) | role-match |

### Wave 0 harness

| New File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/p52_ensaio.cjs` | utility (rehearsal) | batch, aborting tx | `scripts/p51_ensaio.cjs` | exact |
| `scripts/p52_mutacoes.cjs` | utility (gate) | batch | `scripts/p51_mutacoes.cjs` | exact |

---

## Pattern Assignments

### `supabase/functions/ler-cadastro-candidato-rh/index.ts` (EF, request-response)

**Analog:** `supabase/functions/get-curriculo-url/index.ts` (251 lines) — clone the skeleton; replace step 4–6 with the reads.

**Imports + helpers** (lines 54-78):
```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
type ErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "SERVER_ERROR";
function jsonResponse(body: unknown, status: number): Response { … }
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error_code: code, message }, status);
}
```

**Injectable deps + testable handler** (lines 84-104): `export interface Deps { supabaseAdmin: any; supabaseUser: any }` and `export async function handler(req, deps)`; `Deno.serve` only under `if (import.meta.main)` (lines 220-251) so the test can import without booting.

**Authenticate → authorize by LIVE `usuarios_rh` row** (lines 107-139) — copy verbatim:
```ts
  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
  }
  const user = userRes.user;
  const { data: rhRow, error: rhErr } = await supabaseAdmin
    .from("usuarios_rh")
    .select("role")
    .eq("user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (rhErr) {
    return errorResponse("SERVER_ERROR", "Falha ao verificar permissão.", 500);
  }
  const dbRole = (rhRow?.role as string | undefined) ?? null;
  const role = dbRole === "recrutador" ? "rh" : dbRole === "administrador" ? "administrador" : dbRole;
  if (role !== "rh" && role !== "administrador") {
    return errorResponse("FORBIDDEN", "Acesso negado.", 403);
  }
```

**Input validation (uuid, 400)** (lines 144-159): accept `{ candidatura_id }` only; `UUID_RE` test; malformed JSON → `VALIDATION`.

**Live candidatura, allowlist projection, 404 indistinguishable** (lines 171-184):
```ts
    const { data: candRaw, error: candErr } = await supabaseAdmin
      .from("candidaturas")
      .select("curriculo_url")          // ← replace with explicit allowlist: candidato_id, vaga_id
      .eq("id", candidaturaId)
      .is("deleted_at", null)
      .eq("is_rascunho", false)
      .maybeSingle();
    if (candErr) return errorResponse("SERVER_ERROR", "Falha ao carregar a candidatura.", 500);
    if (!cand) return errorResponse("NOT_FOUND", "Candidatura não encontrada.", 404);
```
Then the new reads, each with an **explicit column list** (never `select('*')`): `candidatos` (19 fields of RESEARCH §Bloco B + `id`, `user_id` for the tombstone check — never returned), `disponibilidade` (`periodo_disponivel, regime_trabalho, disponibilidade_imediata, data_disponibilidade`), `perguntas_formulario` × `respostas_formulario` (ordered `ordem ASC`) with `eliminatoria = EXISTS pergunta_opcao_metadata.tag='knockout'` (never the option), `vagas.titulo`.

**Tombstone / `@invalido.local`** — predicate verbatim from `51-23-COMANDO-APPLY.sh:34` and `20261010000002:127-130` (`email = 'anonimizado+'||id||'@invalido.local' AND user_id IS NULL AND data_nascimento = '1900-01-01'`) → `cadastro: null, contato: null`; e-mail ending `@invalido.local` → `contato.email = null`. See RESEARCH Code Example 1.

**Redacted log line** (line 205) — extend with the RH id (A3):
```ts
    console.log("[get-curriculo-url] ok", { candidatura_id: candidaturaId, role });
    // P52: console.log("[ler-cadastro-candidato-rh] ok", { candidatura_id: candidaturaId, rh_user_id: user.id, role })
```
**Error path** (lines 208-213): `console.error("[…] erro", { candidatura_id, error: message })` — ⚠ Pitfall 11: a PostgREST `message` can echo a value; prefer a fixed code string or the error `code` only.

**Wiring** (lines 220-251): OPTIONS short-circuit before the auth-header guard; two clients (anon+Authorization for `getUser`, service_role for reads).

---

### `supabase/functions/ler-cadastro-candidato-rh/index.test.ts` (deno test)

**Analog:** `supabase/functions/get-curriculo-url/index.test.ts` (383 lines).

- Imports: `import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";` (line 33).
- Harness: `makeChainable(result)` (lines ~50-66) and **`consultaQueFiltra(linhas)`** (lines ~73-90) — the WR-05 mock that APPLIES `.eq/.is/.in` predicates, so deleting a filter in the EF changes the result. Use it for `usuarios_rh` and `candidaturas`.
- Test list to mirror (lines 216-380): 401 no session · 403 candidato · 403 rh **inativo** (`ativo=false`) · 403 `deleted_at` · 403 only another user's live row · 404 rascunho / excluída / ausente · 200 admin · 200 rh ativo.
- New for P52: spy `console.log`/`console.error` and assert the **exact keys** `{candidatura_id, rh_user_id, role}` and that no fixture value (CPF, CEP, e-mail, celular) appears in any call (Pitfall 11); tombstone fixture → `cadastro === null && contato === null`; `@invalido.local` → `contato.email === null`.
- Run line (header): `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/ler-cadastro-candidato-rh`.

---

### `efdeploy.cjs` (config)

**Analog:** same file, lines 44-58. Add the slug to the browser-invoked group — otherwise `node efdeploy.cjs ler-cadastro-candidato-rh` needs `--verify-jwt`:
```js
const VERIFY_JWT = {
  // invocadas pelo navegador com o JWT do usuário
  …
  'get-curriculo-url': true,
  'ler-cadastro-candidato-rh': true,   // P52 — new
```

---

### `supabase/migrations/…_p52_leituras_rh.sql` (3 RPCs SECURITY DEFINER)

**Analog A (function shape):** `20261008000003_p51_fila_tres_origens.sql:444-528` (`ler_contexto_knockout_revisao`) — use it for `ler_contexto_rejeicao_triagem_revisao` almost verbatim:
```sql
CREATE FUNCTION public.ler_contexto_knockout_revisao(p_pedido_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_role    text := (select auth.jwt() #>> '{app_metadata,role}');
  …
BEGIN
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT r.candidatura_id, r.origem, r.opcao_knockout_id
    INTO v_cand, v_origem, v_opcao
    FROM public.revisao_rejeicao r
   WHERE r.id = p_pedido_id;
  IF NOT FOUND OR v_origem IS DISTINCT FROM 'automatica' THEN      -- P52: 'humana_triagem'
    RAISE EXCEPTION 'pedido de revisao de knockout inexistente' USING ERRCODE = 'no_data_found';
  END IF;
  …
  RETURN jsonb_build_object('situacao', 'disponivel', 'pergunta', v_texto, …);
END;
$function$;

REVOKE ALL ON FUNCTION public.ler_contexto_knockout_revisao(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ler_contexto_knockout_revisao(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ler_contexto_knockout_revisao(uuid) TO authenticated;
```
For the triagem variant: justificativa from `historico_candidatura.criterio_texto` joined via `revisao_rejeicao.historico_rejeicao_id`; motivo from `candidaturas.motivo_rejeicao` (A5). Return `{situacao, motivo, justificativa}` by `jsonb_build_object`.

**Analog B (candidatura-keyed read):** `20261005000003_p50_rpcs_leitura_filas.sql:611-671` (`ler_resposta_caso_aberto_sjt`) — the shape for `ler_sjt_mc_rh(p_candidatura_id)` and `ler_devolutiva_bigfive_rh(p_candidatura_id)`:
```sql
  v_role := (select auth.jwt() #>> '{app_metadata,role}');
  v_uid  := (select auth.uid());
  IF v_uid IS NULL OR coalesce(v_role, '') NOT IN ('rh', 'administrador') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_role = 'rh' AND NOT public.is_active_rh_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.candidaturas c WHERE c.id = p_candidatura_id) THEN
    RAISE EXCEPTION 'candidatura % nao encontrada', p_candidatura_id USING ERRCODE = 'no_data_found';
  END IF;
  -- (iii) "state" returns, never a raw row:
  RETURN jsonb_build_object('situacao', 'sem_resposta_enviada', 'texto', NULL);
```
⚠ This analog does **not** filter `deleted_at`/`is_rascunho` (comment line 634). RESEARCH Pattern 1 recommends adding the live-candidatura filter (mirror of `get-curriculo-url` WR-06) — decide and write the reason in the COMMENT.

**Projection rules (from RESEARCH §Contrato):** `ler_devolutiva_bigfive_rh` builds `{situacao, dimensoes:[{dim,banda,texto_interpretativo}], disclaimer_emocional, disclaimer_lgpd_crp}` by explicit `jsonb_build_object` from `conteudo_jsonb` (never `conteudo_jsonb - 'percentil'`); `ler_sjt_mc_rh` emits `tag/peso` **only for the chosen option** and orders alternatives by `md5(o.pergunta_id::text || o.opcao_id::text)` (RESEARCH Code Example 5; D-37), with **no** `status` filter on `perguntas`.

**PRE-PORTÃO** (copy `20261008000003:125-155`): `SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='5s';` then `DO $pre$` refusing if `to_regprocedure('public.is_active_rh_user()') IS NULL` and if each new function **already** exists.

**POS-PORTÃO for a new function** (copy `20261008000003:675-699`):
```sql
  v_oid := pg_catalog.to_regprocedure('public.ler_contexto_knockout_revisao(uuid)');
  SELECT p.prosrc INTO v_src FROM pg_catalog.pg_proc p
   WHERE p.oid = v_oid AND p.prosecdef AND p.provolatile = 's' AND p.proconfig = ARRAY['search_path=""']
     AND pg_catalog.pg_get_function_result(p.oid) = 'jsonb'
     AND pg_catalog.obj_description(p.oid, 'pg_proc') IS NOT NULL;
  IF v_src IS NULL THEN RAISE EXCEPTION '… fora do contrato (DEFINER, STABLE, search_path vazio, jsonb, comentario)'; END IF;
  IF has_function_privilege('anon', v_oid, 'EXECUTE') OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE')
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p, pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
                 WHERE p.oid = v_oid AND a.grantee = 0) THEN
    RAISE EXCEPTION '… ACL fora do contrato';
  END IF;
  v_cod := regexp_replace(v_src, '--[^\n]*', '', 'g');
  IF position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod) = 0
     OR position('IF v_role = ''rh'' AND NOT public.is_active_rh_user() THEN' IN v_cod) > position('FROM public.revisao_rejeicao' IN v_cod) THEN
    RAISE EXCEPTION '… nao checa o helper do rh ANTES da busca (oraculo de existencia)';
  END IF;
```
P52 additions for the POS: `ler_devolutiva_bigfive_rh` source must not contain `percentil`; `ler_sjt_mc_rh` must contain `md5(` in the ORDER BY and must not project the non-chosen `tag`. Evidence appended to a `p52.evidencia` GUC (molde `p51.evidencia`).

**Header + COMMENT ON FUNCTION** (copy the style of `20261008000003:1-123` and `:558-568`): sem `BEGIN/COMMIT` (explained), «APLICAR COM: node p46apply.cjs migrate <arquivo>», comentário de cada função descrevendo guard, retorno e REVOKE nominal de `anon`.

---

### `supabase/tests/p52_leituras_rh_smoke.sql` (smoke per role)

**Analog:** `supabase/tests/p50_acesso_recrutador_smoke.sql` (2210 lines — read by section).

**Refuse outside the rehearsal** (lines 365-376) — rename mark to `p52.tx`:
```sql
DO $p50_so_ensaio$
DECLARE
  v_tx text := coalesce(current_setting('p50.tx', true), '');
BEGIN
  IF v_tx = '' THEN
    RAISE EXCEPTION 'P50C RECUSADO (fora do ensaio): … so roda dentro de scripts/p50_ensaio.cjs …';
  END IF;
  IF v_tx <> txid_current()::text THEN
    RAISE EXCEPTION 'P50C RECUSADO (fora do ensaio): a marca p50.tx (%) nao e desta transacao (%)…', v_tx, txid_current();
  END IF;
END
$p50_so_ensaio$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', false);
SELECT set_config('smoke50.pass', '0', false);
SELECT set_config('smoke50.esperado', '13', false);
```
**Actors read at execution, never by literal UUID** (header lines 19-41 + `$baseline$` from line 387): a_ativo, a_inativo, a_inativo_mp (same role, differs only in `ativo`), a_admin, a_cand. Pick candidaturas **with** devolutiva / `sjt` rows / a `humana_triagem` pedido (Pitfall 5 — population > 0, published as postgres).

**Impersonation per call** (lines 651-690):
```sql
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_ativo::text, 'role', 'authenticated',
              'app_metadata', json_build_object('role', 'rh'))::text, true);
    BEGIN v_b := public.is_active_rh_user(); b_ativo := coalesce(v_b::text, 'null');
    EXCEPTION WHEN OTHERS THEN b_ativo := SQLSTATE || ':' || SQLERRM; END;
```
**`anon` by ACL, not guard** (lines 592-622): `SET LOCAL ROLE anon` must fail with `permission denied for function …`.
**Clause counter:** `PERFORM set_config('smoke50.pass', (current_setting('smoke50.pass')::int + 1)::text, false);` per clause (line 625). Rename to `smoke52.*` and register the pair in `p52_ensaio.cjs`.

---

### `src/features/hub-candidato/services/cadastroCandidatoRhService.ts` (service, EF invoke)

**Analog 1 — invoke:** `src/features/vagas/services/cvUploadService.ts:200-214`:
```ts
export async function getSignedUrl(candidaturaId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-curriculo-url', {
    body: { candidatura_id: candidaturaId },
  })
  if (error || !data?.signedUrl) {
    throw new CVUploadServiceError('Não foi possível gerar URL de download', 'UPLOAD_FAILED', error ?? data)
  }
  return data.signedUrl as string
}
```
**Analog 2 — error class + contract validation that never echoes the value:** `scoresRhService.ts:18-32` and `:224-242`:
```ts
export class ScoresRhServiceError extends Error {
  constructor(message: string, public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED', public details?: unknown) {
    super(message); this.name = 'ScoresRhServiceError'
  }
}
…
  // Valida o contrato antes de entregar à tela … A mensagem NUNCA ecoa o retorno (é texto pessoal do candidato).
  const ret = data as { situacao?: unknown; texto?: unknown } | null
  if (typeof ret !== 'object' || ret === null || Array.isArray(ret) || !isSituacaoRespostaCasoAberto(ret.situacao)) {
    throw new ScoresRhServiceError('Resposta do caso aberto em formato inesperado.', 'DATABASE_ERROR')
  }
```
⚠ For the cadastro service, do **not** pass `error ?? data` as `details` when `data` carries PII — pass only `error`.

---

### `src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts` (hook)

**Analog:** `src/features/hub-candidato/hooks/useHistoricoCandidatura.ts` (whole file, 41 lines):
```ts
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { listHistorico, type HistoricoRow } from '../services/historicoCandidaturaService'

export const historicoKeys = {
  all: ['historico-candidatura'] as const,
  lista: (id: string) => [...historicoKeys.all, 'lista', id] as const,
}
const STALE = 5 * 60 * 1000
export function useHistoricoCandidatura(candidaturaId: string | undefined, options?: …) {
  return useQuery({
    queryKey: historicoKeys.lista(candidaturaId || ''),
    queryFn: () => listHistorico(candidaturaId!),
    enabled: !!candidaturaId,
    staleTime: STALE, gcTime: STALE, retry: 2,
    ...options,
  })
}
```
Key per RESEARCH: `['hub-candidato','cadastro', id]` — the header and the «Cadastro e inscrição» tab share it (one EF call). Error UI needs `refetch` («Recarregar contato»).

---

### `src/features/avaliacao/services/avaliacoesRhService.ts` (service, RPC)

**Analog:** `scoresRhService.ts:195-243` — narrow confined cast until `db:types` is regenerated:
```ts
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: { p_candidatura_id: string },
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
    'ler_resposta_caso_aberto_sjt',
    { p_candidatura_id: candidaturaId },
  )
  if (error) {
    const code = error.code === '42501' ? 'UNAUTHORIZED' : error.code === 'P0002' ? 'NOT_FOUND' : 'DATABASE_ERROR'
    throw new ScoresRhServiceError('Não foi possível carregar a resposta do caso aberto.', code, error)
  }
```
Plus the `as const` situacao list + type guard pattern (lines 171-182). The returned TS types for the Big Five **must not declare `percentil`** (UI-SPEC Invariante 1); compare `BigFiveDimensao` (`scoresRhService.ts:77-82`) which does — do not reuse it.

---

### `src/features/revisao/services/revisaoService.ts` → `lerContextoRejeicaoTriagem` (modify)

**Analog:** same file, lines 414-440 (`lerContextoKnockout`) — strict coercion, every non-`disponivel` shape becomes empty, errors via `classificarErroRevisao`:
```ts
export async function lerContextoKnockout(pedidoId: string): Promise<ContextoKnockout> {
  const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) =>
    Promise<{ data: unknown; error: { message: string; code?: string } | null }>
  )('ler_contexto_knockout_revisao', { p_pedido_id: pedidoId })
  if (error) throw classificarErroRevisao(error)
  const bruto = data !== null && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null
  …
}
export const revisaoService = { …, lerContextoKnockout }   // :443-451 — add the new fn here too
```

### `ContextoRejeicaoTriagemRevisao.tsx` + `ResponderRevisaoDialog.tsx` (modify)

**Analog:** `src/features/revisao/components/ContextoKnockoutRevisao.tsx` (on-demand `useQuery` with `staleTime: 0, gcTime: 0, retry: false`, exported `COPY_*`, text nodes only):
```ts
export const COPY_CONTEXTO_KNOCKOUT = { titulo: …, carregando: …, erro: …, tentarNovamente: 'Tentar novamente' } as const
…
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...revisoesKeys.all, 'contexto-knockout', pedidoId] as const,
    queryFn: () => lerContextoKnockout(pedidoId),
    staleTime: 0, gcTime: 0, retry: false,
  })
```
**Mount point:** `ResponderRevisaoDialog.tsx:350`:
```tsx
        {knockout ? <ContextoKnockoutRevisao pedidoId={linha.pedido_id} /> : null}
```
Add the sibling for `linha.origem === 'humana_triagem'`. Pairs go in the existing context grid (`:321-344`, `grid gap-4 rounded-lg border border-white/15 bg-white/5 p-4 sm:grid-cols-2`) with `sm:col-span-2`; justificativa `text-base whitespace-pre-wrap text-white/90`, never truncated; absent → «Não registrado».

**`MOTIVO_OPTIONS`:** `RejeitarCandidaturaDialog.tsx:55-63` — today `const` (not exported). Change to `export const MOTIVO_OPTIONS` and label via `.find(o => o.value === motivo)?.label ?? motivo`. One map only (UI-SPEC).

---

### `src/features/hub-candidato/components/HubCandidatoRH.tsx` (modify — abas)

**Tabs analog:** `src/features/entrevista/components/EntrevistaWorkspace.tsx:162-176`:
```tsx
        <Tabs value={tab} onValueChange={(v: string) => setTab(v as TabValue)} className="space-y-6">
          <TabsList className="flex h-auto w-fit flex-wrap gap-2 bg-transparent p-0">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="min-h-[44px] rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 data-[state=active]:border-white/30 data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="painel" className="space-y-6"> … </TabsContent>
```
P52 differences (UI-SPEC): `TabsList` = `flex h-auto w-full flex-wrap gap-2 bg-transparent p-0`; `value` from `useSearchParams` (`?aba=`, unknown → `resumo`) with `setSearchParams(…, { replace: true })`; `TabsContent` = `space-y-6 pt-2`.

**Existing structure to redistribute (do not rewrite content):**
- Header `:252-262` (`h1 text-5xl` + etapa chip) → stays outside tabs; add «Vaga: {título}» + `ContatoCandidatoHeader`.
- Resumo: Próximo passo `:287-378`, Linha do funil `:381-415`, Currículo `:420-423`, Análise da IA `:428-432`, Agendamento `:538`, Decisão Final `:541-550`.
- Avaliações: Avaliação assíncrona `:435-445` (contagem **once**; `AvaliacoesRespondidasBloco` `:453-455` leaves), Prova cognitiva `:464-478`, Raven `:485`, Redação + CTA `:493-520`, Entrevista `:523-532`.
- Histórico: `:554-558`.
- Title sizes to `text-2xl`: `:225` (h1 not-found), `:382`, `:421`.
- Rules-of-hooks note `:209-214`: early return stays after every hook — new hooks (`useCadastroCandidatoRh`, `useSearchParams`) go above line 215.
- «Dado vence a etapa» for the async section (D-52-U03): today `estadoDoInstrumento` `:117-125` → add `temDados ⇒ 'com_dados'` regardless of etapa for that section only.

### `HubSection.tsx` (modify) — line 93:
```tsx
      <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">{titulo}</h2>   // → text-2xl
```
(Also `AgendamentoBlock.tsx:99`, same change.) Section wrapper contract `:80-128` (loading/error precedence through `AsyncState`) is what every new hub section uses — never mount `AsyncState` separately.

---

### `ContatoCandidatoHeader.tsx` (new component)

**Analog — neutral button class** (`HubCandidatoRH.tsx:322-328`, Retroceder):
```tsx
className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10"
```
UI-SPEC variant: `gap-2`, `text-white`, rendered as `<a>` (mailto same tab; wa.me `target="_blank" rel="noopener noreferrer"`).
**Analog — «botão que some explica por quê»** (`HubCandidatoRH.tsx:337-343`):
```tsx
                      <p data-testid="hub-acoes-encerrada" className="text-sm text-white/70">
                        Candidatura encerrada — não há ação de funil a tomar.
                      </p>
```
→ «Número fora do formato do WhatsApp — confira o cadastro.»
**Skeleton:** `HubCandidatoRH.tsx:253-254` (`<Skeleton className="h-20 w-full bg-white/5" />`) → `h-10 w-full max-w-md bg-white/5`.
Copy in an exported `COPY_CONTATO` constant (precedent `COPY_AVALIACOES_RESPONDIDAS`, `COPY_CONTEXTO_KNOCKOUT`).

### `src/features/hub-candidato/lib/{contato,formatos,linkify}.ts` (pure utilities)

**Analog for module shape:** `src/features/hub-candidato/lib/instrumentosDaVaga.ts` (+ `lib/__tests__/`), pure, no DOM.
**Analog for validator style:** `src/features/auth/utils/resolveRedirect.ts:35-60` (reject-by-class, early `return fallback`).
Bodies: RESEARCH Code Examples 3 (`normalizarCelularWhatsApp`, `montarLinkWhatsApp`, `montarMailto` with header-injection check) and 4 (URL segments, trailing `.,;:)` outside the link; `javascript:`/`data:` never match).

### `DadosCadastroBloco.tsx` (new)

**Analog — label/value pair as text nodes** (`ContextoKnockoutRevisao.tsx` `Par`):
```tsx
function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="space-y-1">
      <p className={EYEBROW}>{rotulo}</p>
      <p className="whitespace-pre-line text-base text-white">{valor}</p>
    </div>
  )
}
```
UI-SPEC turns it into `<dl className="grid gap-4 sm:grid-cols-2">` / `<dt className="text-sm font-semibold text-white/70">` / `<dd className="text-base text-white/90 leading-relaxed break-words">`; absent → «Não informado» (`text-white/60`). Disponibilidade maps applied on `lower(valor)` (F12).

### `RespostasInscricaoBloco.tsx` (new) + extraction from `FormularioCandidaturaPage.tsx`

**Analog:** `FormularioCandidaturaPage.tsx:81-115` — move to a shared module (e.g. `src/features/vagas/lib/blocosFormulario.ts`) and import from both:
```ts
const ROTULO_BLOCO: Record<string, string> = {
  curriculo: 'Sobre sua experiência',
  jornada: 'Disponibilidade',
  tecnologia: 'Ferramentas e rotina',
  valores: 'Motivação',
}
function rotuloDoBloco(bloco: string): string { return ROTULO_BLOCO[bloco] ?? bloco }
function groupByBloco(perguntas: PerguntaFormulario[]): Map<string, PerguntaFormulario[]> {
  const groups = new Map<string, PerguntaFormulario[]>()
  for (const p of perguntas) {
    const key = p.bloco && p.bloco.trim() ? p.bloco : DEFAULT_BLOCO
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  return groups
}
```
Insertion order = `ORDER BY ordem ASC` — the EF must return questions already ordered. The resposta string assembly mirrors `ler_contexto_knockout_revisao` (`20261008000003:511-517`: `resposta_opcoes` array → joined; else `resposta_texto`; else `resposta_numerica::text`).

**Same file, knockout card (Bloco A, 51-17):** `:538-546` `text-3xl … text-gray-900` / `text-gray-700` / `text-gray-500` → `text-2xl text-white` / `text-white/80` / `text-white/70`; text unchanged (D-15 da 48).

---

### `src/features/avaliacao/lib/bigFiveRotulos.tsx` (extraction)

**Source:** `DevolutivaBigFiveView.tsx:38-85` and `:126-132` — move `DIM_LABEL`, `DIM_ORDER`, `BANDA_LABEL`, `BANDA_ORDER`, `BandaSegments`, `analogia` as named exports; the devolutiva view imports them back (UI-SPEC: one copy).
```tsx
const DIM_LABEL: Record<DevolutivaDashboardRow['dim'], string> = { O: 'Abertura à Experiência', C: 'Conscienciosidade', E: 'Extroversão', A: 'Amabilidade', N: 'Sensibilidade Emocional' }
const DIM_ORDER: DevolutivaDashboardRow['dim'][] = ['O', 'C', 'E', 'A', 'N']
const BANDA_LABEL = { muito_baixo: 'Muito baixo', mod_baixo: 'Moderadamente baixo', medio: 'Médio', mod_alto: 'Moderadamente alto', muito_alto: 'Muito alto' }
function BandaSegments({ banda }: { banda: DevolutivaDashboardRow['banda'] }) {
  const activeIndex = BANDA_ORDER.indexOf(banda)
  return (
    <div className="flex gap-1" aria-hidden="true">
      {BANDA_ORDER.map((b, i) => (
        <div key={b} className={`h-2 flex-1 rounded-full ${i === activeIndex ? 'bg-white/80' : 'bg-white/15'}`} />
      ))}
    </div>
  )
}
```
⚠ Key the types on `banda`/`dim` unions only — `DevolutivaDashboardRow` (`bigfiveService.ts:75-79`) carries `percentil`; define a narrow `BandaBigFive`/`DimBigFive` type so the hub component's input type has no `percentil` field. `analogia` is phrased for the candidate («Você se descreveu…») — for the RH devolutiva view it is the text the candidate saw, which is the UI-SPEC intent.

### `BigFiveResultadoHub.tsx` (new)

**Card shell analog** — `ScorecardAvaliacao.tsx:288-303` (`BigFiveEstado`):
```tsx
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle data-testid="scorecard-bigfive-estado" className="text-white">{COPY_BIG_FIVE_ESTADO[estado]}</CardTitle>
          <Badge className="border-white/15 bg-white/5 text-white/70 text-xs font-semibold">Contextual · não-eliminatório</Badge>
```
(`text-xs` → `text-sm`, per UI-SPEC.) Keep `COPY_BIG_FIVE_ESTADO.nao_fez` (`:276-279`).
**Recolhível analog** — `AvaliacoesRespondidasBloco.tsx:44-78` (`useId` + `aria-expanded` + `aria-controls`, content mounted only when open), **minus** the accent class (UI-SPEC: neutral button).
**Source of bands:** RPC `ler_devolutiva_bigfive_rh` only — never `scores_candidato.metadata.dimensoes` (Invariante 2).

### `SjtMcDetalhe.tsx` (new — replaces `McBreakdown` in the hub)

**Analog:** `ScorecardAvaliacao.tsx:100-149` — keep header/score/`falhou`/`RevisaoHumanaMarker`; replace the `<ul>` of «Item N · tag · peso» (`:129-144`, which shows the raw tag code) with situations from `ler_sjt_mc_rh`. Header pieces to keep:
```tsx
        <CardDescription className="text-white/70">
          {falhou ? ('Pontuação indisponível') : (<>Pontuação: <ScoreValue score={row.score} scoreMax={row.score_max} /></>)}
        </CardDescription>
```
Legend (D-37): «Alternativas em ordem neutra — o candidato as viu embaralhadas.» (⚠ UI-SPEC :508/:604 still say «na ordem do banco» and `pergunta_opcao_metadata` — superseded by D-37; the table is `perguntas_opcao_sjt`.)

### `TextoComCitacoes.tsx` (new) + `RespostaCasoAbertoSjt.tsx` hub variant + `ScorecardAvaliacao` `CasoAbertoBreakdown`

**Analog:** `ScorecardAvaliacao.tsx:235-256` (two-column citações × texto; amber box) and `RespostaCasoAbertoSjt.tsx:47-94` (`RespostaCasoAbertoConteudo`, on-demand, `staleTime: 0, gcTime: 0, retry: false`):
```tsx
  if (data.situacao === 'disponivel' && data.texto) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold">{COPY.titulo}</p>
        <p className="whitespace-pre-line rounded-md bg-black/30 px-3 py-2 text-xs leading-relaxed text-amber-100">{data.texto}</p>
      </div>
    )
  }
```
Hub variant: neutral box `rounded-lg border border-white/15 bg-white/5 p-4`, `text-base text-white/90 whitespace-pre-line`, segments with `<mark className="rounded-sm bg-[#35BFAD]/30 px-1 text-white">`; Decision Final keeps the amber (C-7). Add a prop (e.g. `variante: 'hub' | 'decisao'`) rather than forking the query.

---

### Bloco A — `SairDaProvaButton.tsx` (new)

**Label constants analog** (`SjtMultiplaEscolhaScreen.tsx:122-125`):
```ts
const COPY_NAV = {
  voltarAvaliacoes: 'Voltar às avaliações',
  irAoPainel: 'Ir ao painel',
} as const
```
**Confirm dialog analog** (`SjtMultiplaEscolhaScreen.tsx:272-301`):
```tsx
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <GlassButton variant="white" hover … className="text-white min-h-[44px]">…</GlassButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Enviar avaliação?</AlertDialogTitle>
                  <AlertDialogDescription>Após enviar, você não poderá editar suas respostas.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Revisar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>Enviar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
```
P52: title «Sair da avaliação?», body «Se sair agora, as respostas desta prova não serão salvas.», Cancel «Continuar» (initial focus), Action «Sair» (`bg-[#EF4444] text-white hover:bg-[#EF4444]/90`). Dialog only when ≥1 answer (D-52-U15) — otherwise navigate directly.

**Which screens confirm (D-36, measured):** memory-only state → `SjtMultiplaEscolhaScreen.tsx:143` (`respostas`), `AvaliacaoRavenScreen.tsx:88-94` (`respostas`, `escolha`), `ProvaCognitivaScreen.tsx:75-79` («FX-13: the prova has NO autosave»). Direct exit → the three with `useAutosaveAvaliacao(` (Big Five, Redação, Caso aberto) — **`await flushNow()` first**, because the unmount flush is fire-and-forget:
```ts
// useAutosaveAvaliacao.ts:123-140
  const flushNow = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    await flush()
  }, [flush])
  useEffect(() => () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; void flush() } }, [flush])
```
Destinations: container screens → `navigate(\`/candidato/avaliacao/${candidaturaId}\`)` (`SjtMultiplaEscolhaScreen.tsx:154`); Raven → `'/candidato/dashboard'` with label «Ir ao painel» (`AvaliacaoRavenScreen.tsx:51` `COPY.voltar` already exists).

**Guard that must keep biting:** `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts:38-46`:
```ts
const SCAN_ROOTS = ['src/features/avaliacao', 'src/features/avaliacao-cognitiva'] as const
const ROTULO_ANTIGO = /voltar\s+(ao|para\s+o)\s+painel/i
const VOLTAR_AVALIACOES = 'Voltar às avaliações'
const IR_AO_PAINEL = 'Ir ao painel'
const COMENTARIO = /^\s*(\/\/|\*|\/\*)/
```
Existing behavioral test to extend: `src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx`.

### `SjtMultiplaEscolhaScreen.tsx` — D-26 (line 225, and docblock line 9):
```tsx
            <span>Tempo sugerido: {mmss(seconds)} (sem limite rígido)</span>
// → «Tempo decorrido: {mm:ss} (sem limite de tempo)» + tabular-nums
```

### `AvaliacaoRavenScreen.tsx` — shell

**Shell analog** (`SjtMultiplaEscolhaScreen.tsx:310-323`):
```tsx
function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <BackgroundImage background="gradient" className="min-h-screen py-20" overlayColor="bg-black" overlayOpacity={15}>
        <div className="container mx-auto px-4 max-w-2xl mt-8">{children}</div>
      </BackgroundImage>
    </div>
  )
}
```
Raven uses `max-w-4xl`. Lines to change (grep-verified this session): `:170`, `:186` (`text-slate-900` + `font-bold` h1s in concluded/locked states), `:207` loose `div` (`mx-auto max-w-4xl p-4 sm:p-6`), `:213` eyebrow `text-xs uppercase … text-slate-500`, `:216` `h1 text-lg font-bold`, `:223` (`bg-slate-200` track → `bg-white/20`), `:229` `COPY.semVolta` `text-xs` → `text-sm text-white/70`, `:244-248` template grid `sm:${…}` (not generated by JIT) → literal classes `nOpcoes > 6 ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-6'`. `COPY.subtitulo` (`:41-42`) is currently never rendered — render under the title.

### `AvaliacaoContainer.tsx` + `DashboardCandidatoPage.tsx` (D-27, pendência f)

- `allDone` rule to export as a pure function (`AvaliacaoContainer.tsx:199-200`):
```ts
  const pendentes = cards.filter((c) => statusInfo(c.status).label !== 'Concluído')
  const allDone = cards.length > 0 && pendentes.length === 0
```
- `deriveCards(ctx, status)` at `:410` — export it.
- Query keys to **reuse** in the dashboard so `marcarInstrumentoRegistrado` invalidations apply (`:474-486`): `['avaliacao','context',candidaturaId]` and `['avaliacao','status',candidaturaId]`.
- «Ver devolutiva» button mold = the pending-card CTA (`:315-327`): `GlassButton variant="white" hover … className="w-full mt-4 text-white drop-shadow-sm min-h-[44px]"` → route `/candidato/avaliacao/:candidaturaId/bigfive/devolutiva`; in «Tudo concluído» (`:269-288`) place above the «Ir ao painel» button.
- Dashboard neutral span reused **unedited** (`DashboardCandidatoPage.tsx:476-479`):
```tsx
                            <span className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                              {stepCTA.label}
                            </span>
```
Status badge source: `getStatusInfo` (`:100-110`, `'aguardando_resposta'` → «Aguardando Resposta»). No write to `candidaturas`.

### `CandidatoNavbar.tsx` — «Meu painel»

**Analog:** same file `:103-113`:
```tsx
                <GlassButton variant="white" hover onClick={() => navigate('/candidato/perfil')}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-white drop-shadow-sm"
                  aria-label="Área do candidato">
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Área do candidato</span>
                </GlassButton>
```
Icon `LayoutDashboard`; hide when `useLocation().pathname === '/candidato/dashboard'`; add `min-h-[44px]`.

### `LoginCandidatoPage.tsx` — sessão aberta

**Analog:** same file `:126-130`:
```ts
      const target = resolveRedirect(searchParams.get('redirect'))
      navigate(target, { replace: true })
```
Reuse `resolveRedirect` (`features/auth/utils/resolveRedirect.ts:35`, fallback `'/candidato/dashboard'`) in an effect gated on `authStore` `isLoading`/`isAuthenticated`/`role === 'candidato'`; never a new `startsWith`.

### `select.tsx` — `SelectItem` (lines 129-136)

Remove from the `cn(...)` the strings `hover:bg-white/25 hover:backdrop-blur-md hover:text-white focus:text-white focus:bg-white/25 focus:backdrop-blur-md` and the whole `"[&_*]:hover:text-white [&_*]:focus:text-white [&_*]:hover:!text-white [&_*]:focus:!text-white"` line; add `hover:bg-[#35BFAD]/20 focus:bg-[#35BFAD]/20`. ⚠ The base string also has `focus:bg-accent focus:text-accent-foreground` — decide whether it stays (it forces a text color on focus; UI-SPEC says text inherits). Prove in `RejeitarCandidaturaDialog` and `CandidatosRHPage`.

### `EntrevistaScorecardInline.tsx` — notas 1–5 vazias (D-25 + U12)

**Analog (same file) — the analysis `radiogroup`** (`:155-180`):
```tsx
          <div role="radiogroup" aria-label={SCORECARD_COPY.escolherLegenda} className="flex flex-wrap gap-2">
            {vigentes.map((a) => {
              const ativo = a.id === analiseId
              return (
                <button key={a.id} type="button" role="radio" aria-checked={ativo}
                  onClick={() => { if (!ativo) onEscolherAnalise?.(a.id) }} disabled={saving}
                  className={cn('min-h-[44px] rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                    ativo ? 'border-white/40 bg-white/25 hover:bg-white/30' : 'border-white/20 bg-white/5 hover:bg-white/15')}>
```
**To replace:** initial state from IA `:110-112` (`clampScore(c.ia)`) → `{}`; jargon `:136`; `Slider` block `:187-205`; `disabled` `:236` → add `semNotaFaltante = competencias.some(c => scores[c.key] == null)`; warning paragraph molde `:225-233` (`text-sm text-white/75`, `data-testid`). `Record<string, number>` becomes `Record<string, number | undefined>`; `handleSalvar` must not send undefined keys.

### `RHSidebar.tsx` — `getActivePageFromPath` (lines 106-127)

Closure inside the component → move to a top-level `export function getActivePageFromPath(pathname: string): string`; add `if (pathname.startsWith('/rh/candidato/')) return 'candidatos-rh';` before the fallback (`startsWith('/rh/candidatos')` does not match the singular).

### `ProvenienciaIABadge.tsx` — defeito (b), D-23 / D-52-U17

**Analog:** same file `:60-69` (copy) and `:109-126` (`textoProveniencia`):
```ts
  const modelo = modeloIa ?? PROVENIENCIA_IA_COPY.modeloDesconhecido      // ← the bug: 'Gerado pelo modelo ' + 'modelo não registrado'
  const contingencia = ehResultadoDeContingencia(provedorIa)
  const base = (contingencia ? PROVENIENCIA_IA_COPY.contingencia : PROVENIENCIA_IA_COPY.primario).replace('{modelo}', modelo)
```
Add a whole-sentence branch for `modeloIa == null` and optional `geradoEm?: string | null` (parenthesis only when ≤ 2026-09-22). 7 consumers (AnaliseIABlock, AiLogsPage, exportComparativo PDF, RedacaoReviewPanel, ComparativoScreen, GuiaEntrevistaPanel, TranscricaoReviewPanel) — signature change is additive.

---

### Bloco C — `scripts/geradores/gen-sjt-v2.py` (generator)

**Analog:** `scripts/geradores/gen-sjt-marketing.py` (83 lines) — keep `limpa()` (`:3-11`), `dq()` dollar-quoting (`:17-19`), parser (`:21-50`), hash (`:57`) and emission (`:65-81`). Parameterize what is hard-coded:
```py
src = pathlib.Path('docs/specs/DRAFT-banco-sjt-marketing.md').read_text()   # :13 → argv path (NEW file, never the DRAFT)
assert len(itens)==21, len(itens)                                             # :52 → expected count per cargo (6 mc + 1 caso)
    h = hashlib.sha256((it['cenario']+''.join(o['texto'] for o in it['opcoes'])).encode()).hexdigest()   # :57 keep
```
Emission block to copy (`:65-76`):
```py
WITH novo AS (
  INSERT INTO public.perguntas (tipo, cargo, dimensao_primaria, cenario, formato, tempo_est_min, rubric, content_hash, status)
  SELECT 'sjt', '{cargo}', {dim}, {cenario}, '{formato}', {tempo}, {rub}, '{h}', 'active'
  WHERE NOT EXISTS (SELECT 1 FROM public.perguntas WHERE content_hash = '{h}')
  RETURNING id
)
INSERT INTO public.perguntas_opcao_sjt (pergunta_id, opcao_id, opcao_texto, tag, peso, ordem)
SELECT novo.id, gen_random_uuid(), v.texto, v.tag, v.peso, v.ordem FROM novo, (VALUES …) AS v(texto, tag, peso, ordem);
```
P52 change (D-37/F2): `ordem` assigned by a deterministic permutation seeded by `content_hash` (today `ordem` comes from the table column and 1 = `fortemente_pontua`).

### `scripts/geradores/tabela-comprimento-sjt.py`

Reuse the **same** parser + `limpa()` from the generator (import or shared module), count `len(str)` (code points = Postgres `char_length`), print per item: 4 counts, `fortemente_pontua ÷ mean(others)`, rank of `fortemente_pontua`; per cargo, fraction where it is the longest. `--auto-teste`: a fabricated item with the correct option 2× longer must be flagged. Run with `python3 -I` (no scratch path).

### `supabase/migrations/…_p52_banco_sjt_v2.sql`

**Body analog:** `20260929000001_banco_sjt_marketing.sql` — header narrative `:1-50` (why, size, composition, «GERADO, NÃO TRANSCRITO», «texto puro na tela», «Sem BEGIN/COMMIT», idempotency by `content_hash`), then generated blocks (`:52-66` mc, final caso aberto block).
⚠ That migration has **no PRE/POS gate**. Add them with the shape of `20261010000002:89-176,198-246`: `SET LOCAL lock_timeout/statement_timeout`; PRE refuses if any vaga pointing to the v2 cargos uses `itens_ids`; captures baseline (counts of active items per cargo + the set of ids to retire) in GUCs; retirada = `UPDATE public.perguntas SET status = '<retirado>' WHERE tipo='sjt' AND cargo IN (…) AND status='active' AND content_hash <> ALL (ARRAY[…v2 hashes…])`; POS asserts exactly 6 `mc` + 1 `caso_aberto` active per cargo and retired set = PRE baseline (never a literal count — CLAUDE.md §Portões).

### Bloco D — `supabase/migrations/…_p52_limpeza_dados_teste.sql`

**Body analog:** `supabase/tests/p47_teardown_dados_de_teste.sql` — single `DO`, FK order, `auth.users` double guard, residue = exception:
```sql
  DELETE FROM public.retencao_hold h
   WHERE EXISTS (SELECT 1 FROM public.candidaturas c JOIN public.candidatos ca ON ca.id = c.candidato_id
                  WHERE c.id = h.candidatura_id AND ca.email LIKE ANY (v_padroes));
  GET DIAGNOSTICS n_hold = ROW_COUNT;
  …
  DELETE FROM auth.users u
   WHERE u.email LIKE ANY (v_padroes)
     AND NOT EXISTS (SELECT 1 FROM public.usuarios_rh r WHERE r.user_id = u.id)
     AND NOT EXISTS (SELECT 1 FROM public.candidatos ca WHERE ca.user_id = u.id);
  …
  IF r_cand <> 0 OR r_users <> 0 THEN RAISE EXCEPTION 'P47 TEARDOWN INCOMPLETO — residuo: %…', v_residuo; END IF;
```
⚠ What NOT to copy (F10): the constants `v_esperado_candidatos := 41` / `v_esperado_alvo := 33` (`:101-102`, a photograph), the `'fernando@beautysmile.com.br'` pattern (`:93` — now excluded by the RH trava via `NOT EXISTS usuarios_rh`), and the FK order (`:43-45`) which **lacks `revisao_rejeicao`** (NO ACTION since P51) — read the FK graph at execution. Population = the two-entry varredura (RESEARCH §Bloco D skeleton) with `NOT EXISTS`, never `NOT IN`.

**Gate analog:** `20261010000002_p51_limpa_disponibilidade_anonimizados.sql` — header «⛔ DESTRUTIVA E IRREVERSIVEL», escopo negativo em uma linha (`:1-16`); PRE with «população vazia não prova nada» (`:131-134`), canonical `md5(coalesce(string_agg(x, ',' ORDER BY x), ''))` of the target (`:149-156`), baseline fingerprint of what is **not** target via `to_jsonb` (`:159-166`), GUCs; `$limpa$` with `ROW_COUNT` (`:180-192`); POS (restantes = 0, outros iguais, apagadas = alvo, evidência só contagens/md5) (`:198-246`).

### `52-NN-COMANDO-APPLY.sh` (+ DECISAO.md, POPULACAO.json)

**Analog:** `.planning/phases/51-consertos-da-jornada-bloco-3/51-23-COMANDO-APPLY.sh` (56 lines) — copy the chain verbatim, swapping `SQL`, `MED`, `CMP`, paths and pin:
```bash
rm -f "$AGORA" \
&& { { git ls-files --error-unmatch "$DEC" "$POP" "$SELF" >/dev/null 2>&1 \
       && git diff --quiet HEAD -- "$DEC" "$POP" "$SELF" \
       && git diff --quiet --cached -- "$DEC" "$POP" "$SELF" \
       && git merge-base --is-ancestor "$(git log -1 --format=%H -- "$DEC")" "$PIN" … ; } \
     || { echo "SEM OK DO OPERADOR: …" >&2; false; }; } \
&& node p46apply.cjs sql "$SQL" | node -e "$MED" "$AGORA" \
&& node -e "$CMP" "$AGORA" "$DEC" "$POP" \
&& node scripts/p51_portao.cjs … --modo apply \
&& node p46apply.cjs migrate "$MIG"
```
`$SQL` starts with `set transaction read only;` and is **the same query** as the varredura smoke (line 34 molde). `CMP` refuses with `POPULACAO DIFERE DA APROVADA: …` (line 38). Only counts and md5 printed — no id/name/e-mail (line 21). POPULACAO.json holds ids/categories, no e-mail/name (RESEARCH §Portão).

### Storage removal (Bloco D, after the DB DELETE commits)

**Partial analog:** `supabase/functions/purgar-retencao/index.ts:266-292` (`admin.storage.from(...).list` per prefix, `dividirEmLotes`) and its docblock `:66` «NUNCA APAGAR STORAGE POR SQL» (trigger `protect_objects_delete`). The path list is captured from `candidaturas.curriculo_url` **before** the DELETE and committed with the gate artifacts. Via (EF de uso único vs. script local com chave em memória) = O4, explicit operator OK.

### RH2/RH3 data migration (D-39)

No gated small-UPDATE analog exists; `20260929000002_jorn50_reaponta_sjt_social_media.sql` is a bare `UPDATE` (do **not** copy its lack of gate). Use the PRE/POS frame of `20261010000002`: PRE asserts the current names on the two `usuarios_rh` rows (by `user_id` `af4ebf97…` → «RH2», `66412f96…` → «RH3»; full uuids resolved at plan time) and exactly 2 target rows; `UPDATE … GET DIAGNOSTICS = 2`; POS reads back. `trg_usuarios_rh_anti_lockout` and `update_usuarios_rh_updated_at` are the only triggers (noted in `p50_acesso_recrutador_smoke.sql` header) — a name change does not trip them.

---

### Wave 0 — `scripts/p52_ensaio.cjs` / `scripts/p52_mutacoes.cjs`

**Analog:** `scripts/p51_ensaio.cjs` (548 lines) — copy; change `SENTINELA` (`:92` `'ENSAIO_P51_TERMINOU'`), the `MIGS` list (`:107-113`, `_p51_` files → `_p52_`), the marks in `PREFIXO` (`:129-130` `p51.tx`/`p50.tx` → add `p52.tx`, keep `p50.tx` so legacy smokes re-run), `MESMA_TX` (`:149`), smoke pairs (`:116`) and `capturar()` (`:292`) keys. CLI contract (header `:61-80`): `[--migracoes=… | --sem-migracoes] [--vistas] [--mutacao=x.sql] <arquivo.sql…>`; exits 0/1/3.
`scripts/p51_mutacoes.cjs` — entry shape `{ id, desc, smoke, letra, rotulos?, requer, sql }` (header `:15-27`), table `SMOKES`, `MUTACOES` array from `:254`. P52 mutations (RESEARCH Wave 0): guard without helper, RPC projecting `percentil` / non-chosen `tag`, old SJT item left active, `NOT IN` instead of `NOT EXISTS`.

---

## Shared Patterns

### Authorization: live RH row / helper, before any read
**Sources:** EF `get-curriculo-url/index.ts:107-139`; RPC `20261005000003:624-640`, `20261008000003:465-472`.
**Apply to:** the new EF and all three RPCs. `coalesce(v_role,'') NOT IN (…)` (never bare `NOT IN` — fails open, 42-06) and `is_active_rh_user()` **before** the first `SELECT` of the target (POS asserts position).

### ACL contract for every new function
**Source:** `20261008000003:526-528` + POS `:684-688`.
```sql
REVOKE ALL ON FUNCTION public.<fn>(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.<fn>(uuid) FROM anon;      -- nominal: pg_default_acl grants anon directly
GRANT EXECUTE ON FUNCTION public.<fn>(uuid) TO authenticated;
```

### Projection allowlist (never `select('*')`, never row-minus-key)
**Sources:** `scoresRhService.ts:128-134` (`SCORES_ALLOWLIST`), `get-curriculo-url:91-94` (`CandidaturaRow`), `jsonb_build_object` returns in both RPC analogs.
**Apply to:** EF reads, RPC returns, TS types (no `percentil` field in hub Big Five types).

### Redacted logging
**Source:** `get-curriculo-url/index.ts:204-211`; `cvUploadService.ts:191-193,212` («NEVER log the returned signed URL»).
**Apply to:** EF (log keys `candidatura_id`, `rh_user_id`, `role`), services (`details` never carries PII), gate scripts (counts/md5 only — `51-23-COMANDO-APPLY.sh:21`).

### Service error class + RPC cast + code mapping
**Source:** `scoresRhService.ts:18-32,206-221`; `revisaoService.ts:414-421` (`classificarErroRevisao`).
**Apply to:** `cadastroCandidatoRhService`, `avaliacoesRhService`, `revisaoService` addition. `42501 → UNAUTHORIZED`, `P0002 → NOT_FOUND`. Cast removed in the plan that regenerates `database.types.ts` (`< /dev/null`).

### On-demand sensitive read (no cache after close)
**Source:** `ContextoKnockoutRevisao.tsx` and `RespostaCasoAbertoSjt.tsx:49-55` — `staleTime: 0, gcTime: 0, retry: false`.
**Apply to:** devolutiva text, motivo/justificativa. (The cadastro hook follows the hub standard 5 min / retry 2 — UI-SPEC needs header + tab to share one call; planner to confirm vs. this rule.)

### Exported `COPY_*` constants, text nodes only
**Sources:** `COPY_AVALIACOES_RESPONDIDAS` (`AvaliacoesRespondidasBloco.tsx:30-37`), `COPY_CONTEXTO_KNOCKOUT`, `COPY_NAV`/`COPY` in screens, `PROVENIENCIA_IA_COPY`.
**Apply to:** every new phrase in §Copywriting of the UI-SPEC; no `dangerouslySetInnerHTML`.

### Hub section wrapper
**Source:** `HubSection.tsx:80-128` (loading/error precedence via `AsyncState`, `nao_se_aplica` marker).
**Apply to:** Dados do cadastro, Respostas da inscrição, Avaliação assíncrona.

### Migration file discipline
**Sources:** `20261008000003:119-126` and `20261010000002:89-90`.
`SET LOCAL lock_timeout = '3s'; SET LOCAL statement_timeout = '5s';` as the first two statements; no `BEGIN/COMMIT`; header ends with `APLICAR COM: node p46apply.cjs migrate <arquivo>`; PRE/POS `DO` blocks; evidence appended to a phase GUC; rehearsal by `scripts/p52_ensaio.cjs` before any `migrate`. Comparisons against **baseline captured in the same execution**, never a literal count.

### Smoke refusal + counter
**Source:** `p50_acesso_recrutador_smoke.sql:365-383`.
**Apply to:** `p52_leituras_rh_smoke.sql`, `p52_banco_sjt_smoke.sql`, `p52_populacao_limpeza.sql` (the last is read-only but uses the same pair reporting).

### Vitest harness for the hub
**Source:** `hubVerRespostas.test.tsx:20-40` — `vi.mock('@/lib/supabase/client', () => ({ supabase: {} }))`, `RHLayout` passthrough, `useParams`/`useNavigate` mocked via `importOriginal`, hooks mocked by module path.
**Apply to:** all new hub/component tests (and `useSearchParams` for `?aba=` via `MemoryRouter initialEntries`).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Storage removal step (script or single-use EF) | utility | file-I/O | Only `purgar-retencao` deletes Storage, and it is cron-invoked with its own secret; a one-shot path with an operator-approved list has no precedent (O4). Use RESEARCH §Bloco D Storage + `purgar-retencao:266-292` for the API calls only |
| `scripts/geradores/tabela-comprimento-sjt.py` | utility (gate) | report | No length-table tool exists; reuse the generator's parser (closest piece) |
| RH2/RH3 controlled data migration | migration | CRUD-update | No gated small `UPDATE` migration in the repo; compose from the PRE/POS of `20261010000002` |

## Discrepancies flagged for the planner

1. UI-SPEC `:508` and `:604` («ordem do banco», `pergunta_opcao_metadata`) are superseded by **D-37** (ordem neutra, `perguntas_opcao_sjt`).
2. UI-SPEC `:563` lists «Prova cognitiva» among direct-exit screens — superseded by **D-36** (confirmation). Only Big Five, Redação, Caso aberto exit directly (`grep -rn "useAutosaveAvaliacao(" src` → 3 hits).
3. CONTEXT «Nenhuma tela do RH lê `candidatos.email`/`celular`» is false (F4: `CandidatosRHPage.tsx:398-407`, `KanbanBoard.tsx:302-311`) — residual for SECURITY, not a change.
4. `ler_resposta_caso_aberto_sjt` (analog) has no live-candidatura filter; the new RPCs should decide and document (RESEARCH Pattern 1).
5. `p47_teardown` constants / FK order / admin pattern are photographs (F10) — body only.

## Metadata

**Analog search scope:** `supabase/functions/{get-curriculo-url,purgar-retencao}`, `supabase/migrations/2026092900000{1,2}`, `20261005000003`, `20261008000003`, `20261010000002`, `supabase/tests/{p47_teardown_dados_de_teste,p50_acesso_recrutador_smoke}.sql`, `scripts/{p51_ensaio,p51_mutacoes}.cjs`, `scripts/geradores/`, `p46apply.cjs`, `efdeploy.cjs`, `src/features/{hub-candidato,avaliacao,avaliacao-cognitiva,revisao,triagem,decisao,entrevista,vagas,auth}`, `src/components/{pages,layouts,ui}`, `src/components/RHSidebar.tsx`, `src/__tests__/guards/`, `.planning/phases/51-…/51-23-COMANDO-APPLY.sh`
**Files scanned:** ~45 (all tracked; `git ls-files` checked)
**Pattern extraction date:** 2026-10-10
