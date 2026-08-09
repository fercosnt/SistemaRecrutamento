---
phase: 40
slug: timeline-de-prazo-no-painel-do-candidato
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-08-09
validated: 2026-08-09
source: auditoria documental retroativa (Phase 47 / Plan 47-05, CONSOL-01)
method: auditoria documental dos artefatos existentes — sem re-execução da fase
---

# Phase 40 — Validation Strategy (veredito retroativo)

> Esta fase fechou em 2026-07-24 **sem arquivo de validação**. Este documento é o veredito Nyquist
> emitido retroativamente pela Phase 47 (CONSOL-01), por **auditoria documental** dos artefatos que
> existem — `40-VERIFICATION.md`, os 2 PLANs, os 2 SUMMARYs e os arquivos de teste — cruzados com o
> estado vivo do repositório medido em 2026-08-09.
>
> **A fase não foi re-executada.** Os testes que já existem foram apenas *executados como leitura de
> estado* (`npx vitest run src/features/timeline` — 7/7, 453 ms), o que é observação, não re-execução
> da fase.

---

## Veredito

**PARTIAL — `status: validated` + `nyquist_compliant: false`.**

Esta é, de longe, a fase mais bem coberta das seis do M7: é a única cujo requirement tem testes
Vitest versionados rodando no portão bloqueante do CI, e eles passam hoje. Mas a cobertura é de
**peças**, não do **comportamento entregue**.

O TIMELINE-02 diz que *"o `DashboardCandidatoPage` mostra, em cada estado de espera, a estimativa de
prazo da etapa atual"*. Os 7 testes provam que o serviço lê a tabela com allowlist e que o
componente renderiza o rótulo sem countdown. **Nenhum deles prova que o componente está montado no
dashboard, nem que a decisão de "isto é um estado de espera" está certa.** Apagar
`<PrazoEstimadoLinha>` de `src/components/pages/DashboardCandidatoPage.tsx:326` deixaria
`npm run test:run` em 1781/1781 verdes e o requirement em zero.

Essa é exatamente a forma de defeito que já custou um incidente de produção neste projeto na
Phase 39: um guard que existia, era correto, e não estava no caminho de execução.

---

## Test Infrastructure

Fato medido do repositório em 2026-08-09 — não copiado de outro arquivo.

| Property | Value |
|----------|-------|
| **Framework** | **Vitest 4.1.9** — configuração **inline** no bloco `test` de `vite.config.ts` (não há `vitest.config.ts` no repositório) |
| **Config** | `environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']`, `include: ['**/__tests__/**/*.[test,spec].[ts,tsx]']` |
| **Quick run command** | `npx vitest run src/features/timeline` — **medido: 2 arquivos / 7 testes verdes, 453 ms** |
| **Full suite command** | `npm run test:run` — **medido: 179 arquivos / 1781 testes verdes, 7,7 s** |
| **Type-check** | `npm run lint` (`tsc --noEmit`) — baseline congelada em 97 erros, teto de CI 104 |
| **Portão de CI** | `.github/workflows/ci.yml` job `unit` roda `npm run lint` (com contagem) e `npm run test:run` — **bloqueante**. Os 7 testes desta fase entram por aí |
| **Arquivos de teste da fase** | `src/features/timeline/services/__tests__/slaService.test.ts` (4 casos) · `src/features/timeline/components/__tests__/PrazoEstimadoLinha.test.tsx` (3 casos) |
| **Sem cobertura** | `src/features/timeline/hooks/useSlaEtapas.ts` — **nenhum arquivo de teste** |

---

## Sampling Rate — o que de fato roda hoje

- **Por commit / por PR (CI, bloqueante):** `npm run test:run` inclui os 7 testes desta fase
- **Local, caminho rápido:** `npx vitest run src/features/timeline` — 453 ms
- **Latência de feedback:** < 1 s no caminho rápido, ~8 s na suíte inteira. Esta é a única das seis
  fases do M7 com latência de feedback finita e curta

---

## Per-Requirement Verification Map

