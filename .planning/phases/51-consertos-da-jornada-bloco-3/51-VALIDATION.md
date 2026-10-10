---
phase: "51"
slug: "consertos-da-jornada-bloco-3"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-10-08"
audited: "2026-10-10"
audited_head: "4eb383f8"
---

# Phase 51 — Validation Strategy

> Contrato de validação por fase, para amostragem de feedback durante a execução.
> Fonte: `51-RESEARCH.md` §«Arquitetura de validação (Nyquist)». Aceite de comportamento =
> consulta no banco (D-51 da 49 / D-28).
>
> **Auditoria Nyquist de 2026-10-10** (depois dos 17 planos, do `51-REVIEW.md` e da sessão real
> `51-17-SESSAO-REAL.md`): o mapa abaixo foi reconciliado com o que foi construído e testado. A
> seção nova «Cobertura por requirement» diz, para cada JORN-42..49, o que é coberto por teste
> automatizado, o que só pela sessão real do operador em PROD, e o que é lacuna. **Veredito:
> `nyquist_compliant: false`** — ver «Por que não é compliant».

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unidade/componente) · `deno test` (EFs) · smokes SQL via `node scripts/p51_ensaio.cjs` (ensaio que aborta) · auto-testes node (`p51_portao`, `p51_aceite`) · Playwright (opcional, gated em `E2E_REAL_LOGIN`) |
| **Config file** | `vite.config.ts` (`test.include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`; EFs excluídas) |
| **Quick run command** | `npx vitest run <arquivos tocados> && npm run lint` |
| **Full suite command** | `npm run test:run && npm run lint && deno test --allow-all supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/notificar-candidato/` + `node scripts/p51_portao.cjs --auto-teste && node scripts/p51_aceite.cjs --auto-teste` + smokes da Onda B pelo envelope que aborta (`node scripts/p51_ensaio.cjs …`) e `node scripts/p51_mutacoes.cjs` |
| **Estimated runtime** | Vitest das áreas da fase ~6 s (96 arquivos); deno ~1 s; auto-testes ~2 s; smokes ~1–4 s cada, mais a ida e volta à Management API |

`npm run lint` = `tsc --noEmit`; baseline medido **89**, teto **90** (D-53 da 49). Medido de novo na auditoria: **89**.

⚠ **Os smokes SQL e o runner de mutações não rodam em CI.** Eles só rodam contra o banco de PROD, dentro
de uma transação que aborta (`p51_ensaio.cjs`). A cobertura deles é real, mas é **amostrada por execução
manual** nos planos 51-06/08/10/13/15/16. A auditoria não os executou de novo (restrição: nada em PROD;
a evidência foi lida dos SUMMARYs, com os vereditos literais).

---

## Sampling Rate

- **After every task commit:** `npx vitest run <arquivos>` + `npm run lint` (≤ 90)
- **After every plan wave:** suíte Vitest completa; smokes da onda pelo ensaio que aborta; marcador no chunk certo (`grep -rl "<marcador>" build/assets/`)
- **Before `/gsd-verify-work`:** tudo verde; sessões D-28/D-29 com consulta de aceite; `git log origin/main..HEAD` vazio
- **Max feedback latency:** 180 seconds

---

## Cobertura por requirement (auditoria 2026-10-10)

Legenda: **A** = teste automatizado re-executado nesta auditoria · **E** = automatizado, evidência lida
do SUMMARY (smoke/ensaio/mutação contra PROD, não re-executado) · **S** = só a sessão real do operador em
PROD (`51-17-SESSAO-REAL.md`) · **U** = item de UAT ainda aberto (`<human-check>` do 51-17).

