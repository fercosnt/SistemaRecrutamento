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
| **Full suite command** | `npm run test:run && npm run lint && deno test supabase/functions` + smokes da onda pelo envelope que aborta (`node scripts/p51_ensaio.cjs …`; os só-leitura também por `node p46apply.cjs run supabase/tests/<arquivo>.sql`) |
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

> Amarrado pelo planner em 2026-10-08 (17 planos, 13 ondas). `51-NN-Tk` = Task k do plano 51-NN.
> Revisão 1 do plano (2026-10-08): o portão `scripts/p51_portao.cjs` saiu do 51-08 para o 51-09 (onda 8); o plano do motor foi
> dividido em motor (51-13) e D-57 (51-15); os seguintes foram renumerados (fila 09→10, fila do RH 13→14, portão 14→16, fecho 15→17).
> Revisão 2 do plano (2026-10-08): a mordida do (k) editado do p50 passa a ser provada por MC1a no ramo `decisao_final` (o único
> que o mundo do (k) popula; `revisao_rejeicao` nasce vazia); o ramo novo é provado por MC1b no p51 (l), sobre a fixture da
> própria cláusula. Linhas acrescentadas para as tasks que faltavam no mapa (51-05-T3, 51-06-T2/T3, 51-07-T3, 51-11-T1,
> 51-12-T1/T2, 51-14-T1/T2, 51-15-T1, 51-16-T1/T3, 51-17-T1/T3).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 51-08-T1 | 51-08 | 8 | JORN-42 | IDOR / REVISAO-05 | Pedido aceito nas 3 origens, um por rejeição, só `status='rejeitado'`; titular apenas | smoke SQL | `node scripts/p51_ensaio.cjs --migracoes=… supabase/tests/p51_revisao_rejeicao_smoke.sql` (o smoke escreve: só pelo ensaio que aborta) | ❌ W0 | ⬜ pending |
| 51-08-T1/T2 | 51-08 | 8 | JORN-42 | Elevação (RH inativo) | REVISAO-05 na rejeição pelo RH; qualquer RH ativo no knockout; RH inativo 42501; mutação prova mordência | smoke SQL | idem | ❌ W0 | ⬜ pending |
| 51-08-T1 · 51-17-T2 | 51-08 · 51-17 | 8 · 13 | JORN-42 | Repúdio | Procedente reabre em `etapa_rejeitada` / `triagem` (knockout, D-30) com 1 linha de histórico, `em_analise`, prazo SP+10 | smoke + sessão real | consulta `etapa_atual,status` + `count(historico_candidatura)` antes/depois | ❌ W0 | ⬜ pending |
| 51-08-T1 · 51-17-T2 | 51-08 · 51-17 | 8 · 13 | JORN-42 / D-03 | — | Knockout revertido não reaplicado; só `submit_candidatura_atomic` grava `knockout_automatico` (asserção por forma) | smoke por forma + sessão D-29 | `select proname from pg_proc where prosrc ~ 'motivo_rejeicao\s*=\s*''knockout_automatico'''` | ❌ W0 | ⬜ pending |
| 51-10-T1 · 51-10-T3 | 51-10 | 9 | JORN-42 | Divulgação | Fila: origem + id de pedido; admin = RH ativo (md5 com desempate); contar inclui as novas; mordida do (k) editado por MC1a (ramo `decisao_final`), do ramo novo por MC1b/MC2/MC3 sobre as fixtures de (l)/(m) | smoke + runner | `p50_acesso_recrutador_smoke.sql` (k) ajustado + novo; `node scripts/p51_mutacoes.cjs` | parcial | ⬜ pending |
| 51-08-T1 · 51-16-T2 | 51-08 · 51-16 | 8 · 12 | JORN-42 | Divulgação (anon/views) | Nada abriu para `anon` nem para candidato alheio (tabela nova, views) | sonda de role | `SET LOCAL ROLE anon/authenticated` por tabela e RPC | ❌ W0 | ⬜ pending |
| 51-11-T2 | 51-11 | 9 | JORN-42 / D-09 | Open redirect | E-mail de rejeição com link `/candidato/explicacao/<id>` só em `rejeitado`; grep-guard verde | deno | `deno test supabase/functions/_shared/__tests__/email-templates.test.ts` | ✅ (acrescentar) | ⬜ pending |
| 51-08-T2 · 51-16-T2 | 51-08 · 51-16 | 8 · 12 | JORN-42 | — | Ciclo `decisao_final` intacto | smoke | `p42_revisao_art20`, `p48_reabertura`, `p48_rejeicao_triagem`, `p48_dedupe`, `p49_snapshot`, `oper31` (via `scripts/p51_ensaio.cjs`) | ✅ | ⬜ pending |
| 51-09-T1 · 51-09-T2 | 51-09 | 8 | JORN-42 | Tampering (código sem review em PROD) | Portão recusa sem revisão commitada com `critical: 0`, com código depois da revisão/do pin, com plano alterado ou árvore suja | auto-teste node | `node scripts/p51_portao.cjs --auto-teste` | ❌ W0 | ⬜ pending |
| 51-13-T1 · 51-13-T2 | 51-13 | 10 | JORN-42 | LGPD | Motor raspa a resposta do revisor no registro novo, sem inventar revisão; a purga que chama o motor segue verde | smoke | `p45_motor_exclusao_smoke.sql` + asserção nova e `p46_purga_smoke.sql`, no ensaio com `0002`..`0004` | ✅ + acréscimo | ⬜ pending |
| 51-15-T2 · 51-15-T3 | 51-15 | 11 | JORN-42 | LGPD | Export, recibo e inventário com a tabela nova; drift coerente; portões editados (VALUES, snapshots) mordem | smoke + gerador | `p44_export_drift_smoke.sql` no ensaio; os quatro `check:`; `exportAllowlist.test.ts` | ✅ + acréscimo | ⬜ pending |
| 51-10-T2 | 51-10 | 9 | JORN-42 / D-35 | — | `knockout_rate` conta só knockouts ainda rejeitados | smoke | consulta `funil_kpis(<vaga>)` antes/depois da revertida | ❌ W0 | ⬜ pending |
| 51-06-T1 | 51-06 | 6 | JORN-43 | Divulgação | `get_avaliacao_status(<id>)->'raven'` só booleanos, guarda de titular | smoke + sonda | `p51_raven_status_smoke.sql` (ou caso no smoke acima) | ❌ W0 | ⬜ pending |
| 51-07-T1 | 51-07 | 7 | JORN-43 | — | Card visível só com liberação vigente, não concluída, candidatura em andamento | unit + navegador | teste do card no `DashboardCandidatoPage` | ❌ W0 | ⬜ pending |
| 51-01-T1 | 51-01 | 1 | JORN-44 | — | «Ir ao painel» no cabeçalho e no tudo-concluído | unit + navegador | `npx vitest run src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` | ✅ (acrescentar) | ⬜ pending |
| 51-02-T1 · 51-02-T2 | 51-02 | 2 | JORN-45 | — | «Ver respostas» expande o detalhe; filtro `tipo IN ('sjt','big_five')`; texto ao lado das citações; Big Five só «Concluído/Não fez» (D-32) | unit + navegador | `HubCandidatoRH` + `ScorecardAvaliacao.test.tsx` (faixas → D-32) | parcial | ⬜ pending |
| 51-01-T2 · 51-01-T3 | 51-01 | 1 | JORN-46 | — | «Voltar às avaliações» → lista; «Ir ao painel» → dashboard (D-25/D-37) | unit + e2e | guarda de rótulos + `e2e/prova-cognitiva.spec.ts` / `e2e/explicacao-flow.spec.ts` ajustados | parcial | ⬜ pending |
| 51-04-T1 | 51-04 | 4 | JORN-47 | Validação de entrada | Salvar bloqueado com notas vazias; mensagem na tela | unit | `EntrevistaScorecardInline.test.tsx` (`:77` muda) | ✅ (ajustar) | ⬜ pending |
| 51-03 · 51-04-T2 · 51-07-T2 | 51-03 · 51-04 · 51-07 | 3 · 4 · 7 | JORN-48 | — | Nenhuma superfície diz só «Avaliação cognitiva»; nomes do D-15 (inclui e-mail D-31) | grep test | guarda nova por forma + `forbidden-strings.grep.test.ts` | ❌ W0 | ⬜ pending |
| 51-05-T1 · 51-05-T2 | 51-05 | 5 | JORN-49 | LGPD | Recibo sem «endereço»; «mantém» com estado e faixa (Art. 16, IV); inventário = motor | gerador | `npm run check:recibo-exclusao && npm run check:pii-inventory-md`; `genReciboExclusao.test.ts`, `ReciboExclusao.test.tsx` | ✅ | ⬜ pending |
| 51-05-T3 | 51-05 | 5 | JORN-49 | LGPD | `executar-direito-titular` redeployada com o recibo novo; drift do export aprovado ao vivo; publicação | deploy log + smoke só-leitura | `grep -E 'efdeploy: OK .*status=ACTIVE'` no log; `node p46apply.cjs run supabase/tests/p44_export_drift_smoke.sql` | ✅ | ⬜ pending |
| 51-06-T2 · 51-06-T3 | 51-06 | 6 | JORN-43 | Elevação / Divulgação | Runner da Onda B (CONTROLE + MA1..MA5) morde e nada persiste; apply por `p46apply migrate` com ledger = arquivo; smoke e runner contra os objetos vivos | runner + ensaio | `node scripts/p51_mutacoes.cjs` (linha `controle verde; N/N mutacoes mordem; nada persistiu`) | ❌ W0 | ⬜ pending |
| 51-07-T3 | 51-07 | 7 | JORN-43 | — | `notificar-candidato` redeployada do sha fixado; marcador `raven-candidato-card` servido no chunk `index-*` | deploy log + crawler | `grep -E 'efdeploy: OK .*status=ACTIVE'` no log; `git log --oneline origin/main..HEAD` vazio + crawler | ✅ | ⬜ pending |
| 51-11-T1 | 51-11 | 9 | JORN-42 | Repúdio (desfecho errado no e-mail) | A resposta de revisão de triagem/knockout lê o veredito do PRÓPRIO pedido (`pedido_id`, ou o epoch do `ciclo` no retry); corpo legado continua em `decisao_final`; `pedido_id` não-uuid → 400 sem ler nada | deno | `deno test --allow-all supabase/functions/notificar-candidato/` | ✅ (acrescentar) | ⬜ pending |
| 51-12-T1 | 51-12 | 9 | JORN-42 | Spoofing (origem inferida no cliente) | Knockout com o CTA de revisão; origem lida de `estado_revisao_rejeicao`; `solicitarRevisao` chama a RPC da origem; 42501 → `denied`, P0002 → `unavailable` | unit | `npx vitest run src/features/explicacao` + `npm run lint` (≤ 90) | ✅ (ajustar) | ⬜ pending |
| 51-12-T2 | 51-12 | 9 | JORN-42 | — | Rejeição pelo RH e estados do pedido/reabertura para qualquer origem; casos que asseriam a ausência do CTA trocados, com mordida provada contra `refs/gsd/51-12/base` | unit + e2e condicional | `npx vitest run src/features/explicacao src/__tests__/guards` + `npm run lint` | ✅ (ajustar) | ⬜ pending |
| 51-14-T1 | 51-14 | 10 | JORN-42 | Divulgação (allowlist da fila) | Selo de origem e `pedido_id` na fila do RH; resposta pela RPC da origem; allowlist `FILA_REVISAO_COLUNAS` com as colunas novas e nada além | unit | `npx vitest run src/features/revisao` + `npm run lint` | ✅ (ajustar) | ⬜ pending |
| 51-14-T2 | 51-14 | 10 | JORN-42 / D-11 | — | Diálogo de resposta com pergunta, resposta e opção eliminatória do knockout (`ler_contexto_knockout_revisao`), inclusive o estado «removida»; mordida dos testes trocados contra `refs/gsd/51-14/base` | unit | `npx vitest run src/features/revisao src/__tests__/guards` + `npm run lint` | ✅ (ajustar) | ⬜ pending |
| 51-15-T1 | 51-15 | 11 | JORN-42 | LGPD | Catálogo de `revisao_rejeicao` medido dentro do ensaio; disposição e vereditos do export, inventário e linhas do recibo | smoke + estático | `node scripts/p51_ensaio.cjs --migracoes=…0002… supabase/tests/p51_catalogo_revisao_rejeicao.sql` + conferência estática das fontes | ❌ W0 | ⬜ pending |
| 51-16-T1 | 51-16 | 12 | JORN-42 | Tampering (código sem review em PROD) | Review adversarial `51-REVIEW-PORTAO-N.md` com `critical: 0` e decisão escrita do operador antes de qualquer escrita em PROD | portão node + checkpoint | `node scripts/p51_portao.cjs --revisao … --modo revisao` | ❌ W0 (51-09) | ⬜ pending |
| 51-16-T3 | 51-16 | 12 | JORN-42 | Repúdio (cliente antes da EF) / Tampering (commit alheio) | As três EFs ACTIVE na ordem com dono (`notificar-candidato` primeiro) antes do push; push por sha enumerado; marcadores no chunk certo; `origin/main..HEAD` vazio | deploy log + crawler | `grep -E 'efdeploy: OK .*status=ACTIVE'` nos 3 logs; crawler de `solicitar_revisao_rejeicao` (index) e `fila-origem-badge` (lazy) | ✅ | ⬜ pending |
| 51-17-T1 | 51-17 | 13 | JORN-42 | Divulgação (dado pessoal em log) / Tampering (tipos truncados) | `db:types` sem truncar, `tsc` ≤ 90; sonda de aceite só-leitura recusa sem candidatura e com `--fase` fora do vocabulário (que inclui `reaberta-10min`) | auto-teste node + lint | `node scripts/p51_aceite.cjs --auto-teste` + `npm run lint` | ❌ W0 | ⬜ pending |
| 51-17-T3 | 51-17 | 13 | JORN-42..49 | Tampering (push sem review) | Publicação final por sha enumerado com aceite do operador; remoto = HEAD; telas 43–48 entregues ao `<human-check>` da UAT | git + manual | `git log --oneline origin/main..HEAD` vazio | ✅ | ⬜ pending |

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