| Req ID | Comportamento | Tipo de prova | Comando / evidência citada por caminho | Roda em portão? | Cobertura |
|--------|---------------|---------------|----------------------------------------|-----------------|-----------|
| TIMELINE-02 (leitura) | `listarSlaEtapas` lê `config_sla_etapa` com allowlist explícita e **nunca** `select('*')`; erro vira `SlaServiceError`; `data` nulo vira lista vazia | unit (Vitest, 4 casos) | `npx vitest run src/features/timeline/services/__tests__/slaService.test.ts` — cobre `src/features/timeline/services/slaService.ts` | ✅ sim (`npm run test:run`) | **automatizada** |
| TIMELINE-02 (render) | O componente mostra o rótulo e o chip "Estimativa"; devolve nada quando o rótulo é nulo; exibe o texto **verbatim**, sem contagem regressiva anexada | unit (Vitest, 3 casos) | `npx vitest run src/features/timeline/components/__tests__/PrazoEstimadoLinha.test.tsx` — cobre `src/features/timeline/components/PrazoEstimadoLinha.tsx` | ✅ sim | **automatizada** |
| TIMELINE-02 (montagem) | O `DashboardCandidatoPage` chama `useSlaEtapas()` e renderiza `<PrazoEstimadoLinha>` por card | grep de shell no bloco `<verify>` do `40-02-PLAN.md:100` | `grep -q "useSlaEtapas" ... && grep -q "PrazoEstimadoLinha"` — executado **uma vez**, na execução do plano | ❌ **não** | **sem cobertura recorrente** — G-40-01 |
| TIMELINE-02 (decisão de espera) | `rotuloDeEspera` só devolve texto para etapas com `prazo_valor` não-nulo, e formata o rótulo do candidato | nenhuma | `src/features/timeline/hooks/useSlaEtapas.ts:24` — nenhum arquivo de teste referencia esta função | ❌ **não** | **sem cobertura** — G-40-02 |
| TIMELINE-02 (degradação, SC3) | Falha do fetch ⇒ Map vazio ⇒ rótulo nulo ⇒ card intacto (a estimativa é *enhancement*, nunca requisito de render) | nenhuma | `40-VERIFICATION.md:28` afirma o comportamento por leitura; `src/features/timeline/hooks/useSlaEtapas.ts` não tem teste | ❌ **não** | **sem cobertura** — G-40-03 |
| RNF anti-countdown (SC2) | Nenhum `Date`/`setInterval` no caminho de render | grep de shell (`40-02-PLAN.md:78`) **+** asserção de texto verbatim no teste do componente | o grep não roda em portão; o teste de texto verbatim **roda** | ⚠ parcial | automatizada **em parte** |

**Classificação:** 2 das 6 linhas cobertas por comando automatizado que roda num portão · 1 parcial ·
3 sem cobertura recorrente. O requirement TIMELINE-02, **considerado como comportamento entregue**,
não está integralmente coberto.

---

## Gaps Nomeados

### G-40-01 — A montagem no dashboard só foi provada por um grep de uso único

- **Comportamento sem cobertura:** que a estimativa **apareça** no painel do candidato. É o
  requirement inteiro, não um detalhe: `DashboardCandidatoPage.tsx:13,14,39,326` são as quatro linhas
  que ligam a feature à tela, e nenhuma delas é observada por teste.
- **Plano de origem:** `40-02-PLAN.md`, Task de fiação — sua `<verify>` (`:100`) é
  `grep -q "useSlaEtapas" ... && grep -q "PrazoEstimadoLinha"`, um grep de shell que rodou uma vez,
  durante a execução, e nunca mais.
- **Razão registrada:** nenhuma. O padrão de `<verify>` por grep é comum nos planos do M7 e é
  adequado como portão de execução; o erro foi não promovê-lo a teste versionado ao fechar a fase.
- **Comando que fecharia o gap:** um caso em
  `src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx` (arquivo que **já existe**,
  já monta a página e já roda no CI) que, com `useSlaEtapas` mockado devolvendo um SLA para a etapa
  do card, asserisse a presença do texto do rótulo — e a **ausência** dele quando o SLA não existe.
  Entra no `npm run test:run` automaticamente.

### G-40-02 — `rotuloDeEspera` decide o comportamento e não tem um único teste

