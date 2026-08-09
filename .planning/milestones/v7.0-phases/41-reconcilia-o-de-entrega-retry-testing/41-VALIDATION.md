---
phase: 41
slug: reconcilia-o-de-entrega-retry-testing
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-26
validated: 2026-08-09
source: auditoria documental retroativa (Phase 47 / Plan 47-05, CONSOL-01)
method: auditoria documental dos artefatos existentes — sem re-execução da fase
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> ⚠ **Veredito acrescentado retroativamente em 2026-08-09** pela Phase 47 (CONSOL-01). O conteúdo
> original foi **preservado**; o veredito, o mapa medido, os gaps e os achados são o acréscimo.
> Duas divergências entre o registrado e o repositório vivo viraram **achados**, não correções
> silenciosas.
>
> **A fase não foi re-executada** — nenhum envio, nenhum webhook, nenhuma varredura disparada.

---

## Veredito

**PARTIAL — `status: validated` + `nyquist_compliant: false`.**

Esta é a fase que fechou o laço do M7, e é a única cujo `VERIFICATION.md` registra `gaps: []` com o
UAT ao vivo **completo** — o ciclo inteiro rodou pelo pipeline real do provedor: envio real, webhook
assinado de verdade, reconciliação observada no banco (`41-VERIFICATION.md:41,115`). Essa prova é
forte e é rara neste milestone.

O veredito é PARCIAL por dois motivos concretos:

1. **O RECON-03 — a varredura periódica que re-dispara notificações pendentes ou falhas — não tem
   nenhuma cobertura automatizada.** Sua única prova versionada é
   `supabase/tests/p41_recon_retry_smoke.sql`, que nada executa. É a peça que roda sozinha a cada
   quinze minutos em produção, com Bearer e limite de disparos, e é a menos observada das três.
2. **Este arquivo foi fechado com o mapa de verificação literalmente vazio** — a linha única dizia
   *"a preencher pelo planner"*. A fase entregou; o contrato de amostragem nunca foi escrito. Esta
   auditoria o escreve agora, a partir do que existe.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test (EFs) + Vitest (src utils, se houver) |
| **Config file** | `supabase/functions/deno.json` (EFs); `vitest.config.ts` (src) |
| **Quick run command** | `deno test supabase/functions/resend-webhook/ supabase/functions/notificar-candidato/` |
| **Full suite command** | `deno test supabase/functions/ && npm run test:run` |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the touched EF
- **After every plan wave:** Run the full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (a preencher pelo planner/nyquist-auditor a partir dos PLAN.md) | — | — | RECON-01/02/03 | — | — | unit | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(A linha acima é o esqueleto original, fechado por preencher. O mapa real está na seção seguinte.)*

---

## Per-Requirement Verification Map — estado em 2026-08-09

Preenchido retroativamente pela auditoria, a partir dos artefatos que existem. Medido no repositório
vivo.

