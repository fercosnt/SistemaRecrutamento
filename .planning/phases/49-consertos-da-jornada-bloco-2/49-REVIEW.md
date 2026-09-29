---
phase: 49-consertos-da-jornada-bloco-2
reviewed: 2026-09-29T05:51:14Z
depth: standard
files_reviewed: 145
files_reviewed_list:
  - database.types.ts
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/__tests__/genReciboExclusao.test.ts
  - docs/compliance/catalogo-vivo-44.json
  - docs/compliance/export-allowlist.json
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/pii-inventory.md
  - docs/compliance/pii-inventory.yaml
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - docs/specs/DRAFT-banco-sjt-marketing.md
  - docs/specs/SPEC-VISRH-04-portfolio-visivel-rh.md
  - plugins/cadastro-de-vaga/skills/cadastro-de-vaga/scripts/validar-payload.mjs
  - plugins/cadastro-de-vaga/skills/cadastro-de-vaga/tests/provar-portao.mjs
  - scripts/geradores/gen-sjt-marketing.py
  - scripts/p49_12_forma_retroativas.cjs
  - src/components/KanbanBoard.tsx
  - src/components/ScoreCard.tsx
  - src/components/__tests__/KanbanBoard.test.tsx
  - src/components/__tests__/ScoreCard.test.tsx
  - src/components/modals/UpdateStatusModal.tsx
  - src/components/modals/__tests__/UpdateStatusModal.test.tsx
  - src/components/pages/CandidatosRHPage.tsx
  - src/components/pages/ComparativoCandidatosPage.tsx
  - src/components/pages/VagaCandidatosRHPage.tsx
  - src/components/pages/__tests__/ComparativoCandidatosPage.test.tsx
  - src/features/admin/ai-logs/components/AiLogsPage.tsx
  - src/features/admin/ai-logs/components/__tests__/AiLogsPage.test.tsx
  - src/features/admin/ai-logs/services/__tests__/aiLogsService.test.ts
  - src/features/admin/ai-logs/services/aiLogsService.ts
  - src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx
  - src/features/decisao/components/DecisaoFinalPage.tsx
  - src/features/decisao/components/__tests__/DecisaoFinalPage.test.tsx
  - src/features/decisao/services/__tests__/decisaoService.test.ts
  - src/features/decisao/services/decisaoService.ts
  - src/features/entrevista/__tests__/citacoes-render.test.tsx
  - src/features/entrevista/__tests__/entrevista-allowlist.test.ts
  - src/features/entrevista/__tests__/entrevista-contract.test.ts
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
  - src/features/entrevista/components/TranscricaoReviewPanel.tsx
  - src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx
  - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
  - src/features/entrevista/hooks/__tests__/useEntrevistaScorecard.test.ts
  - src/features/entrevista/hooks/useEntrevistaScorecard.ts
  - src/features/entrevista/services/entrevistaService.ts
  - src/features/hub-candidato/components/AnaliseIABlock.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
  - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts
  - src/features/hub-candidato/services/analiseCandidatoService.ts
  - src/features/privacidade/constants/reciboExclusao.generated.ts
  - src/features/triagem/components/ComparativoScreen.tsx
  - src/features/triagem/components/ProvenienciaIABadge.tsx
  - src/features/triagem/components/RedacaoOverrideForm.tsx
  - src/features/triagem/components/RedacaoReviewPanel.tsx
  - src/features/triagem/components/TriagemTable.tsx
  - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
  - src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx
  - src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx
  - src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx
  - src/features/triagem/components/__tests__/TriagemTable.test.tsx
  - src/features/triagem/hooks/useComparativo.ts
  - src/features/triagem/pdf/__tests__/exportComparativo.test.ts
  - src/features/triagem/pdf/exportComparativo.ts
  - src/features/triagem/services/__tests__/revisaoRedacaoService.test.ts
  - src/features/triagem/services/__tests__/triagemService.test.ts
  - src/features/triagem/services/revisaoRedacaoService.ts
  - src/features/triagem/services/triagemService.ts
  - src/features/vagas/services/__tests__/candidaturasService.test.ts
  - src/features/vagas/services/candidaturasService.ts
  - src/features/vagas/types/__tests__/estadosAvaliacao.test.ts
  - src/features/vagas/types/vagasTypes.ts
  - src/lib/candidatura/__tests__/proximaEtapa.test.ts
  - src/lib/candidatura/candidaturaEncerrada.ts
  - src/lib/candidatura/proximaEtapa.ts
  - src/lib/cognitivo/__tests__/cognitivoBanda.test.ts
  - src/lib/cognitivo/cognitivoBanda.ts
  - supabase/functions/_shared/__tests__/ai-client.test.ts
  - supabase/functions/_shared/__tests__/ai-error-codes.test.ts
  - supabase/functions/_shared/__tests__/bars-redacao.test.ts
  - supabase/functions/_shared/__tests__/candidaturaEncerrada.test.ts
  - supabase/functions/_shared/__tests__/injection-detector.test.ts
  - supabase/functions/_shared/__tests__/resultado-de-provedor.test.ts
  - supabase/functions/_shared/__tests__/sjt-rubrica.test.ts
  - supabase/functions/_shared/ai-client.ts
  - supabase/functions/_shared/ai-error-codes.ts
  - supabase/functions/_shared/analise-schemas.ts
  - supabase/functions/_shared/audit-logger.ts
  - supabase/functions/_shared/bars-redacao.ts
  - supabase/functions/_shared/candidaturaEncerrada.ts
  - supabase/functions/_shared/comparativo-config.ts
  - supabase/functions/_shared/entrevista-schemas.ts
  - supabase/functions/_shared/essay-schemas.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/_shared/injection-detector.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/functions/_shared/resultado-de-provedor.ts
  - supabase/functions/_shared/sjt-rubrica.ts
  - supabase/functions/analise-candidato-individual/__tests__/index.test.ts
  - supabase/functions/analise-candidato-individual/index.ts
  - supabase/functions/avaliar-redacao-cultural/index.test.ts
  - supabase/functions/avaliar-redacao-cultural/index.ts
  - supabase/functions/avaliar-redacao/__tests__/index.test.ts
  - supabase/functions/avaliar-redacao/index.ts
  - supabase/functions/avaliar-transcricao-entrevista/__tests__/index.test.ts
  - supabase/functions/avaliar-transcricao-entrevista/index.ts
  - supabase/functions/comparativo-candidatos/__tests__/index.test.ts
  - supabase/functions/comparativo-candidatos/index.ts
  - supabase/functions/gerar-guia-entrevista/_local/merge-preserve.test.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
  - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
  - supabase/functions/notificar-candidato/index.ts
  - supabase/migrations/20260922000001_p49_llm_provider_none.sql
  - supabase/migrations/20260922000002_p49_colunas_proveniencia_e_analise.sql
  - supabase/migrations/20260922000003_p49_trava_encerrada.sql
  - supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql
  - supabase/migrations/20260922000005_p49_comparativo_max_tokens.sql
  - supabase/migrations/20260922000006_p49_snapshot_so_com_mudanca.sql
  - supabase/migrations/20260922000007_p49_analise_entrevista_vigente.sql
  - supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql
  - supabase/migrations/20260922000009_p49_retro_justificativa_grudada.sql
  - supabase/migrations/20260922000011_p49_retro_marca_analises.sql
  - supabase/migrations/20260922000012_p49_motor_logs_e_revisao.sql
  - supabase/migrations/20260922000013_p49_motor_respostas_e_producoes.sql
  - supabase/migrations/20260923000001_p49_motor_respostas_sjt.sql
  - supabase/migrations/20260923000002_p49_motor_desidentifica_analises.sql
  - supabase/migrations/20260929000001_banco_sjt_marketing.sql
  - supabase/migrations/20260929000002_jorn50_reaponta_sjt_social_media.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/tests/p46_purga_smoke.sql
  - supabase/tests/p48_reabertura_smoke.sql
  - supabase/tests/p48_rejeicao_triagem_smoke.sql
  - supabase/tests/p49_12_pos_estado.sql
  - supabase/tests/p49_analise_vigente_smoke.sql
  - supabase/tests/p49_fallback_forcado_desliga.sql
  - supabase/tests/p49_fallback_forcado_liga.sql
  - supabase/tests/p49_motor_antes_depois.sql
  - supabase/tests/p49_prontidao_prod.sql
  - supabase/tests/p49_prova_prod.sql
  - supabase/tests/p49_retroativos_ensaio.sql
  - supabase/tests/p49_snapshot_smoke.sql
  - supabase/tests/p49_trilha_smoke.sql
