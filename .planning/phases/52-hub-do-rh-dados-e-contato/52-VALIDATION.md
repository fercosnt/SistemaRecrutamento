---
phase: "52"
slug: "hub-do-rh-dados-e-contato"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-10"
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Semeado de `52-RESEARCH.md` §Validation Architecture (copiado abaixo). O mapa por tarefa é
> preenchido depois que os planos existirem.

---

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unidade/componente/guardas) · `deno test` (EF) · smokes SQL dentro de ensaio que aborta (`scripts/p52_ensaio.cjs`, cópia do p51) · auto-testes node (tabela de caracteres, comparação de população) |
| Config file | `vite.config.ts` (`test.include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`; EFs fora) |
| Quick run command | `npx vitest run <arquivos tocados> && npm run lint` (lint ≤ 90; hoje 89) |
| Full suite command | `node scripts/p52_vitest_delta.cjs` (suíte Vitest inteira por delta contra `refs/gsd/52/base` medida na mesma execução: `alteradas=0 · novas=0 · mordida=ok` — `npm run test:run` puro é vermelho por construção, a base já reprova 2 testes, STATE.md:1404) `&& npm run lint && deno test --allow-all supabase/functions/ler-cadastro-candidato-rh/` + `node scripts/p52_ensaio.cjs --vistas supabase/tests/p52_*.sql` + `node scripts/p52_mutacoes.cjs` |

Medido nesta sessão: `npx vitest run src/features/hub-candidato src/__tests__/guards` → 22 arquivos, 245 testes, 1,41 s (o
ruído de `AsyncTaskManager.abortAll` do happy-dom no teardown é pré-existente e não reprova).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JORN-52 | 6 `mc` + 1 `caso_aberto` ativos por cargo; antigos retirados; vagas sem `itens_ids` | smoke SQL (ensaio) + catálogo | `node scripts/p52_ensaio.cjs --migracoes=<banco_v2> supabase/tests/p52_banco_sjt_smoke.sql` | ❌ Wave 0 |
| JORN-52 | Tabela de caracteres reproduzível e critério aplicado | auto-teste python + cruzamento SQL | `python3 -I scripts/geradores/tabela-comprimento-sjt.py --auto-teste && python3 -I scripts/geradores/tabela-comprimento-sjt.py <texto-v2.md>` | ❌ Wave 0 |
| JORN-53 | WhatsApp/`mailto:`; inválido sem link; `@invalido.local` (tombstone e fictícios, mesmo com celular) sem nenhum `mailto:`/`wa.me`/mensagem pronta — EF devolve `contato: null` | unit + componente + deno | `npx vitest run src/features/hub-candidato/lib src/features/hub-candidato/components/__tests__/contato*` | ❌ Wave 0 |
| JORN-54 | EF: 401/403(rh inativo, candidato)/400/404/200; tombstone → `null`; log só com chaves permitidas | deno unit (deps injetadas) | `deno test --allow-all supabase/functions/ler-cadastro-candidato-rh/` | ❌ Wave 0 |
| JORN-55 | Ordem do formulário, selo, sem opção eliminatória no DOM, `javascript:` vira texto | componente | `npx vitest run src/features/hub-candidato/components/__tests__/respostasInscricao*` | ❌ Wave 0 |
| JORN-56 | Faixas sim, percentil não (DOM e tipo); sem devolutiva → frase sem faixa | componente + smoke da RPC | `npx vitest run src/features/avaliacao/components/__tests__/BigFiveResultadoHub*` + `p52_ensaio.cjs … p52_leituras_rh_smoke.sql` | ❌ Wave 0 |
| JORN-56/57 | RPCs: admin/rh ativo leem; rh inativo, candidato, sem claims, `anon` recusados; `anon` sem EXECUTE; vistas inalteradas | smoke SQL por papel + sonda de vistas | `node scripts/p52_ensaio.cjs --vistas --migracoes=<leituras_rh> supabase/tests/p52_leituras_rh_smoke.sql` | ❌ Wave 0 |
| JORN-57 | Exatamente uma etiqueta (a da escolhida); ordem não denuncia a certa; `<mark>` sem `dangerouslySetInnerHTML` | componente + smoke | `npx vitest run src/features/avaliacao/components/__tests__/SjtMcDetalhe* TextoComCitacoes*` | ❌ Wave 0 |
| JORN-58 | `?aba=` com `replace`; contagem 1×; proveniência sem «modelo modelo» (tela e PDF) | componente + guarda | `npx vitest run src/features/hub-candidato src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx src/features/triagem/pdf` | ✅ parcial (substituir `hubVerRespostas.test.tsx`) |
| JORN-59 | Todas concluídas → frase sem `<button>`; uma pendente → CTA; nenhuma escrita em `candidaturas` | componente | `npx vitest run src/components/pages/__tests__/DashboardCandidato*` | ❌ Wave 0 |
| JORN-60 | Diálogo com ≥1 resposta (SJT MC, Raven, **cognitiva**, **Big Five**; no **Caso prático**, texto não vazio — emenda 2026-10-11, `52-14-DECISAO-RODADA-1.md` P1, CR-01 do `52-REVIEW-PORTAO-1`); direto **só na Redação** (a única que relê o rascunho), gravando antes só se houve edição; guarda de rótulos morde. _Antes da emenda: «direto nas 3 com rascunho após `flushNow`»._ | componente + guarda + mutação | `npx vitest run src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx src/features/avaliacao/components/__tests__/RedacaoEditorScreen.saida-rascunho.test.tsx src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts` | ✅ parcial |
| JORN-61 | Nada marcado ao abrir (mesmo com `score: 4` da IA); 3 de 4 → desabilitado; `getActivePageFromPath` | componente + unit | `npx vitest run src/features/entrevista src/components/__tests__/RHSidebar*` | ❌ Wave 0 (sidebar) |
| JORN-62 | `resolveRedirect` com sessão; `SelectItem` nos dois fundos; `humana_triagem` mostra motivo/justificativa (RPC + componente) | componente + smoke | `npx vitest run src/components/pages/__tests__/LoginCandidato* src/features/revisao` + smoke da RPC | ✅ parcial |
| JORN-63 | População: duas entradas, trava (NOT EXISTS), colisões, fixtures, Storage; comando recusa população divergente; resíduo 0 | auto-teste node + ensaio + prova pós | `node scripts/p52_limpeza_portao.cjs --auto-teste` + `p52_ensaio.cjs supabase/tests/p52_populacao_limpeza.sql` | ❌ Wave 0 |