| Req | Automatizado | Sessão real (PROD) | Lacunas | Estado |
|-----|--------------|--------------------|---------|--------|
| **JORN-42** — revisão de toda rejeição | **A:** `explicacaoService.test.ts`, `ExplicacaoCandidatoPage.test.tsx` (origem do servidor, CTA nas 3 origens, 42501/P0002), `revisaoService.test.ts`, `FilaRevisoesTable.test.tsx`, `ResponderRevisaoDialog.test.tsx`; deno `notificar-candidato` + `email-templates` (pedido_id, ciclo/retry, legado, 400, D-09) — 128/128; `p51_portao --auto-teste` 68 casos; `p51_aceite --auto-teste` 203 afirmações. **E:** `p51_revisao_rejeicao_smoke.sql` 18/18 com 0002..0005 (cláusulas a–q, inclusive D-03 por forma (i), fila (l)(m), contexto do knockout (n), KPI (o), prazo (p), D-23 (q)); 9 smokes de regressão do ciclo `decisao_final`; `p45_motor_exclusao` + `p46_purga`; `p44_export_drift`; `p51_catalogo_revisao_rejeicao`; runner **44/44 mutações mordem contra os objetos vivos** (51-16) | **S:** aceite formal das seis fases N/N na candidatura `8e4bb7a0` (knockout 13/13, reaberta 20/20, reaberta-10min 21/21, rejeitada-rh 23/23, reaberta-2 23/23); D-23 recusado em sessão real (passo 6); D-03 também na `3a9254c3` (19/21, as 2 FALHAs são de autor) | (1) **WR-01 do review -3:** o decisor revertido ainda re-rejeita por PATCH direto em `candidaturas` (policy `rh_avanca_etapa`), contornando o D-23 — sem teste e sem conserto; (2) **WR-02 do -3:** o filtro `h.decisao = 'rejeitado'` do ramo arquivo de `rejeitar_candidatura` não tem mutação nem sonda; (3) **WINDOWS 93:** pedido de `revisao_rejeicao` não respondido sobrevive à exclusão e o recibo não diz que fica; (4) **IN-06 do 51-REVIEW:** a sonda de aceite fabrica as claims de papel — a regra do servidor está provada sob claims sintéticas, o papel real só pela sessão; (5) e2e EX-04 nunca rodou (gated) e EX-02/EX-03 procuram rótulos aposentados (`deferred-items.md`) | **PARCIAL** — comportamento provado (automatizado + PROD); 1 contorno de segurança aberto (WR-01) e 2 portões sem mordida |
| **JORN-43** — porta de entrada do Raven | **A:** `RavenCandidatoCard.test.tsx` (9), `DashboardCandidatoPage.funnel/encerrada`, `avaliacaoService.funil.test.ts` (raven só booleanos), `ravenService.status.test.ts`, `AvaliacaoRavenScreen.conclusao.test.tsx`. **E:** `p51_raven_status_smoke.sql` 7/7 + `funil12_status_rpc_smoke`; runner MA1..MA6 mordem | **S:** fase `raven` 4/4 (`liberado=true registrado=false`, e-mail `avaliacao_cognitiva_liberada` entregue); card visto no painel pelo operador | O ramo «concluiu → o card some, `registrado=true`» só tem prova de unidade: o operador não fez a prova em PROD (opcional, decisão dele) | **COBERTO** |
| **JORN-44** — volta ao painel na lista | **A:** `AvaliacaoContainer.test.tsx` (cabeçalho, tudo-concluído, WrongEtapaState, sem `onBackToPanel` não renderiza botão), `wait-state-copy.grep.test.ts` | — | **U:** conferência visual (posição no cabeçalho em 320 px) | **COBERTO** (visual em UAT) |
| **JORN-45** — «Ver respostas» no hub | **A:** `hubVerRespostas.test.tsx` (filtro sjt+big_five, montagem só após clique, aria), `ScorecardAvaliacao.test.tsx` (Big Five só «Concluído/Não fez», texto literal ao lado das citações, sem HTML) | — | **IN-03:** «Não fez» aparece também para Big Five em andamento ou não aplicado (inferência por ausência; `info`, aberto); **IN-02:** contagem repetida; **U:** leitura visual | **COBERTO** (2 infos abertos) |
| **JORN-46** — destino dos botões das provas | **A:** `navegacao-provas.test.tsx` e `navegacao-cognitiva.test.tsx` (rota-sentinela real), `rotulos-navegacao-candidato.grep.test.ts` | — | (1) **WR-01 do 51-REVIEW (ESCALADO):** o conserto mudou «Prova registrada» para voltar à lista, que abre do cache com a prova cognitiva ainda «Começar avaliação»; refazer sobrescreve score e banda (`pontuar_cognitivo` faz upsert; medido em PROD só leitura). Defeito de implementação, nenhum teste o cobre; (2) **IN-05:** o guarda confere rótulo, não destino (os testes de tela cobrem as telas de hoje); (3) **IN-04:** cópia «acompanhe pelo painel» acima de botão que vai à lista; (4) `e2e/prova-cognitiva.spec.ts` editado e nunca rodado | **PARCIAL** — destinos provados; regressão WR-01 aberta. **Conserto publicado (51-18 → 51-24, 2026-10-10):** a conclusão vai ao cache da lista no sucesso do envio (4 telas, tracer da tela à lista real, RED na base); servidor em backlog `(51-18)`. Estado a reavaliar pelo `/gsd-validate-phase 51` |
| **JORN-47** — notas obrigatórias | **A:** `EntrevistaScorecardInline.test.tsx` (vazio/espaços bloqueiam, mensagem `entrevista-notas-obrigatorias`, required). **E:** leitura só-leitura das sobrecargas de `salvar_avaliacao_entrevista` (servidor recusa vazio; `trim()` ≥ `btrim`) | — | **U:** leitura da mensagem no workspace real | **COBERTO** |
| **JORN-48** — instrumentos distinguíveis | **A:** `nomes-instrumentos.grep.test.ts` (41 casos: nomes aposentados banidos em `src/` e `supabase/functions`), `hubEmptyState.test.tsx` («Prova cognitiva», «Não se aplica»), `instrumentosDaVaga.test.ts`, `exportacaoService.test.ts` (p5), `AvaliacaoContainer.test.tsx`; deno `email-templates` (D-31). **Acrescentados nesta auditoria:** render do bloco do Raven no hub, da célula «Matrizes» do `ScoreCard` e do título do `CognitivoBandCard` (ver «Testes acrescentados») | **S:** e-mail com «O Raciocínio lógico (Matrizes) foi liberado para você» (D-31) e card do painel com o nome | **Achado da auditoria:** o (ii) do guarda trata `{/* … */}` como código — a linha 71 do `LiberacaoCognitivoBlock` é um comentário JSX com o nome novo, e trocar o título visível por um nome não aposentado deixava (i) e (ii) verdes (medido). Fechado pelos testes de render acrescentados, não pelo guarda. **U:** leitura das duas seções lado a lado no hub | **COBERTO** (após os 3 testes acrescentados) |
| **JORN-49** — recibo não promete mais do que faz | **A:** `genReciboExclusao.test.ts` (14)(15)(16), `ReciboExclusao.test.tsx` (r10)(r11)(r12); os quatro `check:` (`recibo-exclusao`, `pii-inventory-md`, `export-allowlist`, `matriz-retencao`). **E:** `p44_export_drift_smoke` `n_drift=0`; EFs redeployadas | — | (1) **WINDOWS 89 (ESCALADO):** o recibo continua prometendo apagar a `disponibilidade` (`recibo-exclusao.json:319-328`) e nenhuma migration apaga ou atualiza `public.disponibilidade` (conferido no repositório; em PROD, 2 de 2 titulares anonimizados mantêm a linha — 51-05); (2) **WR-02 do 51-REVIEW (ESCALADO):** o recibo diz que a UF fica «para relatório agregado», e `gerar_bias_snapshot` não lê `estado` (medido em PROD só leitura pelo revisor); (3) **U:** prévia do recibo na tela | **NÃO ATENDIDO NO TODO** — a letra do defeito 9 («endereço» e «mantém» estado/faixa) está coberta e testada; o espírito do requirement («não promete mais do que faz») tem duas promessas sem executor/finalidade. **Conserto publicado (51-19..51-24, 2026-10-10):** o motor apaga a `disponibilidade` e a que sobrou foi limpa (0 de 2 anonimizados com linha); a UF diz a razão real (texto aprovado pelo operador, `executar-direito-titular` v15). Estado a reavaliar pelo `/gsd-validate-phase 51` |