findings:
  critical: 3
  warning: 13
  info: 6
  total: 22
status: issues_found
---

# Phase 49: Code Review Report

**Reviewed:** 2026-09-29T05:51:14Z
**Depth:** standard
**Files Reviewed:** 145
**Status:** issues_found

## Summary

This review covers the Phase 49 diff (`f92fc810^..HEAD`, 145 files, about 33.7k inserted lines). The scope includes the AI runtime (`ai-client`, `audit-logger`, error vocabulary, injection detector), six Edge Functions, 16 migrations (the p49 migrations and JORN-50), the RH front-end (triagem, comparativo, decisão, entrevista, hub, admin AI logs), the compliance artefacts, the cadastro-de-vaga plugin and the smoke/proof gates. For the four motor migrations of about 2,000 lines each, I read the new steps of the final body (`20260923000002`) closely. I did not trace every line of the intermediate bodies.

Local check: `npx vitest run docs/compliance/__tests__ src/lib src/features/vagas/types` passes (14 files, 149 tests). Nothing was run against PROD.

The three blockers:

1. **The pt-BR injection patterns flag ordinary Portuguese.** `callAi` blocks any input that matches. I ran the phrases through the actual regexes. «Você é uma assistente de dentista há quanto tempo?», «você é um modelo para a equipe», «avaliação de nota máxima», «não ignore as orientações pós-operatórias» and «esqueça o que você leu na internet» all match. Any interview transcript, CV or essay containing one of them gets no AI analysis.
2. **Making fallback results non-replayable opens an audit-erasure path.** The next call with the same idempotency key upserts over the fallback's `ai_call_logs` row. Its cost disappears from the log, the fact that a fallback happened is erased, and any `entrevista_analises.ai_call_log_id` pointing at that row now describes a different call.
3. **Interview analyses can be vigente per `tipo`, but the UI only offers review on the most recent one.** `avancar_etapa` blocks on any vigente flagged analysis. An unconfirmed flag on the older `tipo` therefore blocks the candidate, and the RH screen shows neither the flag nor a way to confirm it. The Avançar button looks enabled.

