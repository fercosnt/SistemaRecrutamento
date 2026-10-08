---
phase: "51"
slug: "consertos-da-jornada-bloco-3"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-08"
---

# Phase 51 — Validation Strategy

> Contrato de validação por fase, para amostragem de feedback durante a execução.
> Fonte: `51-RESEARCH.md` §«Arquitetura de validação (Nyquist)». Aceite de comportamento =
> consulta no banco (D-51 da 49 / D-28).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unidade/componente) · `deno test` (EFs) · smokes SQL via `node p46apply.cjs run` · Playwright (opcional) |
| **Config file** | `vite.config.ts` (`test.include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`; EFs excluídas) |
| **Quick run command** | `npx vitest run <arquivos tocados> && npm run lint` |
| **Full suite command** | `npm run test:run && npm run lint && deno test supabase/functions` + smokes da onda por `node p46apply.cjs run supabase/tests/<arquivo>.sql` |
| **Estimated runtime** | ~180 seconds (Vitest + lint); smokes ~10–30 s cada |

`npm run lint` = `tsc --noEmit`; baseline medido **89**, teto **90** (D-53 da 49) — sobra 1.

---

## Sampling Rate

- **After every task commit:** `npx vitest run <arquivos>` + `npm run lint` (≤ 90)
- **After every plan wave:** suíte Vitest completa; smokes da onda por `p46apply run`; marcador no chunk certo (`grep -rl "<marcador>" build/assets/`)
- **Before `/gsd-verify-work`:** tudo verde; sessões D-28/D-29 com consulta de aceite; `git log origin/main..HEAD` vazio
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