### Por que não é compliant

`nyquist_compliant: false` porque três requirements têm comportamento exigido **sem teste que o prove
e sem implementação que o cumpra**, e a correção é de implementação ou de texto ao titular — fora do
alcance desta auditoria (arquivos de implementação são somente leitura; decisão do operador):

1. **JORN-49** — WINDOWS 89 (`disponibilidade`) e WR-02 (finalidade da UF). O recibo é documento legal
   ao titular; as duas promessas são falsas hoje.
2. **JORN-46** — WR-01 do `51-REVIEW.md`: o caminho padrão pós-envio da prova cognitiva permite refazer
   a prova e sobrescrever a banda que o RH vê.
3. **JORN-42** — WR-01 do review -3: contorno do D-23 por PATCH direto; e WR-02 do -3 sem mordida.

Além disso, toda a cobertura do banco (smokes e mutações) é amostrada por execução manual contra PROD e
não roda em CI — isso não reprova o Nyquist sozinho, mas é registrado como ⚠ abaixo.

---

## Per-Task Verification Map

> Amarrado pelo planner em 2026-10-08 (17 planos, 13 ondas). `51-NN-Tk` = Task k do plano 51-NN.
> Revisão 1 do plano (2026-10-08): o portão `scripts/p51_portao.cjs` saiu do 51-08 para o 51-09 (onda 8); o plano do motor foi
> dividido em motor (51-13) e D-57 (51-15); os seguintes foram renumerados (fila 09→10, fila do RH 13→14, portão 14→16, fecho 15→17).
> Revisão 2 do plano (2026-10-08): a mordida do (k) editado do p50 passa a ser provada por MC1a no ramo `decisao_final` (o único
> que o mundo do (k) popula; `revisao_rejeicao` nasce vazia); o ramo novo é provado por MC1b no p51 (l), sobre a fixture da
> própria cláusula. Linhas acrescentadas para as tasks que faltavam no mapa (51-05-T3, 51-06-T2/T3, 51-07-T3, 51-11-T1,
> 51-12-T1/T2, 51-14-T1/T2, 51-15-T1, 51-16-T1/T3, 51-17-T1/T3).
>
> **Auditoria 2026-10-10:** colunas «File Exists» e «Status» preenchidas. ✅ = verde; «(A)» re-executado na
> auditoria, «(E)» evidência lida do SUMMARY. ⚠️ = verde com ressalva escrita na própria linha.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 51-08-T1 | 51-08 | 8 | JORN-42 | IDOR / REVISAO-05 | Pedido aceito nas 3 origens, um por rejeição, só `status='rejeitado'`; titular apenas | smoke SQL | `node scripts/p51_ensaio.cjs --migracoes=… supabase/tests/p51_revisao_rejeicao_smoke.sql` (o smoke escreve: só pelo ensaio que aborta) | ✅ | ✅ (E) 51-08: `51b=12/12`; 51-16 com 0002..0005: `51b=18/18`, `vistas=igual` |
| 51-08-T1/T2 | 51-08 | 8 | JORN-42 | Elevação (RH inativo) | REVISAO-05 na rejeição pelo RH; qualquer RH ativo no knockout; RH inativo 42501; mutação prova mordência | smoke SQL | idem + `node scripts/p51_mutacoes.cjs` | ✅ | ✅ (E) 20/20 (51-08) → 44/44 contra os objetos vivos (51-16) |
| 51-08-T1 · 51-17-T2 | 51-08 · 51-17 | 8 · 13 | JORN-42 | Repúdio | Procedente reabre em `etapa_rejeitada` / `triagem` (knockout, D-30) com 1 linha de histórico, `em_analise`, prazo SP+10 | smoke + sessão real | smoke (f)(h)(i) + `node scripts/p51_aceite.cjs <id> --fase reaberta|reaberta-2` | ✅ | ✅ (E) smoke verde; (S) `reaberta` 20/20, `reaberta-2` 23/23 na `8e4bb7a0` |
| 51-08-T1 · 51-17-T2 | 51-08 · 51-17 | 8 · 13 | JORN-42 / D-03 | — | Knockout revertido não reaplicado; só `submit_candidatura_atomic` grava `knockout_automatico` (asserção por forma) | smoke por forma + sessão D-29 | smoke (i) (conjunto por forma, MB9 morde) + `--fase reaberta-10min` | ✅ | ✅ (E) (i) + MB9; (S) 21/21 aos 619 s na `8e4bb7a0`, 19/21 aos 601 s na `3a9254c3` (FALHAs só de autor) |
| 51-10-T1 · 51-10-T3 | 51-10 | 9 | JORN-42 | Divulgação | Fila: origem + id de pedido; admin = RH ativo (md5 com desempate); contar inclui as novas; mordida do (k) editado por MC1a (ramo `decisao_final`), do ramo novo por MC1b/MC2/MC3 sobre as fixtures de (l)/(m) | smoke + runner | `p50_acesso_recrutador_smoke.sql` (k) ajustado + novo; `node scripts/p51_mutacoes.cjs` | ✅ | ✅ (E) `51b.l`, `51b.m`, p50 13/13; MC1a→P50C FAIL (k), MC1b/MC2/MC3 mordem |
| 51-08-T1 · 51-16-T2 | 51-08 · 51-16 | 8 · 12 | JORN-42 | Divulgação (anon/views) | Nada abriu para `anon` nem para candidato alheio (tabela nova, views) | sonda de role | smoke (a)(c)(k) + `--vistas`; sonda anon do schema cache (51-16) | ✅ | ✅ (E) `vistas=igual`; anon → 42501, controle → PGRST202. ⚠️ IN-16 do review -1 (pré-existente): `solicitar_revisao_decisao` segue com EXECUTE para `anon` |
| 51-11-T2 | 51-11 | 9 | JORN-42 / D-09 | Open redirect | E-mail de rejeição com link `/candidato/explicacao/<id>` só em `rejeitado`; grep-guard verde | deno | `deno test --allow-all supabase/functions/_shared/__tests__/email-templates.test.ts` | ✅ | ✅ (A) 128 passed (com o diretório da EF); (S) parágrafo e botão confirmados pelo operador |
| 51-08-T2 · 51-16-T2 | 51-08 · 51-16 | 8 · 12 | JORN-42 | — | Ciclo `decisao_final` intacto | smoke | `p42_revisao_art20`, `p48_reabertura`, `p48_rejeicao_triagem`, `p48_dedupe`, `p49_snapshot`, `oper31` (via `scripts/p51_ensaio.cjs`) | ✅ | ✅ (E) 9/9 ENSAIO VERDE (51-08); 13 legados verdes depois do apply (51-16) |
| 51-09-T1 · 51-09-T2 | 51-09 | 8 | JORN-42 | Tampering (código sem review em PROD) | Portão recusa sem revisão commitada com `critical: 0`, com código depois da revisão/do pin, com plano alterado ou árvore suja | auto-teste node | `node scripts/p51_portao.cjs --auto-teste` | ✅ | ✅ (A) `auto-teste ok: 68 casos` (o SUMMARY registrou 58; cresceu nas rodadas de conserto) |
| 51-13-T1 · 51-13-T2 | 51-13 | 10 | JORN-42 | LGPD | Motor raspa a resposta do revisor no registro novo, sem inventar revisão; a purga que chama o motor segue verde | smoke | `p45_motor_exclusao_smoke.sql` + asserção nova e `p46_purga_smoke.sql`, no ensaio com `0002`..`0004` | ✅ | ✅ (E) ENSAIO VERDE; MD1/MD2 mordem (31/31); (C3/ix) vermelho registrado antes do re-pin |
| 51-15-T2 · 51-15-T3 | 51-15 | 11 | JORN-42 | LGPD | Export, recibo e inventário com a tabela nova; drift coerente; portões editados (VALUES, snapshots) mordem | smoke + gerador | `p44_export_drift_smoke.sql` no ensaio; os quatro `check:`; `exportAllowlist.test.ts` | ✅ | ✅ (A) `exportAllowlist.test.ts` na suíte de `docs/compliance`; (E) drift verde, mordidas (i)/(ii). ⚠️ WINDOWS 91/92/93 abertos |
| 51-10-T2 | 51-10 | 9 | JORN-42 / D-35 | — | `knockout_rate` conta só knockouts ainda rejeitados | smoke | smoke (o) + `funil34_kpis_smokes` | ✅ (cláusula (o) no smoke da fase) | ✅ (E) `51b.o=ko1:1->0`, MC4 morde; (S) «funil não conta como knockout». ⚠️ WR-05 do -1 aceito: knockout revertido e re-rejeitado por `registrar_decisao` volta a contar |
| 51-06-T1 | 51-06 | 6 | JORN-43 | Divulgação | `get_avaliacao_status(<id>)->'raven'` só booleanos, guarda de titular | smoke + sonda | `node scripts/p51_ensaio.cjs --sem-migracoes supabase/tests/p51_raven_status_smoke.sql` | ✅ | ✅ (E) `51a=7/7`; ACL sem anon |
| 51-07-T1 | 51-07 | 7 | JORN-43 | — | Card visível só com liberação vigente, não concluída, candidatura em andamento | unit + navegador | `npx vitest run src/features/avaliacao-cognitiva src/components/pages/__tests__` | ✅ | ✅ (A); (S) card visto no painel. Ramo «concluiu → some» só por unidade |
| 51-01-T1 | 51-01 | 1 | JORN-44 | — | «Ir ao painel» no cabeçalho e no tudo-concluído | unit + navegador | `npx vitest run src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx` | ✅ | ✅ (A); visual em UAT |
| 51-02-T1 · 51-02-T2 | 51-02 | 2 | JORN-45 | — | «Ver respostas» expande o detalhe; filtro `tipo IN ('sjt','big_five')`; texto ao lado das citações; Big Five só «Concluído/Não fez» (D-32) | unit + navegador | `npx vitest run src/features/hub-candidato src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx` | ✅ | ✅ (A). ⚠️ IN-03 («Não fez» por ausência) aberto |
| 51-01-T2 · 51-01-T3 | 51-01 | 1 | JORN-46 | — | «Voltar às avaliações» → lista; «Ir ao painel» → dashboard (D-25/D-37) | unit + e2e | `npx vitest run src/features/avaliacao src/features/avaliacao-cognitiva src/__tests__/guards` | ✅ | ⚠️ (A) unidade verde; `e2e/prova-cognitiva.spec.ts` nunca rodou; **WR-01 do 51-REVIEW escalado** (cache + refazer a prova) |
| 51-04-T1 | 51-04 | 4 | JORN-47 | Validação de entrada | Salvar bloqueado com notas vazias; mensagem na tela | unit | `npx vitest run src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx` | ✅ | ✅ (A); (E) servidor recusa vazio nas sobrecargas vivas |
| 51-03 · 51-04-T2 · 51-07-T2 | 51-03 · 51-04 · 51-07 | 3 · 4 · 7 | JORN-48 | — | Nenhuma superfície diz só «Avaliação cognitiva»; nomes do D-15 (inclui e-mail D-31) | grep test + render | `npx vitest run src/__tests__/guards/nomes-instrumentos.grep.test.ts src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx src/components/__tests__/ScoreCard.test.tsx src/features/entrevista/components/__tests__/CognitivoBandCard.nome.test.tsx` | ✅ | ✅ (A) — com os 3 testes de render acrescentados na auditoria (o (ii) do guarda tinha ponto cego em comentário JSX) |
| 51-05-T1 · 51-05-T2 | 51-05 | 5 | JORN-49 | LGPD | Recibo sem «endereço»; «mantém» com estado e faixa (Art. 16, IV); inventário = motor | gerador | `npm run check:recibo-exclusao && npm run check:pii-inventory-md`; `npx vitest run docs/compliance src/features/privacidade` | ✅ | ⚠️ (A) testes verdes; **requirement escalado**: WINDOWS 89 (`disponibilidade` prometida e não apagada) e WR-02 (finalidade da UF inexistente) |
| 51-05-T3 | 51-05 | 5 | JORN-49 | LGPD | `executar-direito-titular` redeployada com o recibo novo; drift do export aprovado ao vivo; publicação | deploy log + smoke só-leitura | `grep -E 'efdeploy: OK .*status=ACTIVE'` no log; `p44_export_drift_smoke.sql` | ✅ | ✅ (E) v13 → v14 (51-16) ACTIVE; `n_drift=0` |
| 51-06-T2 · 51-06-T3 | 51-06 | 6 | JORN-43 | Elevação / Divulgação | Runner da Onda B (CONTROLE + MA1..MA5) morde e nada persiste; apply por `p46apply migrate` com ledger = arquivo; smoke e runner contra os objetos vivos | runner + ensaio | `node scripts/p51_mutacoes.cjs` | ✅ | ✅ (E) `controle verde; 6/6 mutacoes mordem; nada persistiu` (pré e pós-apply); ledger md5 = arquivo |
| 51-07-T3 | 51-07 | 7 | JORN-43 | — | `notificar-candidato` redeployada do sha fixado; marcador `raven-candidato-card` servido no chunk `index-*` | deploy log + crawler | `grep -E 'efdeploy: OK .*status=ACTIVE'`; crawler | ✅ | ✅ (E) v18 ACTIVE; marcador em `index-DcLoVKSN.js` |
| 51-11-T1 | 51-11 | 9 | JORN-42 | Repúdio (desfecho errado no e-mail) | A resposta de revisão de triagem/knockout lê o veredito do PRÓPRIO pedido (`pedido_id`, ou o epoch do `ciclo` no retry); corpo legado continua em `decisao_final`; `pedido_id` não-uuid → 400 sem ler nada | deno | `deno test --allow-all supabase/functions/notificar-candidato/` | ✅ | ✅ (A) 128 passed; (S) `revisao_respondida` entregue na `reaberta-2` |
| 51-12-T1 | 51-12 | 9 | JORN-42 | Spoofing (origem inferida no cliente) | Knockout com o CTA de revisão; origem lida de `estado_revisao_rejeicao`; `solicitarRevisao` chama a RPC da origem; 42501 → `denied`, P0002 → `unavailable` | unit | `npx vitest run src/features/explicacao` | ✅ | ✅ (A); mordida 46/143 contra `refs/gsd/51-12/base` (E) |
| 51-12-T2 | 51-12 | 9 | JORN-42 | — | Rejeição pelo RH e estados do pedido/reabertura para qualquer origem; casos que asseriam a ausência do CTA trocados, com mordida provada contra `refs/gsd/51-12/base` | unit + e2e condicional | `npx vitest run src/features/explicacao src/__tests__/guards` | ✅ | ⚠️ (A) unidade verde; e2e EX-04 nunca rodou (gated); EX-02/EX-03 com rótulo aposentado (`deferred-items.md`) |
| 51-14-T1 | 51-14 | 10 | JORN-42 | Divulgação (allowlist da fila) | Selo de origem e `pedido_id` na fila do RH; resposta pela RPC da origem; allowlist `FILA_REVISAO_COLUNAS` com as colunas novas e nada além | unit | `npx vitest run src/features/revisao` | ✅ | ✅ (A); (S) selo «Knockout» visto em `/rh/revisoes` |
| 51-14-T2 | 51-14 | 10 | JORN-42 / D-11 | — | Diálogo de resposta com pergunta, resposta e opção eliminatória do knockout (`ler_contexto_knockout_revisao`), inclusive o estado «removida»; mordida dos testes trocados contra `refs/gsd/51-14/base` | unit | `npx vitest run src/features/revisao src/__tests__/guards` | ✅ | ✅ (A); (S) bloco «O que encerrou a candidatura» visto. ⚠️ pedido `humana_triagem` sem motivo/justificativa no diálogo — backlog deliberado do operador |
| 51-15-T1 | 51-15 | 11 | JORN-42 | LGPD | Catálogo de `revisao_rejeicao` medido dentro do ensaio; disposição e vereditos do export, inventário e linhas do recibo | smoke + estático | `node scripts/p51_ensaio.cjs --migracoes=…0002… supabase/tests/p51_catalogo_revisao_rejeicao.sql` | ✅ | ✅ (E) 16 colunas, idêntico em duas corridas |
| 51-16-T1 | 51-16 | 12 | JORN-42 | Tampering (código sem review em PROD) | Review adversarial `51-REVIEW-PORTAO-N.md` com `critical: 0` e decisão escrita do operador antes de qualquer escrita em PROD | portão node + checkpoint | `node scripts/p51_portao.cjs --revisao … --modo revisao` | ✅ | ✅ (E) `PORTAO OK` com `51-REVIEW-PORTAO-3.md` (`f37d3038`); portão repetido em cada apply/deploy/push |
| 51-16-T3 | 51-16 | 12 | JORN-42 | Repúdio (cliente antes da EF) / Tampering (commit alheio) | As três EFs ACTIVE na ordem com dono (`notificar-candidato` primeiro) antes do push; push por sha enumerado; marcadores no chunk certo; `origin/main..HEAD` vazio | deploy log + crawler | `grep -E 'efdeploy: OK .*status=ACTIVE'` nos 3 logs; crawler | ✅ | ✅ (E) v19/v8/v14 ACTIVE; `solicitar_revisao_rejeicao` em `index-BnGosyaL.js`, `fila-origem-badge` em `RevisoesRHPage-8PfiAeM0.js` |
| 51-17-T1 | 51-17 | 13 | JORN-42 | Divulgação (dado pessoal em log) / Tampering (tipos truncados) | `db:types` sem truncar, `tsc` ≤ 90; sonda de aceite só-leitura recusa sem candidatura e com `--fase` fora do vocabulário (que inclui `reaberta-10min`) | auto-teste node + lint | `node scripts/p51_aceite.cjs --auto-teste` + `npm run lint` | ✅ | ✅ (A) 203 afirmações; tsc 89. ⚠️ IN-01 (erro pode repassar user_id) e IN-06 (claims sintéticas) abertos |
| 51-17-T3 | 51-17 | 13 | JORN-42..49 | Tampering (push sem review) | Publicação final por sha enumerado com aceite do operador; remoto = HEAD; telas 43–48 entregues ao `<human-check>` da UAT | git + manual | `git log --oneline origin/main..HEAD` | ✅ | ⚠️ publicação do 51-17 feita; no instante da auditoria `origin/main..HEAD` NÃO está vazio — só commits de `.planning/` e os 3 de teste desta auditoria (nada que vá ao ar). UAT das telas aberta |
| 51-18-T1 | 51-18 | gap 1 | JORN-46 | T-51-75 · T-51-77 | «Prova registrada» escreve `registrado: true` do card no cache `['avaliacao','status',id]` e invalida; envio `locked`/erro não escreve nem invalida; entrada ausente não é fabricada | unit + tracer (tela → lista real) | `npx vitest run src/features/avaliacao src/features/avaliacao-cognitiva src/__tests__/guards` | ✅ | ✅ (E) `4014c299`; RED na base `359fd59a` (card «Pendente / Começar avaliação»); 41 arquivos / 315 testes verdes. Publicado no push do 51-24 |
| 51-18-T2 | 51-18 | gap 1 | JORN-46 | T-51-75 · T-51-76 · T-51-77 | Caso aberto do SJT, Big Five final e último envio da Redação escrevem o próprio card antes de navegar; folhas só booleanas (RNF-07a) | unit | idem | ✅ | ✅ (E) `4003bfb1`; RED na base. ⚠️ servidor (`pontuar_cognitivo` recusar reenvio) em backlog `(51-18)` de `deferred-items.md` |
| 51-19-T1 | 51-19 | gap 1 | JORN-49 | T-51-78 · T-51-79 | Linha «Estado e faixa etária» com as razões separadas (faixa: relatório agregado; UF: cadastro exige UF válida); nota da UF no inventário; origem da `disponibilidade` no tombstone; artefatos só pelos geradores | gerador | `npm run check:recibo-exclusao && npm run check:pii-inventory-md && npm run check:export-allowlist && npm run check:matriz-retencao` | ✅ | ✅ (E) `359fd59a`; quatro `check:` OK; allowlist sem diff |
| 51-19-T2 | 51-19 | gap 1 | JORN-49 | T-51-80 | Frase ao titular aprovada pelo operador antes de qualquer deploy | checkpoint (blocking-human) | `51-19-TEXTO-APROVADO.md` lido por máquina no 51-24 | ✅ | ✅ (E) `4d58129e`, opção `aprovar` (2026-10-10) |
| 51-19-T3 | 51-19 | gap 1 | JORN-49 | T-51-78 · T-51-80 | (17)/(18) no gerador e (r13) na tela prendem as razões separadas e o texto aprovado por igualdade literal | unit | `npx vitest run docs/compliance src/features/privacidade` | ✅ | ✅ (E) `405e19bd`; os três falham na base |
| 51-20-T1 | 51-20 | gap 1 | JORN-49 | T-51-81 · T-51-82 | Motor apaga a `disponibilidade` só do titular (`candidato_id = p_candidato_id`) no tombstone; (C3/x) vermelho contra o corpo vivo antes do re-pin; (B26) com candidato de controle | smoke no ensaio que aborta | `node scripts/p51_ensaio.cjs --migracoes=…20261010000001… supabase/tests/p45_motor_exclusao_smoke.sql` | ✅ | ✅ (E) `68a670d3`; `ENSAIO VERDE … g1a:anon=9b87e5ee…` |
| 51-20-T2 | 51-20 | gap 1 | JORN-49 | T-51-83 · T-51-84 | MF1/MF2 mordem o apagamento; MD1/MD2 sobre o corpo vigente; `--so` no runner sem segurar lock da tabela viva | runner | `node scripts/p51_mutacoes.cjs --so=MD1,MF1,MF2` | ✅ | ✅ (E) `1c0a89b6` |
| 51-21-T1 | 51-21 | gap 2 | JORN-49 | T-51-85 · T-51-86 · T-51-87 | Limpeza só das linhas dos já anonimizados; PRE exige motor novo; POS: nada restante do alvo, outros idênticos, apagadas = alvo; evidência só contagens e md5 | ensaio que aborta | `node scripts/p51_ensaio.cjs --migracoes=…20261010000002… supabase/tests/p45_motor_exclusao_smoke.sql` | ✅ | ✅ (E) `aca02722`; `g1l:titulares=2,com_disp=2,linhas=2,apagadas=2,restantes=0,outros=igual` |
| 51-21-T2 | 51-21 | gap 2 | JORN-49 | T-51-85 · T-51-86 | L1 (nada apagado) e L2 (escopo aberto) reprovam no rótulo certo; L0 verde; nada persiste | mutação em rascunho | ensaio das cópias L0/L1/L2 | ✅ | ✅ (E) `411e033b`; L1 → `(restantes)`, L2 → `(outros)` |
| 51-22-T1 | 51-22 | gap 3 | JORN-49 | T-51-88 · T-51-91 | Corpo vivo do motor gravado; a migration exata ensaiada sobre o estado vivo | ensaio | p45/p46 com a `0001` prefixada | ✅ | ✅ (E) `c35cd524`; `ENSAIO VERDE` p45 e p46 |
| 51-22-T2 | 51-22 | gap 3 | JORN-49 · JORN-46 | T-51-88 · T-51-89 · T-51-90 | Review adversarial dos gaps com `critical: 0` e OK escrito do operador antes do apply; pausa de outras janelas | portão + checkpoint | `node scripts/p51_portao.cjs --revisao …/51-REVIEW-GAPS … --modo revisao` | ✅ | ✅ (E) `51-REVIEW-GAPS-1.md` (`d9553a17`, critical 0); `51-22-DECISAO.md` (`6365a803`) |
| 51-22-T3 | 51-22 | gap 3 | JORN-49 | T-51-88 · T-51-89 · T-51-91 | Apply da `0001` pela via do projeto; ledger = arquivo; md5 vivo = pin; corpo vivo apaga; p45/p46 verdes e MD1/MF1/MF2 mordem contra o vivo | apply + smoke + runner | `p51_portao --modo apply && node p46apply.cjs migrate …20261010000001…` | ✅ | ✅ (E) 2026-10-10 03:17; `9b87e5ee…` vivo |
| 51-23-T1 | 51-23 | gap 4 | JORN-49 | T-51-92 · T-51-94 | Medição fresca da população (só contagens e md5) e ensaio da limpeza exata batendo com ela | ensaio | `51-23-POPULACAO.json` + ensaio | ✅ | ✅ (E) `f921a2a2`; 2/2/2, alvo `6819cb8d…` |
| 51-23-T2 | 51-23 | gap 4 | JORN-49 | T-51-93 | OK do operador com os números na frente, conferido por máquina | checkpoint (blocking-human) | `51-23-DECISAO.md` | ✅ | ✅ (E) `6cc23951`; autorização condicional satisfeita |
| 51-23-T3 | 51-23 | gap 4 | JORN-49 | T-51-92 · T-51-93 · T-51-95 | Apply da limpeza vinculado à população aprovada no mesmo comando; T-51-14 provado; WINDOWS 89 só com prova | apply + prova | `bash 51-23-COMANDO-APPLY.sh` | ✅ | ✅ (E) 03:25; «2 titular(es) anonimizado(s) examinado(s), 0 com linha; ledger = arquivo»; `db65ccf4` |
| 51-24-T1 | 51-24 | gap 5 | JORN-49 | T-51-96 · T-51-97 | Texto aprovado = JSON = espelho da EF antes do deploy; versões vivas registradas; publicação validada em seco; `executar-direito-titular` pelo portão (regra 8) | deploy log + igualdade byte a byte | `grep -qE 'efdeploy: OK .*status=ACTIVE' …p51_24_ef_executar-direito-titular.log` + o node do texto + `npm run -s check:recibo-exclusao` | ✅ | ✅ (A) v14 → **v15** ACTIVE (03:31:35 -0300); `51-24-EF-ANTES.md` (`3bb9653d`); `exportar-meus-dados` v8 mantida (fechamento igual) |
| 51-24-T2 | 51-24 | gap 5 | JORN-46 · JORN-49 | T-51-97 | Push por sha enumerado (nenhum ALHEIO); remoto = HEAD; `origin/main..HEAD` vazio; marcador AUSENTE antes e PRESENTE num `index-*` depois | git + crawler | `p51_portao --modo push && … p50_enumera.cjs … && git push origin "$S":refs/heads/main`; crawler | ✅ | ✅ (A) `53cb73ff..3bb9653d` (42 commits: 10 `codigo`, 32 `planning`); marcador em `/assets/index--Yy-gC6F.js` |
| 51-24-T3 | 51-24 | gap 5 | JORN-46 · JORN-49 | T-51-98 | Registro só depois da prova; veredito, `threats_open` e `nyquist_compliant` intocados; SC6/JORN-49 anotados | node | verify do registro (51-24 Task 3) | ✅ | ✅ (A) verde; quem re-audita é `/gsd-secure-phase 51` e `/gsd-validate-phase 51` |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ verde com ressalva*