The warnings group into four themes: guards that match a literal list instead of the structure (legacy fallback codes, SJT key validation), server rules that the UI or copy does not reflect, a server path that bypasses the D-35 lock, and gates that cannot bite. Applied migrations are pinned by md5 in the ledger, so every fix to a migration below has to be a new migration. None of them may edit the applied file.

## Critical Issues

### CR-01: The pt-BR injection patterns flag ordinary Portuguese, so AI evaluation is refused for real candidates

**File:** `supabase/functions/_shared/injection-detector.ts:68-76`

**Issue:** I checked each phrase below against the literal regexes (node run in the scratchpad). Every one matches:

| Text (realistic in this product) | Pattern |
|---|---|
| «Hoje você é uma assistente de dentista há quanto tempo?» (interviewer line in a transcript) | #3 (`:72`), because `assistente` is an allowed target |
| «Minha gestora disse: você é um modelo para a equipe.» | #3 (`modelo`) |
| «Você é uma nova integrante, bem-vinda» | #3 (`nov[oa]`) |
| «Atue como uma assistente de verdade» | #4 (`:74`) |
| «Recebemos avaliação de nota máxima dos pacientes.» | #5 (`:76`): `d[êe]` also matches the preposition **de** |
| «Eu disse ao paciente: não ignore as orientações pós-operatórias.» | #1 (`:68`): `orientações` is an allowed object, and a negated imperative still matches |
| «Falei: esqueça o que você leu na internet» | #2 (`:70`) |

`detectPromptInjection` runs inside `callAi` for all 7 AI EFs. A match writes `provider='none'` and returns the stub. The transcript EF then records the analysis as `falhou`, and the essay goes to `pendente_humano` with no score.

This is a dental clinic that hires *assistentes*. The first pattern hits the interviewer's own standard question in the transcript. The test file's benign set (`injection-detector.test.ts`) covers «Atue como uma consultora», but none of the cases above.