| Req ID | Comportamento | Comando / evidência citada por caminho | Roda em portão? | Cobertura |
|--------|---------------|-----------------------------------------|-----------------|-----------|
| RECON-01 | Máquina de estados pendente → enviado → entregue/falhou/bounce completa; o funil avança independentemente do e-mail (a EF nunca devolve 5xx ao trigger) | `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (650 linhas) — a EF registra falha e devolve 200 · `41-VERIFICATION.md:40` | ✅ sim — job `deno-test`, bloqueante | **automatizada** |
| RECON-02 | Webhook do provedor com assinatura verificada atualiza o status pelo identificador da mensagem; forjados são rejeitados | `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts` (179 linhas) — **medido junto com o da EF de notificação: 34/34 verdes, 120 ms** | ✅ sim | **automatizada** |
| RECON-02 (ao vivo) | Reconciliação pelo caminho REAL do provedor | `41-VERIFICATION.md:41,115` — webhook assinado de verdade aceito, transição `enviado → entregue` e depois `→ bounce` observada no banco | ❌ não automatizável sem provedor vivo | **manual, fechada** |
| RECON-03 | A varredura periódica re-dispara pendentes e falhas sob limite, cobrindo a janela do registro de resposta | `supabase/tests/p41_recon_retry_smoke.sql` (259 linhas) asserção (d): predicado de status, limite de tentativas, Bearer de invocação (**não** o de serviço), identificador de retry, limite de lote | ❌ **não** — nenhum job de CI lê `supabase/tests/` | smoke versionado **sem runner** — G-41-02 |
| RECON-02/03 (CI mockado) | A suíte roda **sem** permissão de rede, provando que o provedor está mockado; o guard de ambiente barra destinatário fora do sink de teste | `deno test --allow-env --allow-read --config supabase/functions/deno.json ...` — ausência de `--allow-net` é a prova · `41-VERIFICATION.md:43` | ✅ sim | **automatizada** |

Medido em 2026-08-09: corpus Deno inteiro **424/424 verde em 6 s**.

**Classificação:** 2 de 3 requirements com comando automatizado em portão bloqueante · 1 coberto
apenas por smoke versionado sem runner · o critério ao vivo fechado por prova real.

---

## Gaps Nomeados

### G-41-01 — A infraestrutura de teste registrada neste arquivo não corresponde ao repositório

- **Comportamento sem cobertura:** nenhum — este é um gap de **contrato**, não de código. Mas ele
  desqualifica o arquivo como guia de execução, que é a função dele.
- **Plano de origem:** o próprio `41-VALIDATION.md`, semeado no planejamento da fase.
- **Razão registrada:** nenhuma. Duas divergências medidas:
  - o arquivo cita `vitest.config.ts` como config de Vitest; **esse arquivo não existe** no
    repositório — a configuração é inline, no bloco `test` de `vite.config.ts`;
  - o comando rápido registrado, `deno test supabase/functions/resend-webhook/ supabase/functions/notificar-candidato/`,
    **falha hoje**: aborta com *"Could not find a matching package for `npm:svix@1.99.1`"* em
    `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts:22`, porque falta
    `--config supabase/functions/deno.json`.
- **Comando que fecharia o gap:** o comando correto, medido e verde —
  `deno test --config supabase/functions/deno.json supabase/functions/resend-webhook/ supabase/functions/notificar-candidato/ --allow-env --allow-read`
  → **34 passed, 0 failed, 120 ms**. Registrado aqui como achado; o texto original acima fica como
  está, por decisão de auditoria.

### G-41-02 — A varredura periódica é a peça mais autônoma do sistema e a menos observada

- **Comportamento sem cobertura:** que a função de varredura selecione apenas notificações pendentes
  ou falhas, respeite o teto de tentativas, use o Bearer de **invocação** e não o de serviço, e
  limite o tamanho do lote. Ela roda sozinha a cada quinze minutos em produção; ninguém a chama.
- **Plano de origem:** `41-03-PLAN.md`, que criou `supabase/tests/p41_recon_retry_smoke.sql` no
  commit `ef5c23c` (2026-07-26).
- **Razão registrada:** a mesma das outras fases de banco do M7 — o smoke exige Postgres e o CI não
  provisiona um; a execução se dá via MCP, indisponível a subagentes.
- **Comando que fecharia o gap:** o mesmo job de Postgres de serviço do G-39-01, acrescentando
  `psql -v ON_ERROR_STOP=1 -f supabase/tests/p41_recon_retry_smoke.sql`. Enquanto ele não existir, a
  troca do Bearer de invocação pelo de serviço — o erro que o smoke foi escrito para pegar — passaria
  despercebida.

### G-41-03 — Nada verifica que a tarefa periódica continua agendada e ativa

- **Comportamento sem cobertura:** que o agendamento de quinze em quinze minutos siga vivo. Se ele
  for desabilitado, notificações pendentes deixam de ser re-tentadas em silêncio: nenhum erro,
  nenhum alerta, apenas e-mails que nunca saem.
- **Plano de origem:** `41-04-PLAN.md` / `41-05-PLAN.md` (varredura e fechamento).
- **Razão registrada:** `41-VERIFICATION.md:42` prova que o agendamento estava ativo **na data da
  verificação** — prova de estado, não de continuidade.
- **Comando que fecharia o gap:** uma asserção de catálogo sobre a tabela de agendamentos exigindo a
  entrada ativa, dentro do mesmo smoke do G-41-02 — ou, sem depender de CI com banco, um alerta
  operacional sobre notificações que passem de N horas em pendente.

---

## Achados da auditoria

1. **Os artefatos citados existem e passam.** `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts`
   (179 linhas) e `supabase/tests/p41_recon_retry_smoke.sql` (259 linhas) estão nos caminhos
   registrados; o corpus Deno fecha 424/424.
2. **Duas divergências de comando/config foram medidas e estão nomeadas em G-41-01** — registradas
   como achado, sem edição do texto original, conforme a regra desta auditoria.
3. **A Wave 0 desta fase foi cumprida de fato:** a EF expõe injeção de dependências e a suíte roda
   sem permissão de rede — que era o pré-requisito declarado para mockar o provedor no CI. É o item
   de Wave 0 mais bem cumprido das quatro fases com rascunho.
4. **O UAT ao vivo deixou de ser deferido.** O rascunho original registrava a reconciliação real como
   bloqueada atrás do DELIV-01; o `41-VERIFICATION.md` documenta que o gate caiu e o ciclo real foi
   exercitado. O texto original acima está historicamente correto e operacionalmente superado.

---

## Wave 0 Requirements

- [ ] Refatorar `notificar-candidato/index.ts` para deps injetáveis (fetch/createClient) — pré-req do mock do Resend em CI (gap identificado na RESEARCH.md)
- [ ] Stubs/fixtures de teste para o webhook (payload delivered/bounced/complained + headers Svix) e para o modo retry
- [ ] `deno test` roda sem `--allow-net` (prova de que o Resend está mockado)

*Preenchido em detalhe pelo planner; este é o esqueleto Nyquist.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| UAT ao vivo delivered@/bounced@/complained@resend.dev | RECON-02, RECON-03 | Exige domínio verificado (DELIV-01 aberto) + registro do webhook no dashboard Resend | Deferido atrás de DELIV-01; ver 41-HUMAN-UAT quando gerado |

*Reconciliação real de entrega/bounce/complaint só fecha após DELIV-01.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s (medido: 120 ms no caminho rápido corrigido)
- [ ] `nyquist_compliant: true` set in frontmatter — **NÃO**, e as três razões estão nomeadas em `## Gaps Nomeados`

**Approval:** veredito **PARCIAL** emitido em 2026-08-09 por **auditoria documental** dos artefatos
existentes, **sem re-execução** da fase. Fecha o CONSOL-01 para a Phase 41 com o mapa de verificação
que a fase nunca teve, escrito a partir do que existe.