> Granularidade por requisito até os planos existirem; o planner amarra cada linha a Task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | B | JORN-42 | IDOR / REVISAO-05 | Pedido aceito nas 3 origens, um por rejeição, só `status='rejeitado'`; titular apenas | smoke SQL | `node p46apply.cjs run supabase/tests/p51_revisao_rejeicao_smoke.sql` | ❌ W0 | ⬜ pending |
| TBD | TBD | B | JORN-42 | Elevação (RH inativo) | REVISAO-05 na rejeição pelo RH; qualquer RH ativo no knockout; RH inativo 42501; mutação prova mordência | smoke SQL | idem | ❌ W0 | ⬜ pending |
| TBD | TBD | B | JORN-42 | Repúdio | Procedente reabre em `etapa_rejeitada` / `triagem` (knockout, D-30) com 1 linha de histórico, `em_analise`, prazo SP+10 | smoke + sessão real | consulta `etapa_atual,status` + `count(historico_candidatura)` antes/depois | ❌ W0 | ⬜ pending |
| TBD | TBD | B | JORN-42 / D-03 | — | Knockout revertido não reaplicado; só `submit_candidatura_atomic` grava `knockout_automatico` (asserção por forma) | smoke por forma + sessão D-29 | `select proname from pg_proc where prosrc ~ 'motivo_rejeicao\s*=\s*''knockout_automatico'''` | ❌ W0 | ⬜ pending |
| TBD | TBD | B | JORN-42 | Divulgação | Fila: origem + id de pedido; admin = RH ativo (md5 com desempate); contar inclui as novas | smoke | `p50_acesso_recrutador_smoke.sql` (k) ajustado + novo | parcial | ⬜ pending |
| TBD | TBD | B | JORN-42 | Divulgação (anon/views) | Nada abriu para `anon` nem para candidato alheio (tabela nova, views) | sonda de role | `SET LOCAL ROLE anon/authenticated` por tabela e RPC | ❌ W0 | ⬜ pending |
| TBD | TBD | B | JORN-42 / D-09 | Open redirect | E-mail de rejeição com link `/candidato/explicacao/<id>` só em `rejeitado`; grep-guard verde | deno | `deno test supabase/functions/_shared/__tests__/email-templates.test.ts` | ✅ (acrescentar) | ⬜ pending |
| TBD | TBD | B | JORN-42 | — | Ciclo `decisao_final` intacto | smoke | `p42_revisao_art20`, `p48_reabertura`, `p48_rejeicao_triagem`, `p48_dedupe`, `p49_snapshot`, `oper31` (via `scripts/p50_ensaio.cjs`) | ✅ | ⬜ pending |
| TBD | TBD | B | JORN-42 | LGPD | Motor raspa a resposta do revisor no registro novo; export drift coerente | smoke | `p45_motor_exclusao_smoke.sql` + asserção nova; `p44_export_drift_smoke.sql` | ✅ + acréscimo | ⬜ pending |
| TBD | TBD | B | JORN-42 / D-35 | — | `knockout_rate` conta só knockouts ainda rejeitados | smoke | consulta `funil_kpis(<vaga>)` antes/depois da revertida | ❌ W0 | ⬜ pending |
| TBD | TBD | B | JORN-43 | Divulgação | `get_avaliacao_status(<id>)->'raven'` só booleanos, guarda de titular | smoke + sonda | `p51_raven_status_smoke.sql` (ou caso no smoke acima) | ❌ W0 | ⬜ pending |
| TBD | TBD | A/B | JORN-43 | — | Card visível só com liberação vigente, não concluída, candidatura em andamento | unit + navegador | teste do card no `DashboardCandidatoPage` | ❌ W0 | ⬜ pending |
| TBD | TBD | A | JORN-44 | — | «Ir ao painel» no cabeçalho e no tudo-concluído | unit + navegador | `npx vitest run src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` | ✅ (acrescentar) | ⬜ pending |
| TBD | TBD | A | JORN-45 | — | «Ver respostas» expande o detalhe; filtro `tipo IN ('sjt','big_five')`; texto ao lado das citações; Big Five só «Concluído/Não fez» (D-32) | unit + navegador | `HubCandidatoRH` + `ScorecardAvaliacao.test.tsx` (faixas → D-32) | parcial | ⬜ pending |
| TBD | TBD | A | JORN-46 | — | «Voltar às avaliações» → lista; «Ir ao painel» → dashboard (D-25/D-37) | unit + e2e | guarda de rótulos + `e2e/prova-cognitiva.spec.ts` / `e2e/explicacao-flow.spec.ts` ajustados | parcial | ⬜ pending |
| TBD | TBD | A | JORN-47 | Validação de entrada | Salvar bloqueado com notas vazias; mensagem na tela | unit | `EntrevistaScorecardInline.test.tsx` (`:77` muda) | ✅ (ajustar) | ⬜ pending |
| TBD | TBD | A | JORN-48 | — | Nenhuma superfície diz só «Avaliação cognitiva»; nomes do D-15 (inclui e-mail D-31) | grep test | guarda nova por forma + `forbidden-strings.grep.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | A | JORN-49 | LGPD | Recibo sem «endereço»; «mantém» com estado e faixa (Art. 16, IV); inventário = motor | gerador | `npm run check:recibo-exclusao && npm run check:pii-inventory-md`; `genReciboExclusao.test.ts`, `ReciboExclusao.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/tests/p51_revisao_rejeicao_smoke.sql` — especificação executável escrita ANTES da migration (idioma 42-03, «deliberadamente RED»)
- [ ] `supabase/tests/p51_raven_status_smoke.sql` (ou caso no smoke acima) — `get_avaliacao_status` com chave `raven`, guarda de titular
- [ ] Guarda Vitest de rótulos do D-15 / D-25 / D-37
- [ ] Edição de portões com mordência provada (D-56): `p50_acesso_recrutador_smoke` (k) ORDER BY; testes que asserem ausência de CTA (`ExplicacaoCandidatoPage.test.tsx`, `explicacaoService.test.ts`); `revisaoService` (allowlist `FILA_REVISAO_COLUNAS`); `ScorecardAvaliacao.test.tsx` (faixas); `EntrevistaScorecardInline.test.tsx:77`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sessão real: candidato de teste rejeitado pelo RH pede revisão; RH2 responde procedente; reabre na etapa | JORN-42 (D-28) | Fluxo com dois atores e e-mail reais | Executar no navegador; aceite = consulta `candidaturas` + `historico_candidatura` + registro do pedido |
| Inscrição real de teste cai no knockout → pede → revertida → não cai de novo; análise disparada | JORN-42 (D-29, D-36) | Exige inscrição real em PROD com conta de teste marcada | Executar no navegador; aceite = consulta de estado + `analises_candidato` |
| Telas 43–48 conferidas no navegador; marcador no chunk certo | JORN-43..48 (D-28) | Conferência visual pós-deploy (Vercel) | `grep -rl "<marcador>" build/assets/` + abrir a rota em PROD |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