**Fix:** Anchor each pattern to the model as the addressee, and drop the human-role objects:

```ts
// 3 — identity swap directed at the AI, not at a person
/voc[êe]\s+(agora\s+)?[ée]\s+(um|uma)\s+(outr[oa]\s+|nov[oa]\s+)?(IA|intelig[êe]ncia\s+artificial|modelo\s+de\s+linguagem|assistente\s+(de\s+)?IA)\b/i,
// 4 — drop bare `assistente`/`modelo`; require IA/bot/modelo de linguagem
// 5 — exclude the preposition: require the imperative forms only
/\b(d[êe]\s+(a|uma)|atribua|conceda|coloque)\s+(a\s+)?(nota|pontua[çc][ãa]o|score)\s+m[áa]xim/i,
// 1 — require an instruction object that refers to the prompt, e.g. «instruções (anteriores|acima)»
```

Add every row of the table above to `BENIGN_PAYLOADS` before changing the regexes, and watch them fail first.

### CR-02: The upsert on a fallback row's idempotency key erases the fallback's audit row and cost, and rewrites the provenance pointer

**File:** `supabase/functions/_shared/ai-client.ts:1134` (fallback result row written with `idempotency_key: a.idempotency_key`), `:526` (fallback rows are no longer replayed), `supabase/functions/_shared/audit-logger.ts:239-241` (upsert `onConflict: idempotency_key`)

**Issue:** Phase 49 made fallback successes non-replayable. That is the intended behaviour: clicking «Gerar guia» again is how RH asks for Sonnet. The retry, however, computes the same effective key. Its Anthropic success row is written by `logAiCall` as an UPSERT on that key, which overwrites the fallback row in place. Because the upsert does not include `id` or `created_at`, three things follow:

- The fallback's `provider='openai'`, `cost_usd`, `error_code='fallback_…'` and `model_snapshot` are destroyed. Nothing in `ai_call_logs` records that the fallback happened or what it cost. This breaks IA-02 («Toda chamada de IA DEVE ser registrada») and the AI-06 daily sum, and it removes the evidence JORN-28 was built to keep.
- The row keeps its old `id`. Any `entrevista_analises.ai_call_log_id` that pointed at the fallback row now points at a row that describes a different call and provider. This is the D-38 provenance pointer, silently corrupted.
- The row keeps its old `created_at`, so today's Anthropic cost is attributed to the day of the fallback.

`gerar-guia-entrevista` (`{candidatura_id}:{tipo}`) and `avaliar-redacao-cultural` hit this path on the normal retry. `avaliar-transcricao-entrevista` hits it when the same text is re-analysed under the other `tipo`.

**Fix:** Never let a fallback result own the idempotency key. Keep the key only for primary successes:

```ts
// runOpenAIFallback — result row
idempotency_key: null,           // a fallback is an event, not the cacheable answer
// optionally keep the linkage for audit:
raw_response: parsed ?? { usage: response.usage },
// + store the effective key in a non-unique column (new migration) if lookup-by-key is needed
```

Also add a test: fallback, then a successful retry, and assert two rows with distinct `id`s.

### CR-03: Two vigente interview analyses (one per `tipo`) can deadlock the funnel, because the UI only exposes the most recent one

**File:** `src/features/entrevista/components/TranscricaoReviewPanel.tsx:492-494`, `src/features/entrevista/services/entrevistaService.ts:593-624`, `supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql:215`, `supabase/migrations/20260922000008_p49_revisao_entrevista_vigente.sql:160`

**Issue:** `registrar_analise_entrevista` supersedes only within the same `(candidatura, tipo)`, so an online analysis and a presencial analysis can both be vigente. The components disagree about which one matters:

- `avancar_etapa` blocks on **any** vigente analysis with `bloqueio_avanco AND revisao_confirmada_em IS NULL`.
- `TranscricaoReviewPanel` computes `flagFired`/`bloqueado` and offers «Confirmar revisão humana» **only** for `vigenteMaisRecente`. The comment at `:25`, «a única análise que `confirmar_revisao_entrevista` aceita», is wrong: the RPC accepts any vigente analysis by id.
- `salvar_avaliacao_entrevista` writes the human scorecard to the most recent vigente analysis across both tipos (`ORDER BY created_at DESC LIMIT 1`).