---

## Wave 0 Requirements

- [x] `supabase/tests/p51_revisao_rejeicao_smoke.sql` — especificação executável escrita ANTES da migration (RED registrado no 51-08)
- [x] `supabase/tests/p51_raven_status_smoke.sql` — `get_avaliacao_status` com chave `raven`, guarda de titular
- [x] Guarda Vitest de rótulos do D-15 / D-25 / D-37 — `rotulos-navegacao-candidato.grep.test.ts` e `nomes-instrumentos.grep.test.ts`
- [x] Edição de portões com mordência provada (D-56): `p50_acesso_recrutador_smoke` (k) por MC1a; testes de ausência de CTA (mordida 46/143 na base do 51-12); `revisaoService` (allowlist); `ScorecardAvaliacao.test.tsx`; `EntrevistaScorecardInline.test.tsx` (5 falham na base do 51-04)

---

## Testes acrescentados nesta auditoria

| Commit | Arquivo | Req | O que prova | Mordida |
|--------|---------|-----|-------------|---------|
| `39c92206` | `src/features/avaliacao-cognitiva/components/__tests__/LiberacaoCognitivoBlock.test.tsx` | JORN-48 | O bloco do Raven no hub mostra «Raciocínio lógico (Matrizes)» nos três estados, sem «Prova cognitiva» nem nome aposentado | 3/3 falham em `refs/gsd/51-03/base` (`cca99243`) |
| `138a5d2f` | `src/components/__tests__/ScoreCard.test.tsx` | JORN-48 | A célula do Raven diz «Matrizes» com o nome completo no `title`; sem «Intel» | 1/1 falha na mesma base |
| `4eb383f8` | `src/features/entrevista/components/__tests__/CognitivoBandCard.nome.test.tsx` | JORN-48 | O card da banda da prova textual se chama «Prova cognitiva», nunca «Raciocínio lógico»/«Matrizes» | 2/2 falham na mesma base (o título era «Raciocínio lógico») |