- **Comportamento sem cobertura:** a função em `src/features/timeline/hooks/useSlaEtapas.ts:24` é o
  árbitro de "esta etapa é um estado de espera" e a formatadora do texto. O teste do componente
  recebe o rótulo **já pronto** como prop; o teste do serviço para na linha crua do banco. A tradução
  entre os dois — que é onde mora a regra — não é exercitada por nada.
- **Plano de origem:** `40-01-PLAN.md`, Task do hook. Sua `<verify>` (`:107`) é um grep por
  `staleTime`/`slaKeys`/`useQuery`/`prazo_valor` no arquivo-fonte — presença de token, não comportamento.
- **Razão registrada:** nenhuma. O `40-01-PLAN.md` autorizou teste para o serviço e grep para o hook.
- **Comando que fecharia o gap:** `src/features/timeline/hooks/__tests__/useSlaEtapas.test.ts`
  cobrindo `rotuloDeEspera` como função pura — SLA com `prazo_valor` nulo devolve nulo; SLA válido
  devolve o `rotulo_candidato` verbatim; entrada indefinida devolve nulo. Roda em
  `npx vitest run src/features/timeline` e no CI.

### G-40-03 — A degradação graciosa (SC3) é afirmada e não é exercitada

- **Comportamento sem cobertura:** que a falha da leitura de `config_sla_etapa` deixe o card do
  candidato **intacto**. É a propriedade que torna a feature um *enhancement* seguro em vez de um
  ponto de falha novo no painel.
- **Plano de origem:** `40-01-PLAN.md` (hook) — a cadeia fetch-falha ⇒ Map vazio ⇒ rótulo nulo
  atravessa o hook, que é justamente a peça sem teste.
- **Razão registrada:** `40-VERIFICATION.md:28` afirma o comportamento por leitura de código
  (*"Falha do fetch ⇒ Map vazio ⇒ null ⇒ card intacto"*) — leitura correta, prova não-recorrente.
- **Comando que fecharia o gap:** o mesmo arquivo do G-40-02, com um caso em que a query rejeita e
  o `lookup` resultante é um Map vazio; somado ao caso de dashboard do G-40-01, prova a cadeia inteira.

---

## Manual-Only Verifications

| Comportamento | Requirement | Por que manual | Instrução |
|---------------|-------------|----------------|-----------|
| Nenhum | — | — | `40-VERIFICATION.md:39` registra, corretamente, que esta fase **não tem HUMAN-UAT**: ela completa 100% em código e lê apenas configuração já seedada pela Phase 37 |

---

## Achados da auditoria

1. **Nenhuma divergência entre os artefatos e o repositório vivo.** Os dois arquivos de teste citados
   existem, e os 7 casos passam hoje (medido: 453 ms). Os arquivos-fonte citados existem nos caminhos
   registrados.
2. **A contagem de suíte mudou legitimamente:** `40-VERIFICATION.md:20` registra 1025/1025 em
   128 arquivos (2026-07-24); hoje são **1781/1781 em 179 arquivos**. O crescimento vem das fases
   41→47 posteriores, não de regressão — os 7 desta fase continuam entre eles.
3. **A fase corrigiu um gap alheio e isso está registrado:** `40-VERIFICATION.md:38` — os 3 testes
   Deno da Phase 38 não estavam no `exclude` de `vite.config.ts`, o que reprovava a suíte inteira;
   a Phase 40 corrigiu. O `vite.config.ts` vivo carrega hoje essas entradas literais, e o próprio
   arquivo documenta que esse erro de omissão já ocorreu mais de uma vez — é um padrão de falha
   conhecido do repositório, não um acidente isolado.

---

## Validation Sign-Off

- [x] Todo requirement da fase tem prova citada por caminho
- [ ] Todo requirement tem comando automatizado que roda num portão — **NÃO** (G-40-01/02/03)
- [x] Sem watch-mode (`vitest run`, nunca `vitest`)
- [x] Latência de feedback < 90 s (medida: 453 ms no caminho rápido)
- [ ] `nyquist_compliant: true` — **NÃO**, e as três razões estão nomeadas acima

**Aprovação:** veredito PARCIAL emitido em 2026-08-09 por auditoria documental, sem re-execução da
fase. Os três gaps são fecháveis por dois arquivos de teste em `src/`, sem infraestrutura nova.