A realistic sequence: RH analyses the online transcript while the candidate is already at `entrevista_presencial` (explicitly supported by D-41), and the language/accent flag fires. RH then analyses the presencial transcript. The presencial analysis becomes `vigenteMaisRecente`, so the online flag disappears from the screen and the Avançar CTA renders enabled. `avancar_etapa` then refuses with «bloqueio: revise a bandeira…», and the RH has no path to confirm it. Separately, a scorecard the RH believes belongs to the online interview can land on the presencial analysis.

**Fix:** In the panel, derive the flag from **all** vigentes and render one confirm action per flagged vigente:

```ts
const pendentes = vigentes.filter((a) => a.bloqueio_avanco && !a.revisao_confirmada_em)
const bloqueado = pendentes.length > 0
// render «Confirmar revisão humana» for each item in `pendentes` (onConfirmarRevisao(a.id))
```

Add a new migration that gives `salvar_avaliacao_entrevista` a `p_analise_id` (or `p_tipo`) argument, so the scorecard is bound to the analysis the RH is looking at. The old signature stays until the front ships.

## Warnings

### WR-01: The replay guard lets legacy fallback results through, because it matches the prefix instead of the provider

**File:** `supabase/functions/_shared/ai-client.ts:526`

**Issue:** `ehFallback()` only recognises `fallback_…`. According to `ai-error-codes.ts:53-59`, the 17 legacy fallback rows carry `anthropic_retries_exhausted` (and circuit-open rows carry `anthropic_circuit_open`) with `success=true, provider='openai'`. Those rows are still replayed as if they were primary results, with `fallback_cause: null`.

This is the «lista literal» shape that `resultado-de-provedor.ts` argues against. `AiLogsPage.estadoDaChamada` already treats any success with an `error_code` as a fallback, so the two readers disagree.

**Fix:** `if (ehFallback(existing.error_code) || existing.provider === 'openai') return null;` The provider is the structural signal.

### WR-02: The D-40 short-circuit in the transcript EF makes fallback analyses permanent and superseded analyses unrecoverable

**File:** `supabase/functions/avaliar-transcricao-entrevista/index.ts:283-299`

**Issue:** The reuse lookup runs before `callAi` and matches any non-failed row with the same `texto_hash`. This has two consequences:

- An analysis produced by `gpt-4o-mini` can never be redone for the same text. This contradicts the JORN-28 intent in `ai-client.ts:121-127`, where a retry exists to get the configured model.
- If RH pastes text A, then text B (A becomes superseded), then A again, the EF returns the superseded A with `vigente:false` and changes nothing. There is no way to reinstate it.

**Fix:** Skip the reuse when `provedor_ia = 'openai'`. When the match is superseded, either run the RPC to re-supersede, or say explicitly in the response and copy that it is an older analysis and cannot be reinstated.

### WR-03: The SJT composite silently re-weights when rubric keys are missing or duplicated

**File:** `supabase/functions/avaliar-redacao/index.ts:179-196`

**Issue:** `mapDimensionsToComposite` rejects unknown keys but never checks that every rubric key is present exactly once:

- A duplicated key, e.g. `raciocinio_clinico_estetico` twice, counts its weight twice.
- An omitted key shrinks `weightTotal`.

In both cases the composite looks like a weighted score and the status can be `sucesso`. This is the defect class JORN-35 set out to remove. The essay path has `validarDimensoesRedacao` for exactly this case; the SJT path does not.

**Fix:** After the loop, compare the multiset of returned keys with `chavesValidas`. On a missing or duplicated key, push `dimensao_ausente`/`dimensao_repetida` into `motivosRevisao` and force `pendente_humano`, or refuse to compute the composite at all.

### WR-04: The SJT rubric block sends dentist-case criteria and red flags for every open case, including the live marketing items

**File:** `supabase/functions/_shared/sjt-rubrica.ts:176-245, 371-374`

**Issue:** `DIMENSOES_SJT` is keyed by generic strings and not scoped to a question. `RED_FLAGS_SJT_CASO_ABERTO` («sequência clínica ignorada · desgaste sem indicação») is appended unconditionally.

