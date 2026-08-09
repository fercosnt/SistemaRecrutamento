---
phase: 47
slug: transpar-ncia-consolida-o
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
---

# Phase 47 — Validation Strategy

> Contrato de validação por fase, para amostragem de feedback durante a execução.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (config inline em `vite.config.ts`, bloco `test`) |
| **Config file** | `vite.config.ts` — `environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']`, `include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']` |
| **Quick run command** | `npx vitest run <caminho tocado>` |
| **Full suite command** | `npm run test:run` |
| **Estimated runtime** | ~8 s (medido: 1696/1696 em 7,70 s, 174 arquivos) |
| **Portões de artefato** | `npm run check:export-allowlist` · `check:recibo-exclusao` · `check:matriz-retencao` · `check:pii-inventory-md` |
| **Gate de tipos** | `npm run -s lint 2>&1 \| grep -c "error TS"` — não-regressão contra **97** (local) / 104 (CI) |
| **Smokes SQL** | `supabase/tests/p47_*.sql` — executados por MCP numa única chamada, **checkpoint do orquestrador**, depois do apply |

⚠ **Um teste fora de um diretório `__tests__/` não é coletado.** Ele não roda e não falha — é a forma
mais barata de fabricar um falso verde. Todos os arquivos de teste desta fase nascem em `__tests__/`.

---

## Sampling Rate

