---
phase: "49"
slug: "consertos-da-jornada-bloco-2"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-22"
---

# Phase 49 — Validation Strategy

> Contrato de validação da fase, para amostragem de feedback durante a execução.
> Semeado da §«Validation Architecture» do `49-RESEARCH.md`. Os IDs de tarefa são preenchidos
> quando os planos existirem.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (front + `docs/compliance`) · Deno test (EFs) · smokes SQL por `node p46apply.cjs run` · prova por consulta só leitura em PROD (D-51) |
| **Config file** | `vite.config.ts` (vitest), `supabase/functions/deno.json` |
| **Quick run command** | `npx vitest run <paths tocados>` · `deno test --allow-all <arquivos *.test.ts tocados>` (sem `strict-schema.test.ts`, deferred 48-07) |
| **Full suite command** | `npx vitest run` (baseline 205 arquivos / 2068 testes) · `find supabase/functions -name "*.test.ts" \| grep -v strict-schema \| xargs deno test --allow-all` (baseline das EFs tocadas: 411/0) |
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
| TBD | TBD | TBD | JORN-28 | — | truncamento/timeout/schema viram `error_code` próprio; fallback grava duas linhas; replay não esconde fallback; fallback respeita `max_tokens`/`temperature` | unit (Deno) | `deno test --allow-all supabase/functions/_shared/__tests__/ai-client.test.ts supabase/functions/_shared/__tests__/ai-client-budget.test.ts` | ✅ (asserções mudam de propósito) | ⬜ pending |
| TBD | TBD | TBD | JORN-28 | — | proveniência real nas tabelas de resultado | PROD query | `p49_prova_prod.sql` → `p28_resultados_com_modelo` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-28 | — | teto do comparativo e `max_tokens` (D-29) | unit + PROD | `deno test --allow-all supabase/functions/comparativo-candidatos/__tests__/index.test.ts` · `select max_tokens from prompt_versions where call_type='comparative_ranking' and is_active` | ✅ / ❌ | ⬜ pending |
| TBD | TBD | TBD | JORN-28 | — | log do admin mostra estado de fallback e a causa | unit (vitest) | `npx vitest run src/features/admin/ai-logs` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-39 | — | linha `provider='none'` grava; erro de insert não é engolido | unit + PROD | Deno `ai-client.test.ts` · `select count(*) from ai_call_logs where provider='none'` ≥ 1 após injeção de teste | ✅ / ❌ | ⬜ pending |
| TBD | TBD | TBD | JORN-13/38/40 | V8 | ausência nunca vira 0; sem `candidatos(*)`; sem percentil cru | unit (vitest) | `npx vitest run src/components/__tests__/ScoreCard.test.tsx src/features/vagas/services/__tests__/candidaturasService.test.ts` + teste novo do bloco cognitivo | ✅ / ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-07 | — | bloco enviado = constante; tela = constante; `dimension` inválido reprova | unit (Deno + vitest) | `deno test --allow-all supabase/functions/avaliar-redacao-cultural/` · `npx vitest run src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx` | ✅ / ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-35 | — | pesos pela chave; nome inválido não vira peso uniforme | unit (Deno) | `deno test --allow-all supabase/functions/avaliar-redacao/` | ✅ | ⬜ pending |
| TBD | TBD | TBD | JORN-25 | V4 | trava recusa encerrada; reabertura D-01 passa; `avanco` não sai para encerrada | smoke + unit | `node p46apply.cjs run supabase/tests/p49_trilha_smoke.sql` · `node p46apply.cjs run supabase/tests/p48_reabertura_smoke.sql` · Deno `notificar-candidato/__tests__/` | ❌ W0 / ✅ | ⬜ pending |
| TBD | TBD | TBD | JORN-25 | — | seleção sem encerrada; «Avançar» para a próxima etapa real; rótulo por `candidatura_id` | unit (vitest) | `npx vitest run src/features/triagem src/components/pages` | ✅ | ⬜ pending |
| TBD | TBD | TBD | JORN-32 | V4 | IDOR: análise de outra vaga → 403 | unit (Deno) | `deno test --allow-all supabase/functions/comparativo-candidatos/__tests__/index.test.ts` | ✅ | ⬜ pending |
| TBD | TBD | TBD | JORN-33/34 | V4 | Kanban pelo predicado canônico; sem reabrir encerrada só por status | unit (vitest) + smoke | `npx vitest run src/components/__tests__/KanbanBoard.test.tsx src/components/modals/__tests__/UpdateStatusModal.test.tsx` | ✅ | ⬜ pending |
| TBD | TBD | TBD | JORN-12 | V8 | uma vigente por tipo; falha nunca vigente; mesmo texto não cria linha; revisão anterior preservada | unit + smoke + PROD | Deno `avaliar-transcricao-entrevista/` · `node p46apply.cjs run supabase/tests/p49_analise_vigente_smoke.sql` · prova A/B/A | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-17 | — | justificativa limpa depois do histórico; regressão sem texto novo recusada | smoke + PROD | `p49_trilha_smoke.sql` + `p48_rejeicao_triagem_smoke.sql` + `oper31_rejeitar_candidatura_smokes.sql` · `select count(*) from candidaturas where etapa_justificativa is not null` = 0 | ❌ W0 / ✅ | ⬜ pending |
| TBD | TBD | TBD | JORN-3b | — | leitura e UPDATE sem mudança não versionam; colunas do arquivo = colunas da corrente | smoke + PROD | `node p46apply.cjs run supabase/tests/p49_snapshot_smoke.sql` · N recargas → contagem do arquivo inalterada | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-37 | V8 | trilha sem o texto da decisão final | smoke + PROD | `select count(*) from historico_candidatura h … where criterio_texto = justificativa (corrente ou arquivo)` = 0 | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | JORN-36 | V8 | motor apaga cada origem que o recibo promete | smoke | `node p46apply.cjs run supabase/tests/p45_motor_exclusao_smoke.sql` (ampliado; prova de que morde) | ✅ (ampliar) | ⬜ pending |
| TBD | TBD | TBD | D-57 | V8 | toda coluna nova com veredito de export, inventário e recibo | gerador | `npm run -s check:export-allowlist && npm run -s check:pii-inventory-md && npm run -s check:recibo-exclusao && npm run -s check:matriz-retencao && npx vitest run docs/compliance` · `node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p49_trilha_smoke.sql` — JORN-17, JORN-25 (trava, reabertura, decisão), JORN-37
- [ ] `supabase/tests/p49_snapshot_smoke.sql` — JORN-3b (leitura, no-op, colunas iguais, tombstone ainda arquiva)
- [ ] `supabase/tests/p49_analise_vigente_smoke.sql` — JORN-12
- [ ] `supabase/tests/p49_prova_prod.sql` — uma coluna booleana por critério (contrato do `p48_prova_prod.sql`)
- [ ] vitest: painel da redação, bloco cognitivo, `AiLogsPage`, `proximaEtapa`
- [ ] Deno: `bars-redacao` × bloco enviado; SJT por chave; `notificar-candidato` `avanco`/encerrada

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Selo de fallback visível no PDF exportado do comparativo | JORN-28 (D-27b) | render do PDF no navegador | Gerar comparativo por fallback forçado em conta de teste, exportar o PDF e conferir o selo; o critério de banco (`modelo_ia` gravado) é automático |
| Primeira execução real do passo novo do motor | JORN-36 (D-48, D-54) | checkpoint do operador, one-way | Conta de teste; contagem antes/depois por coluna; o operador aprova no momento |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