`20260929000001` created three marketing `caso_aberto` items, with keys such as `raciocinio_editorial` and `narrativa_do_dia`, and `20260929000002` put one of them live on the Social Media vaga. For those items the model receives no criteria at all (the «NÃO tem rótulo, critérios» branch) plus clinical red-flag instructions. A future rubric that reuses a key such as `comunicacao_expectativa` would get the Mariana/Instagram criteria.

**Fix:** Key the catalogue by `pergunta_id` (or by `cargo` plus key). Emit the red-flag section only when the question has a catalogue entry. Add inclusion/exclusion criteria for the marketing rubrics before those vagas receive answers.

### WR-05: The `scores_candidato` INSERT in avaliar-redacao now returns 500 on every retry after a failed row

**File:** `supabase/functions/avaliar-redacao/index.ts:404, 421, 464`

**Issue:** `scores_candidato` has `UNIQUE NULLS NOT DISTINCT (candidatura_id, tipo, subtipo, pergunta_id)`, so all three paths conflict on a second submission. C6 #6 made the INSERT error throw, where before it was swallowed. After a first attempt that wrote `status='falhou'` (timeout, empty result), every retry by the candidate runs the AI call, which is paid, then fails with 23505 and returns 500. The failed row is never replaced.

**Fix:** `.upsert({...}, { onConflict: 'candidatura_id,tipo,subtipo,pergunta_id' })`. Alternatively, pre-check for an existing non-`falhou` row before calling the AI.

### WR-06: `registrar_decisao` sanctions a stage change out of any closed candidatura, which bypasses the D-35 lock and the Art. 20 flow

**File:** `supabase/migrations/20260922000004_p49_trilha_justificativa_e_vigente.sql:429-446` (and `…000003`)

**Issue:** `registrar_decisao` sets `app.transicao_sancionada='decisao'` without checking the current stage or status. An RH who owns the vaga can therefore:

- call it with `aprovado` on a knockout (`inscricao`/`rejeitado`) candidate, or
- flip an `aprovado` decision to `rejeitado` (or the reverse) with `reaberta_em IS NULL`.

Both move a closed candidatura with no revision request. The `avancar_etapa` comment says the sanction is «da TRANSIÇÃO e nunca do DESTINO», but this RPC sanctions every transition.

**Fix:** Add a new migration that refuses when `candidatura_encerrada(OLD)` holds, unless one of these is true: the stored decision has `reaberta_em IS NOT NULL`, or the row is the documented legacy case (`status='finalizado'` at a working stage).

### WR-07: The comparativo EF treats failed or pending analyses as «com análise» and accepts a null result from a provider that did respond

**File:** `supabase/functions/comparativo-candidatos/index.ts:343-370, 485-487`

**Issue:** There are two gaps:

- The analysis read has no `status` filter. A `falhou` or `pendente` row, with `score_match` null and empty arrays, passes the `SEM_ANALISE` check and is ranked from «n/d».
- When the provider responded but `parsed` is null, `ranking = null` is persisted and returned with `ok:true`. `resultado-de-provedor.ts:37-39` states that callers ask both questions; this EF only asks the first.

**Fix:** Add `.eq('status','sucesso')` to the read, or treat non-success analyses as `semAnalise`. When `!bloqueado && result.parsed == null`, return a `SEM_RESULTADO_IA`-style 503 and record it.

### WR-08: The new comparativo refusal messages never reach the screen

**File:** `src/features/triagem/components/ComparativoScreen.tsx:184-189`, `src/features/triagem/services/triagemService.ts:416-432`

**Issue:** `RECUSA_COMPARATIVO_COPY` writes specific messages for `ENCERRADA`, `SEM_ANALISE`, `VALIDATION` and `FORBIDDEN`. `ComparativoScreen` only overrides copy for `MIXED_VAGA`/`SEM_RESULTADO_IA`, and `AsyncState` ignores `error.message`. The RH therefore sees «Verifique a conexão e tente novamente.» with a Retry button for a deterministic refusal, and SEM_ANALISE is the common case.

**Fix:** Map each known code to its copy in `errorCopyOverride`, reusing the `RECUSA_COMPARATIVO_COPY` table (export it). Hide Retry for deterministic refusals.

