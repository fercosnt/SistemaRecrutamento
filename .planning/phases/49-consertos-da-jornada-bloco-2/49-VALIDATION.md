---
phase: "49"
slug: "consertos-da-jornada-bloco-2"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-22"
validated: "2026-09-29"
---

# Phase 49 — Validation Strategy

> Contrato de validação da fase, para amostragem de feedback durante a execução.
> Semeado da §«Validation Architecture» do `49-RESEARCH.md`. Mapa preenchido na auditoria de
> 2026-09-29 (validate-phase, depois dos 29 planos). ✅ = medido nesta auditoria; ✅ᴾ = smoke/prova
> que só roda em PROD — verde **registrado** no SUMMARY do plano, não re-executado aqui.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (front + `docs/compliance`) · Deno test (EFs) · smokes SQL por `node p46apply.cjs run` · prova por consulta só leitura em PROD (D-51) |
| **Config file** | `vite.config.ts` (vitest), `supabase/functions/deno.json` |
| **Quick run command** | `npx vitest run <paths tocados>` · `deno test --allow-all <arquivos *.test.ts tocados>` (sem `strict-schema.test.ts` nem `resend-webhook.test.ts` — pré-existentes, fora de escopo) |
| **Full suite command** | `npx vitest run` (medido 2026-09-29: 217 arquivos / 2321 testes) · `find supabase/functions -name "*.test.ts" \| grep -v strict-schema \| grep -v resend-webhook.test.ts \| xargs deno test --allow-all` (medido 2026-09-29: 45 arquivos, 741/0). ⚠ zsh não divide `$F` — passe listas por `xargs` |
| **Portão tsc (D-53)** | `T=$(mktemp); npm run -s lint >"$T" 2>&1; RC=$?; C=$(grep -c "error TS" "$T"); rm -f "$T"; { [ $RC -eq 0 ] && [ $C -eq 0 ]; } \|\| { [ $RC -eq 2 ] && [ $C -le 90 ]; }` — reprova acima de 90 |
| **Portão git (D-52)** | `test -z "$(git log --oneline origin/main..HEAD)"` depois de todo apply com efeito visível |
| **Estimated runtime** | ~120 s (vitest inteiro) · ~60 s (Deno das EFs tocadas) · smokes: segundos cada |

---

## Sampling Rate