Os 14 casos pré-existentes desses arquivos passam na base e no HEAD. `tsc` 89 depois de cada commit.

**Por que esses três.** O 51-03 registrou (coverage D5, `human_judgment: true`) que nenhum teste fixava os
rótulos novos dessas superfícies. O guarda do 51-04 cobriria parte, mas a auditoria mediu um ponto cego
nele: o filtro de comentário `^\s*(//|\*|/\*)` não reconhece a linha `{/* … */}`, e a linha 71 do
`LiberacaoCognitivoBlock` é um comentário JSX com o nome novo — trocar o título visível por um nome não
aposentado («Avaliação do Raven») deixava (i) e (ii) verdes. O teste do hub mocka o bloco como `null`.
O guarda em si não foi alterado (fica como sugestão: incluir `\{\s*\/\*` no filtro e provar que ainda morde).

---

## Escalados (defeito de implementação — não consertado aqui)

| Req | Achado | Fonte | Comportamento esperado × atual | Onde |
|-----|--------|-------|--------------------------------|------|
| JORN-49 | Recibo promete apagar `disponibilidade` | WINDOWS 89 (`open`) | Esperado: todo campo listado como apagado é apagado pelo motor. Atual: `recibo-exclusao.json:319-328` lista a disponibilidade; nenhuma migration faz `DELETE`/`UPDATE` em `public.disponibilidade` (grep no repositório); em PROD, 2 de 2 anonimizados mantêm a linha | `docs/compliance/sql/gen-recibo-exclusao.cjs:296`; motor `anonimizar_candidato` → consertado em 51-20/51-22 (motor) e 51-21/51-23 (limpeza) (evidência: `20261010000001` e `…0002` no ledger com md5 = arquivo; motor vivo `9b87e5ee…` apaga a `disponibilidade`; «2 titulares anonimizados examinados, 0 com linha» em 2026-10-10 03:25; WINDOWS 89 `fixed`) |
| JORN-49 | Finalidade declarada da UF não existe | WR-02 do `51-REVIEW.md` (`open`) | Esperado: o «mantém» diz a razão real. Atual: «para relatório agregado», e `gerar_bias_snapshot` não lê `estado`; a UF fica por `check_estado`/NOT NULL | `gen-recibo-exclusao.cjs:575-591`, `pii-inventory.yaml:103` → consertado em 51-19, publicado em 51-24 (evidência: texto aprovado pelo operador em `51-19-TEXTO-APROVADO.md`, igual byte a byte ao JSON e ao espelho da EF; `executar-direito-titular` v15 ACTIVE; marcador «porque o cadastro exige uma UF» em `/assets/index--Yy-gC6F.js`) |
| JORN-46 | Refazer a prova cognitiva sobrescreve a banda | WR-01 do `51-REVIEW.md` (`open`) | Esperado: depois de «Prova registrada», a lista mostra a prova concluída. Atual: o status vem do cache (`staleTime` 5 min), o card segue «Começar avaliação», e `pontuar_cognitivo` faz upsert sem recusar reenvio | `ProvaCognitivaScreen.tsx:115,176-183`; conserto sugerido no review (o mesmo que o 51-07 fez no Raven) → consertado no cliente em 51-18, publicado em 51-24 (evidência: `marcarInstrumentoRegistrado`, `4014c299`/`4003bfb1`, RED na base `359fd59a`; push `53cb73ff..3bb9653d`). O servidor (`pontuar_cognitivo` aceita reenvio) segue em backlog `(51-18)` |
| JORN-42 | D-23 contornável por PATCH direto | WR-01 do `51-REVIEW-PORTAO-3.md` | Esperado: o decisor revertido não re-rejeita por caminho nenhum. Atual: a policy `rh_avanca_etapa` permite PATCH em `candidaturas`; a interface não oferece o caminho | `guard_rejeicao_auditada` (conserto proposto: exigir `app.rejeicao_sancionada` com `auth.uid()` não nulo) |
| JORN-42 | Filtro do ramo arquivo sem mordida | WR-02 do `51-REVIEW-PORTAO-3.md` | Esperado: uma edição que tire `h.decisao = 'rejeitado'` reprova um portão. Atual: nenhuma mutação nem sonda o cobre | `rejeitar_candidatura` (0005); `p51_mutacoes.cjs` |
| JORN-42 / 49 | Pedido não respondido sobrevive sem o recibo dizer | WINDOWS 93 (`open`) | Esperado: o recibo lista o que fica. Atual: sem `decisao_final`, a linha «mantém» `registro_da_decisao` não aparece para pedido pendente | `executar-direito-titular/index.ts:1369` |