### WR-09: The finalists list includes soft-deleted and withdrawn candidaturas

**File:** `src/features/decisao/services/decisaoService.ts:248-252`

**Issue:** The new query has no `.is('deleted_at', null)`, unlike every other candidatura list in the codebase (`candidaturasService.ts:381, 618, 733`). Withdrawn candidaturas (`encerrada_a_pedido_em`) also pass `candidaturaEncerrada` by design. Both inflate `finalistIds`, which can push the count past `COMPARATIVO_MAX_CANDIDATOS` and switch off the comparativo, or send ids the RH no longer sees.

**Fix:** Add `.is('deleted_at', null).is('encerrada_a_pedido_em', null)`. Adjust the second filter if withdrawn candidates are meant to stay comparable.

### WR-10: The RNF-07a negation filter lets the most common knockout instruction through

**File:** `plugins/cadastro-de-vaga/skills/cadastro-de-vaga/scripts/validar-payload.mjs:255-261`

**Issue:** The 60-character look-back skips an occurrence whenever the words `não`/`sem`/`nunca` appear earlier in the same clause. I ran the probe: «Se **não** tiver CNH, rejeite o candidato.», «Candidato **sem** experiência: descarte.» and «**Não** hesite em reprovar…» all pass the gate. «Se não tiver X, rejeite» is exactly how an eliminatory requirement gets written, so this gate no longer enforces RNF-07a. `provar-portao.mjs` only mutates with phrases that contain no negation, so the gate stays green.

**Fix:** Skip only when the negation governs the verb directly, e.g. `/\b(nunca|jamais|n[aã]o)\s+(recomende\s+|deve\s+|pode\s+)?$/i` on the text immediately before the verb. Add the three phrases above as mutations in `provar-portao.mjs`.

### WR-11: The retroactive provenance fill used the configured model, not the model that responded

**File:** `supabase/migrations/20260922000011_p49_retro_marca_analises.sql:156`

**Issue:** `modelo_ia` was filled from `ai_call_logs.model_id`, which is the configured alias, with a hard-coded expectation of `'claude-sonnet-4-6'`. The column comment and D-28 define `modelo_ia` as the model that actually responded (`response.model`, i.e. `model_snapshot`). They also say the dated version diverged from the alias in every analysis measured. The five retro-marked rows therefore carry the configured model, which is the exact error the phase set out to remove.

**Fix:** Add a new migration, scoped to the five UUIDs and gated on the current value, that sets `modelo_ia = l.model_snapshot` from the linked `ai_call_log_id`. Do not edit `…000011`, because its md5 is pinned in the ledger.

### WR-12: Several checks in the readiness and proof gates cannot fail, and others compare against a snapshot

**File:** `supabase/tests/p49_prontidao_prod.sql:92-97, 153-167`, `supabase/tests/p49_prova_prod.sql:280-284`

**Issue:** The problems fall into three groups:

- **b05 cannot fail on JORN-17.** It requires `position('etapa_justificativa' IN prosrc) > 0`, but the pre-49 body already reads `NEW.etapa_justificativa`. Losing `NEW.etapa_justificativa := NULL` would leave b05 green.
- **b15 omits phase migrations.** Its literal ledger list leaves out `20260923000002` (the motor that desidentifies analyses) and the two `20260929*` migrations. This is the CLAUDE.md «iteração sobre lista literal» case: the missing object is never checked and the gate stays green. b13 likewise never checks the `desidentificar_analises` step.
- **b14 / p28 compare `max_tokens = 3600` against a constant.** `comparativo-config.ts` says the ceiling and `COMPARATIVO_MAX_CANDIDATOS` move together, but the gate does not read the constant. A legitimate re-tune fails the gate with a misleading diagnosis.

**Fix:**
- b05: search for `etapa_justificativa := NULL`.
- b15: derive the list from `supabase/migrations/2026092[2-9]*` at run time, or at minimum add the three missing versions. Also add a check for the `desidentificar_analises` step.
- b14: state the expected value next to the constant it is coupled to, and have the failure message name both.
- Prove each changed gate fails once, using a mutated body inside the aborting envelope.

### WR-13: Several p49 migrations abort on any database other than PROD as of 2026-09-22