- **After every task commit:** quick run dos arquivos tocados + portão tsc.
- **After every plan wave:** vitest inteiro + Deno das EFs tocadas + smokes da onda (`p46apply run`, envelope que aborta para os que despacham e-mail).
- **Before `/gsd-verify-work`:** tudo verde + `supabase/tests/p49_prova_prod.sql` com todas as colunas `true`.
- **Max feedback latency:** 180 s.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 49-02 | 49-02, 49-25 | 1, 3 | JORN-28 | — | truncamento/timeout/schema viram `error_code` próprio; fallback grava duas linhas; replay não esconde fallback; fallback respeita `max_tokens`/`temperature` | unit (Deno) | `deno test --allow-all supabase/functions/_shared/__tests__/ai-client.test.ts supabase/functions/_shared/__tests__/ai-client-budget.test.ts` | ✅ | ✅ green |
| 49-01 | 49-01, 49-11, 49-18 | 1, 3, 8 | JORN-28 | — | proveniência real nas tabelas de resultado | PROD query | `p49_prova_prod.sql` → `p28_resultados_com_modelo` | ✅ | ✅ᴾ green |
| 49-08 | 49-08, 49-27 | 2, 5 | JORN-28 | — | teto do comparativo e `max_tokens` (D-29) | unit + PROD | `deno test --allow-all supabase/functions/comparativo-candidatos/__tests__/index.test.ts` · `select max_tokens from prompt_versions where call_type='comparative_ranking' and is_active` | ✅ | ✅ green |
| 49-09 | 49-09, 49-15 | 2, 4 | JORN-28 | — | log do admin mostra estado de fallback e a causa | unit (vitest) | `npx vitest run src/features/admin/ai-logs` | ✅ | ✅ green |
| 49-01 | 49-01, 49-02, 49-11 | 1, 3 | JORN-39 | — | linha `provider='none'` grava; erro de insert não é engolido | unit + PROD | Deno `ai-client.test.ts` · `select count(*) from ai_call_logs where provider='none'` ≥ 1 após injeção de teste | ✅ (`p39_linha_none`) | ✅ green · ✅ᴾ |
| 49-04 | 49-04 | 1 | JORN-13/38/40 | V8 | ausência nunca vira 0; sem `candidatos(*)`; sem percentil cru | unit (vitest) | `npx vitest run src/components/__tests__/ScoreCard.test.tsx src/features/vagas/services/__tests__/candidaturasService.test.ts` + teste novo do bloco cognitivo | ✅ (+ `LiberacaoCognitivoBlock`, `cognitivoBanda`, `estadosAvaliacao`) | ✅ green |
| 49-09 | 49-09, 49-15, 49-17 | 2, 4, 7 | JORN-07 | — | bloco enviado = constante; tela = constante; `dimension` inválido reprova | unit (Deno + vitest) | `deno test --allow-all supabase/functions/avaliar-redacao-cultural/` · `npx vitest run src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx` | ✅ (+ `bars-redacao`, `essay-schemas`, `RedacaoReviewPanel`) | ✅ green |
| 49-23 | 49-23 | 2 | JORN-35 | — | pesos pela chave; nome inválido não vira peso uniforme | unit (Deno) | `deno test --allow-all supabase/functions/avaliar-redacao/` | ✅ (+ `_shared/__tests__/sjt-rubrica.test.ts`) | ✅ green |
| 49-03 | 49-03, 49-06 | 1, 2 | JORN-25 | V4 | trava recusa encerrada; reabertura D-01 passa; `avanco` não sai para encerrada | smoke + unit | `node p46apply.cjs run supabase/tests/p49_trilha_smoke.sql` · `node p46apply.cjs run supabase/tests/p48_reabertura_smoke.sql` · Deno `notificar-candidato/__tests__/` | ✅ | ✅ green · ✅ᴾ |
| 49-05 | 49-05, 49-13, 49-22 | 1, 3, 5 | JORN-25 | — | seleção sem encerrada; «Avançar» para a próxima etapa real; rótulo por `candidatura_id` | unit (vitest) | `npx vitest run src/features/triagem src/components/pages` | ✅ | ✅ green |
| 49-08 | 49-08 | 2 | JORN-32 | V4 | IDOR: análise de outra vaga → 403 | unit (Deno) | `deno test --allow-all supabase/functions/comparativo-candidatos/__tests__/index.test.ts` | ✅ | ✅ green |
| 49-05 | 49-05 | 1 | JORN-33/34 | V4 | Kanban pelo predicado canônico; sem reabrir encerrada só por status | unit (vitest) + smoke | `npx vitest run src/components/__tests__/KanbanBoard.test.tsx src/components/modals/__tests__/UpdateStatusModal.test.tsx` | ✅ (+ `proximaEtapa.test.ts`; sem smoke próprio) | ✅ green |
| 49-10 | 49-10, 49-16, 49-26 | 3, 4 | JORN-12 | V8 | uma vigente por tipo; falha nunca vigente; mesmo texto não cria linha; revisão anterior preservada | unit + smoke + PROD | Deno `avaliar-transcricao-entrevista/` · `node p46apply.cjs run supabase/tests/p49_analise_vigente_smoke.sql` · prova A/B/A | ✅ (A/B/A = `p12_aba_a_b_a`) | ✅ green · ✅ᴾ |
| 49-06 | 49-06, 49-12 | 2, 4 | JORN-17 | — | justificativa limpa depois do histórico; regressão sem texto novo recusada | smoke + PROD | `p49_trilha_smoke.sql` + `p48_rejeicao_triagem_smoke.sql` + `oper31_rejeitar_candidatura_smokes.sql` · `select count(*) from candidaturas where etapa_justificativa is not null` = 0 | ✅ (`p17_sem_justificativa_grudada`) | ✅ᴾ green |
| 49-07 | 49-07, 49-28 | 3, 5 | JORN-3b | — | leitura e UPDATE sem mudança não versionam; colunas do arquivo = colunas da corrente | smoke + PROD | `node p46apply.cjs run supabase/tests/p49_snapshot_smoke.sql` · N recargas → contagem do arquivo inalterada | ✅ | ✅ᴾ green |
| 49-06 | 49-06, 49-12 | 2, 4 | JORN-37 | V8 | trilha sem o texto da decisão final | smoke + PROD | `select count(*) from historico_candidatura h … where criterio_texto = justificativa (corrente ou arquivo)` = 0 | ✅ (`p37_trilha_sem_texto_da_decisao`) | ✅ᴾ green |
| 49-14 | 49-14, 49-20, 49-21, 49-29 | 4, 5, 6, 8 | JORN-36 | V8 | motor apaga cada origem que o recibo promete | smoke | `node p46apply.cjs run supabase/tests/p45_motor_exclusao_smoke.sql` (ampliado; prova de que morde) | ✅ (contador 38) | ✅ green (vitest) · ✅ᴾ |
| 49-17 | 49-17 | 7 | D-57 | V8 | toda coluna nova com veredito de export, inventário e recibo | gerador | `npm run -s check:export-allowlist && npm run -s check:pii-inventory-md && npm run -s check:recibo-exclusao && npm run -s check:matriz-retencao && npx vitest run docs/compliance` · `node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` | ✅ | ✅ green (4 checks exit 0) |