Nenhum desses é consertável por teste: um teste que os provasse reprovaria a suíte até o conserto, e os
três primeiros pedem decisão do operador (texto legal ao titular, comportamento de produto).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Estado (2026-10-10) |
|----------|-------------|------------|-------------------|---------------------|
| Sessão real: candidato de teste rejeitado pelo RH pede revisão; RH2 responde procedente; reabre na etapa | JORN-42 (D-28) | Fluxo com dois atores e e-mail reais | Executar no navegador; aceite = consulta `candidaturas` + `historico_candidatura` + registro do pedido | ✅ feito — `8e4bb7a0`, `rejeitada-rh` 23/23 e `reaberta-2` 23/23; D-23 recusado no passo 6 |
| Inscrição real de teste cai no knockout → pede → revertida → não cai de novo; análise disparada | JORN-42 (D-29, D-36) | Exige inscrição real em PROD com conta de teste marcada | Executar no navegador; aceite = consulta de estado + `analises_candidato` | ✅ feito — `knockout` 13/13, `reaberta` 20/20 (D-36), `reaberta-10min` 21/21 (D-03) |
| Telas 43–48 conferidas no navegador; marcador no chunk certo | JORN-43..48 (D-28) | Conferência visual pós-deploy (Vercel) | `grep -rl "<marcador>" build/assets/` + abrir a rota em PROD | ⚠️ marcadores conferidos pelo crawler em todos os planos; JORN-43 visto na sessão real; **JORN-44..48 abertos** como `<human-check>` da UAT (51-17) |
| Prévia do recibo de exclusão na tela | JORN-49 | Leitura do texto legal ao titular | Página de privacidade do candidato | ⬜ UAT aberta — e o texto tem os dois achados escalados acima |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 180s (cliente); smokes amostrados manualmente contra PROD
- [ ] `nyquist_compliant: true` set in frontmatter — **não**: JORN-49 e JORN-46 têm comportamento exigido sem cumprimento (escalados), JORN-42 tem contorno de segurança e portão sem mordida

**Approval:** parcial — auditoria Nyquist de 2026-10-10. Re-executado nesta auditoria: Vitest das áreas da
fase (96 arquivos e 1257 testes verdes antes dos acréscimos; 98 arquivos e 1274 testes verdes depois), deno das EFs (128/0), `p51_portao --auto-teste`
(68), `p51_aceite --auto-teste` (203), `tsc` 89. Não re-executado (evidência dos SUMMARYs): smokes SQL,
`p51_mutacoes.cjs`, crawler, deploy.