- **Após cada commit de tarefa:** `npx vitest run <caminho tocado>` + o gate de tipos do pre-commit
- **Após cada wave:** `npm run test:run` + `npm run -s lint` + os **quatro** `check:`
- **Antes de `/gsd-verify-work`:** suíte cheia verde + `npm run build` + os quatro `check:` verdes
- **Máxima latência de feedback:** ~8 s (suíte cheia); < 2 s para uma feature isolada

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 47-01-00 | 01 | 1 | TRANSP-02 | T-47-01-02 | Janela publicada é a vigente medida, não o seed | checkpoint | `node -e` sobre o SUMMARY (proveniência datada) | ❌ W0 | ⬜ pending |
| 47-01-01 | 01 | 1 | TRANSP-02 | T-47-01-01 / T-47-01-03 | Artefato determinístico; colunas administrativas nunca projetadas | script + gate | `node docs/compliance/sql/gen-matriz-retencao.cjs --check` | ❌ W0 | ⬜ pending |
| 47-01-02 | 01 | 1 | TRANSP-02 | T-47-01-06 | Etapa sem finalidade reprova a build, nomeando a etapa | unit (mutação de fonte) | `npx vitest run docs/compliance/__tests__/genMatrizRetencao.test.ts` | ❌ W0 | ⬜ pending |
| 47-01-03 | 01 | 1 | TRANSP-02 | T-47-01-05 | Nenhum portão definido e não invocado | unit (gate) | `npx vitest run docs/compliance/__tests__/portoesInvocados.test.ts` | ❌ W0 | ⬜ pending |
| 47-02-01 | 02 | 1 | CONSOL-02 | T-47-02-01/02/03/05/06 | Junção correta, cast explícito, guard NULL-safe, escopo por vaga no corpo | gate estático (forma da migration) | `node -e` guard sobre `20260809000001_*.sql` | ❌ W0 | ⬜ pending |
| 47-02-02 | 02 | 1 | CONSOL-02 | T-47-02-01/02/06 | Caminho feliz com nome real + 2 recusas com 42501 | smoke SQL | `node -e` (forma) · execução = checkpoint pós-apply | ❌ W0 | ⬜ pending |
| 47-03-01 | 03 | 1 | CONSOL-03 | T-47-03-01/02/03 | Zero DROP; comentário sem a promessa órfã; auditoria nos dois destinos | gate estático (forma da migration) | `node -e` guard sobre `20260809000002_*.sql` | ❌ W0 | ⬜ pending |
| 47-03-02 | 03 | 1 | CONSENT-05 | T-47-03-04/05 | Sem DEFAULT, nullable, zero UPDATE retroativo | gate estático + smoke SQL | `node -e` guard sobre `20260809000003_*.sql` | ❌ W0 | ⬜ pending |
| 47-03-03 | 03 | 1 | CONSOL-03 | T-47-03-07/08 | Fonte editada e artefato regerado no mesmo commit | script (4 portões) | `npm run -s check:pii-inventory-md && ... && npx vitest run src/features/admin/prompt-versions` | ✅ | ⬜ pending |
| 47-04-01 | 04 | 1 | TRANSP-01 | T-47-04-01/03 | País por medir não embarca; nenhum identificador interno | unit (propriedade + fixture) | `npx vitest run src/features/transparencia/__tests__/subprocessadores.test.ts` | ❌ W0 | ⬜ pending |
| 47-04-02 | 04 | 1 | TRANSP-01 | T-47-04-03/04/05/06 | Sem tabela, sem clique, sem estado assíncrono, alvo tátil, bans de copy | unit (render + gate) | `npx vitest run src/features/transparencia` | ❌ W0 | ⬜ pending |
| 47-04-03 | 04 | 1 | TRANSP-01 | T-47-04-01 | Seis países com proveniência datada | checkpoint | `npx vitest run .../subprocessadores.test.ts` + `node -e` (datas) | ❌ W0 | ⬜ pending |
| 47-05-01 | 05 | 1 | CONSOL-01 | T-47-05-01/02/03 | Veredito com evidência citada, no caminho real, fora de rascunho | doc gate | `node -e` sobre os 2 arquivos novos | ❌ W0 | ⬜ pending |
| 47-05-02 | 05 | 1 | CONSOL-01 | T-47-05-03/04 | Quatro rascunhos saem de rascunho com proveniência do veredito | doc gate | `node -e` sobre os 4 arquivos | ✅ | ⬜ pending |
| 47-05-03 | 05 | 1 | CONSOL-01 | T-47-05-01/02 | 6/6 com veredito; zero diretório no caminho errado | doc gate | `node -e` sobre os 6 + varredura de `.planning/phases/` | ❌ W0 | ⬜ pending |
| 47-06-01 | 06 | 2 | TRANSP-02 | T-47-06-01/06/07 | Carimbo de vigência presente; sem data válida a página lança | unit (render) | `npx vitest run src/features/transparencia` | ❌ W0 | ⬜ pending |
| 47-06-02 | 06 | 2 | TRANSP-02 | T-47-06-03/04/05 | Uma ficha por estado; colunas administrativas ausentes; bloco derivado do recibo | unit (render + fixture) | `npx vitest run src/features/transparencia` | ❌ W0 | ⬜ pending |
| 47-06-03 | 06 | 2 | TRANSP-02 | T-47-06-02 | A Emenda A é RENDERIZADA, não só declarada | unit (render) | `npx vitest run src/features/admin/retencao` | ❌ W0 | ⬜ pending |
| 47-07-01 | 07 | 2 | CONSOL-02 | T-47-07-01/02/05 | Allowlist explícita sem coluna proibida; recusa distinguível de falha de rede | unit (serviço) | `npx vitest run src/features/hub-candidato` | ✅ parcial | ⬜ pending |
| 47-07-02 | 07 | 2 | CONSOL-02 | T-47-07-02/03/04 | Quatro rótulos + negativas de identificador, célula vazia e truncamento | unit (render) | `npx vitest run src/features/hub-candidato` | ❌ W0 | ⬜ pending |
| 47-08-01 | 08 | 3 | TRANSP-01/02 | T-47-08-01 | Revisão do Encarregado antes de a navegação apontar | checkpoint | registro no SUMMARY com data | ❌ W0 | ⬜ pending |
| 47-08-02 | 08 | 3 | TRANSP-01/02 | T-47-08-03/05/06 | Dois links, alvo tátil em cada, nada institucional, não grudado | unit (estrutural) | `npx vitest run src/features/transparencia/__tests__/rodapePublico.test.tsx` | ❌ W0 | ⬜ pending |
| 47-08-03 | 08 | 3 | TRANSP-01/02 | T-47-08-02/04 | Montado em 5 superfícies; diff das 3 páginas é só adição | unit + gate de diff | `npm run test:run` + `node -e` sobre `git diff --numstat` | ❌ W0 | ⬜ pending |
| 47-09-01 | 09 | 4 | CONSOL-04 | T-47-09-01/02/03/07 | Promessa sem executor é reportada NOMEANDO a promessa | unit (registro + varredura + fixture) | `npx vitest run src/__tests__/promessasComExecutor.test.ts` | ❌ W0 | ⬜ pending |
| 47-09-02 | 09 | 4 | TRANSP-01 | T-47-09-04/06/07 | Destino externo sem ficha nem decisão reprova, nomeando o destino | unit (varredura + fixture) | `npx vitest run src/__tests__/destinosDeRedeComFicha.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Nenhuma instalação de framework é necessária — Vitest, happy-dom e o harness de smoke SQL já existem.
O que a wave 0 cria são os arquivos de teste e de portão que ainda não existem, e cada um nasce
dentro do plano que o consome:

- [ ] `docs/compliance/__tests__/genMatrizRetencao.test.ts` — portões do gerador (47-01)
- [ ] `docs/compliance/__tests__/portoesInvocados.test.ts` — anti-portão-órfão (47-01)
- [ ] `package.json` → `check:matriz-retencao` e `check:pii-inventory-md`; `ci.yml` → as 4 invocações (47-01)
- [ ] `supabase/tests/p47_historico_smoke.sql` — caminho feliz + 2 negativas (47-02)
- [ ] `supabase/tests/p47_consol03_consent05_smoke.sql` — 2 caminhos felizes + 3 negativas (47-03)
- [ ] `src/features/transparencia/__tests__/subprocessadores.test.ts` — propriedade de falha alta (47-04)
- [ ] `src/features/transparencia/__tests__/subprocessadoresPage.test.tsx` — render + alvo tátil (47-04)
- [ ] `src/features/transparencia/__tests__/copyTransparencia.test.ts` — bans no escopo da feature (47-04)
- [ ] `src/features/transparencia/__tests__/privacidadePublica.test.tsx` — render + carimbo (47-06)
- [ ] `src/features/transparencia/__tests__/matrizRetencaoPublica.test.tsx` — derivação + não-agrupamento (47-06)
- [ ] `src/features/admin/retencao/components/__tests__/emendaPublicacao.test.tsx` — Emenda A renderizada (47-06)
- [ ] `src/features/hub-candidato/components/__tests__/historicoAtorRotulos.test.tsx` — 4 rótulos + negativas (47-07)
- [ ] `src/features/transparencia/__tests__/rodapePublico.test.tsx` — 2 links + alvo tátil (47-08)
- [ ] `src/__tests__/promessasComExecutor.test.ts` — o checklist versionado (47-09)
- [ ] `src/__tests__/destinosDeRedeComFicha.test.ts` — lista pública × destinos de rede (47-09)

⚠ **O portão de copy do escopo `src/features/transparencia/` nasce na wave 1** (47-04) e trata
diretório ausente como zero ocorrência — é o que permite que ele já esteja montado quando a segunda
página chegar na wave 2.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| As 8 janelas VIGENTES de `config_retencao_etapa` em PROD | TRANSP-02 | Subagentes GSD não recebem os tools MCP do Supabase (`STATE.md:552`); o valor vigente só existe no banco | Checkpoint 47-01 Task 0: `SELECT etapa, janela_meses, origem, atualizado_em FROM public.config_retencao_etapa ORDER BY etapa;` via MCP, mais a data da medição |
| O **país** de cada uma das seis empresas | TRANSP-01 | Não medível deste ambiente: sem token da API de gerenciamento, sem CLI no PATH, DNS atrás de rede de borda, nenhum pin de região no repositório. E o fato que importa é onde o dado **deste projeto** é tratado, que só existe na conta do provedor | Checkpoint 47-04 Task 3: o operador informa os seis países e o método de cada um |
| A formulação do provedor de hospedagem e a qualificação do serviço de CEP | TRANSP-01 | Decisão jurídica sobre a forma do campo numa declaração de transferência internacional | Checkpoint 47-08 Task 1: revisão do Encarregado |
| A copy das duas páginas públicas, antes de a navegação apontar para elas | TRANSP-01/02 | São declarações de compliance dirigidas a qualquer visitante; a revisão é portão de **publicação** | Checkpoint 47-08 Task 1, em aba anônima, nas duas rotas |
| Execução dos dois smokes SQL | CONSOL-02 · CONSOL-03 · CONSENT-05 | Exige MCP e o apply prévio das migrations; nenhum dos dois é feito por subagente | Checkpoint do orquestrador, **depois** do apply, numa única chamada por arquivo |
| Apply das três migrations em PROD | CONSOL-02 · CONSOL-03 · CONSENT-05 | `.planning/STATE.md:552` — toda migration é checkpoint do orquestrador | Ordem: `20260809000001` → `20260809000002` → `20260809000003`, com `supabase migration repair --status applied <version>` após cada uma |

---

## Nota de escopo: esta fase NÃO tem portão destrutivo

O portão de fase destrutiva do M8 aplicava-se à Phase 47 **só via CONSOL-03**, sob a hipótese de um
`DROP` de tabela com escritor vivo. A decisão do operador de 2026-08-09 é **adotar** a tabela, e
CONSENT-05 é resolvido por remoção de valor padrão e de obrigatoriedade — nenhuma das duas é
destrutiva. **Nenhum plano desta fase contém `DROP`, `DELETE` ou `UPDATE` retroativo**, e cada guard
automático das migrations reprova essas formas.

Também nenhum plano **aplica** ou **deploya** coisa alguma: os planos escrevem migrations e smokes; o
apply e a execução são checkpoints do orquestrador, fora de qualquer wave que escreva migration.

---

## Validation Sign-Off

- [ ] Todas as tarefas têm `<verify><automated>` ou dependência declarada de wave 0
- [ ] Continuidade de amostragem: nenhuma sequência de 3 tarefas sem verificação automatizada
- [ ] A wave 0 cobre todas as referências ausentes
- [ ] Nenhuma flag de modo watch
- [ ] Latência de feedback < 47 s (medido: ~8 s na suíte cheia)
- [ ] `nyquist_compliant: true` marcado no frontmatter

**Approval:** pending