Manual-only (justificado): a sessão real do operador no hub com conta de recrutador ativo (D-10 por sessão, molde
50-11/51-17) — o JWT real e o `console.log` publicado não são reproduzíveis no ensaio; conferência do log no painel de EF.

### Sampling Rate
- **Per task commit:** `npx vitest run <arquivos tocados> && npm run lint` (≤ 90)
- **Per wave merge:** suíte Vitest completa; smokes da onda pelo ensaio que aborta; `npm run build` + marcador no chunk certo
- **Phase gate:** tudo verde; `git log --oneline origin/main..HEAD` vazio; prova pós da limpeza; antes de `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/p52_ensaio.cjs` — cópia adaptada de `p51_ensaio.cjs` (lista de migrations `_p52_`, marca `p52.tx`)
- [ ] `scripts/p52_vitest_delta.cjs` — delta da suíte Vitest contra `refs/gsd/52/base` (molde `p50_vitest_delta.cjs`), com `--auto-teste` e `BASE NAO MEDIDA` fail-closed (52-01 Task 3; usado no 52-14, 52-17, 52-20)
- [ ] `supabase/tests/p52_leituras_rh_smoke.sql` — atores lidos na execução (molde `p50_acesso_recrutador_smoke.sql`), população > 0 publicada
- [ ] `supabase/tests/p52_banco_sjt_smoke.sql`, `supabase/tests/p52_populacao_limpeza.sql` (só leitura)
- [ ] `scripts/p52_mutacoes.cjs` — mutações: guard sem helper, RPC que projeta `percentil`/`tag` das outras, item antigo ativo, `NOT IN` no lugar de `NOT EXISTS`
- [ ] `supabase/functions/ler-cadastro-candidato-rh/index.test.ts`
- [ ] `scripts/geradores/tabela-comprimento-sjt.py` (+ `--auto-teste`) e `scripts/geradores/gen-sjt-v2.py`
- [ ] Teste que travava D-32 **substituído** (não apagado): `ScorecardAvaliacao.test.tsx` (o `describe` de `:104-124` — a única trava da D-32; 52-11). *(Corrigido na revisão de 2026-10-10: `hubVerRespostas.test.tsx` NÃO trava a D-32 — nenhum «Concluído», «Big Five», `87` ou «faixa»; ele é substituído pelo 52-25 porque o «Ver respostas» sai do hub, D-52-U03.)*

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _a preencher a partir dos PLAN.md_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (quick run)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