**File:** `supabase/migrations/20260922000002_p49_colunas_proveniencia_e_analise.sql:422` (`IF v_linhas <> 6`), `…000009` and `…000011` (the predicate must equal a literal UUID set), plus the md5 pre-gates in `…000003/4/6/8/12/13`, `20260923000001/2`

**Issue:** On an empty database or a Supabase branch, `…000002` raises «tem 0 linha(s), medido 6». The retroactive migrations raise because `{}` differs from the authorised set. `supabase db reset`, `supabase start` and preview branches can no longer replay the chain. For `…000002` this is also the count-against-constant shape that CLAUDE.md forbids.

**Fix:** The files cannot be edited, because they are md5-pinned. Record the constraint in CLAUDE.md or the migrations README («chain is PROD-only from 20260922000002; use `migration repair` to skip on fresh DBs»), or add a guard for the empty database in any similar future migration, e.g. skip when the table is empty or `current_database()` is not PROD. Use a baseline captured in the run instead of `<> 6` going forward.

## Info

### IN-01: The provenance badge presents unknown provenance as primary, and prints «modelo modelo»

**File:** `src/features/triagem/components/ProvenienciaIABadge.tsx:116-121`

**Issue:** With `provedor_ia` NULL, the badge renders in the neutral (primary) style as «Gerado pelo modelo modelo não registrado». It also appears on essay rows where no model ran at all (injection or cost cap, where `provedor_ia` is NULL), and there it claims generation.

**Fix:** Add a third state for `provedorIa == null`, e.g. «Proveniência não registrada», and skip the badge when the row has no AI content.

### IN-02: The structural predicate is not used where the module docblock says it is

**File:** `supabase/functions/avaliar-redacao/index.ts:417-420`, `supabase/functions/analise-candidato-individual/index.ts:551-555`, `supabase/functions/avaliar-redacao-cultural/index.ts` (the never-absent branch)

**Issue:** These branches still test `error_code === "prompt_injection_detected"`. They are functionally covered by `flagged_for_human_review`, but `resultado-de-provedor.ts` says the question is now written in one place.

**Fix:** Switch them to `!algumProvedorRespondeu(result)`.

### IN-03: The SJT generator's dollar-quote helper corrupts content containing "among"

**File:** `scripts/geradores/gen-sjt-marketing.py:19`

**Issue:** `dq()` calls `.replace('among','')` on the whole string, including the content. Any text containing "among" loses those letters, and the stored text no longer matches its `content_hash`. The migration header (`20260929000001:37`) also cites `scratchpad/gen-sjt.py`, which is not the committed path.

**Fix:** Use `return f'${tag}${s}${tag}$'`.

### IN-04: The comparativo can show an Avançar button that always fails

**File:** `src/components/pages/ComparativoCandidatosPage.tsx:198`

**Issue:** `podeAvancar` returns `true` when `etapa_atual` is unknown, for example on a selection built before the navigation state carried `etapa_atual`. `handleAdvance` then always toasts «Não foi possível identificar a próxima etapa», so the button is offered but always fails.

**Fix:** Return `false` when `etapa_atual` is undefined.

### IN-05: ai-client counts config errors as breaker failures, and ignores attempt-row write errors

**File:** `supabase/functions/_shared/ai-client.ts:~541-553, ~475-498, ~566-592`

**Issue:** Two small problems:

- 4xx configuration errors (400/401/404, including the forced invalid-model window in `p49_fallback_forcado_liga.sql`) are classified as `anthropic_api_error` and call `breaker.recordFailure()`. They are deterministic, not health failures, so they can open the breaker for the isolate.
- The `logAiCall` result for the paid attempt rows is ignored, so a failed write loses the charged attempt silently.

**Fix:** Skip `recordFailure()` for non-retryable 4xx. Call `emitAuditLossAlert` when an attempt-row write fails.

### IN-06: The shape checker only strips whole-line comments

**File:** `scripts/p49_12_forma_retroativas.cjs` (the `codigo()` function)

**Issue:** Only whole-line `--` comments are stripped, so a token that appears in a trailing inline comment (`… ; -- ROW_COUNT`) still satisfies the token checks.

**Fix:** Strip `--` through end-of-line outside string literals.

---

_Reviewed: 2026-09-29T05:51:14Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