*Status: ⬜ pending · ✅ green (medido 2026-09-29) · ✅ᴾ green registrado em PROD · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `supabase/tests/p49_trilha_smoke.sql` — JORN-17, JORN-25 (trava, reabertura, decisão), JORN-37
- [x] `supabase/tests/p49_snapshot_smoke.sql` — JORN-3b (leitura, no-op, colunas iguais, tombstone ainda arquiva)
- [x] `supabase/tests/p49_analise_vigente_smoke.sql` — JORN-12
- [x] `supabase/tests/p49_prova_prod.sql` — uma coluna booleana por critério (contrato do `p48_prova_prod.sql`)
- [x] vitest: painel da redação, bloco cognitivo, `AiLogsPage`, `proximaEtapa`
- [x] Deno: `bars-redacao` × bloco enviado; SJT por chave; `notificar-candidato` `avanco`/encerrada

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Selo de fallback visível no PDF exportado do comparativo | JORN-28 (D-27b) | render do PDF no navegador | Gerar comparativo por fallback forçado em conta de teste, exportar o PDF e conferir o selo; o critério de banco (`modelo_ia` gravado) é automático — ✅ **conferido pelo operador** em 27/09 (49-18) |
| Primeira execução real do passo novo do motor | JORN-36 (D-48, D-54) | checkpoint do operador, one-way | Conta de teste; contagem antes/depois por coluna; o operador aprova no momento — ✅ **feito** 2026-09-27 23:25 −03 (`+claude7`, `p49_motor_antes_depois.sql` 8/8, 49-19) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-29 (validate-phase, hook `verify:post` da cauda da Phase 49)

## Validation Audit 2026-09-29

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Medido nesta auditoria: vitest inteiro **217/2321** verde; Deno **45 arquivos, 741/0** (sem
`strict-schema` e `resend-webhook`, pré-existentes); os 35 arquivos vitest e 20 Deno da fase,
480/480 e 319/0; os 4 `check:*` de compliance com exit 0.

⚠ **Ressalva de proveniência, não de cobertura:** JORN-17, 3b e 37 — e a metade de banco de
JORN-25, 12 e 36 — são vigiados por smokes SQL que só rodam em PROD (`p49_trilha_smoke`,
`p49_snapshot_smoke`, `p49_analise_vigente_smoke`, `p45_motor_exclusao_smoke`) e pela prova
`p49_prova_prod.sql` (21/21 + 8/8 populações, 2026-09-29). Esses verdes estão **registrados**
nos SUMMARYs, não foram re-executados nesta auditoria (auditoria só-leitura; não roda em PROD).

Divergência de plano registrada: o 49-25 PLAN cita `gerar-guia-entrevista/__tests__/index.test.ts`,
que não existe; os testes do handler vivem em `_local/merge-preserve.test.ts` (o SUMMARY registra).
