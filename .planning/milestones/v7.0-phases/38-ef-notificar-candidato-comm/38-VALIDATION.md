---
phase: 38
slug: ef-notificar-candidato-comm
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-23
validated: 2026-08-09
source: auditoria documental retroativa (Phase 47 / Plan 47-05, CONSOL-01)
method: auditoria documental dos artefatos existentes — sem re-execução da fase
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `38-RESEARCH.md` → `## Validation Architecture`.
>
> ⚠ **Veredito acrescentado retroativamente em 2026-08-09** pela Phase 47 (CONSOL-01). O conteúdo
> original foi **preservado**; o veredito, o mapa medido, os gaps e os achados são o que esta
> auditoria acrescenta. Divergências entre o registrado e o repositório vivo viraram **achados**.
>
> **A fase não foi re-executada** — nenhum deploy, nenhum envio, nenhuma chamada ao provedor.

---

## Veredito

**PARTIAL — `status: validated` + `nyquist_compliant: false`.**

Os seis requirements COMM têm hoje cobertura automatizada rodando no job `deno-test` do CI, que é
bloqueante. Medido em 2026-08-09: o corpus Deno inteiro fecha **424/424 verde em 6 s**. Em pura
cobertura presente, esta é a segunda melhor das seis fases do M7.

O veredito é PARCIAL por uma razão que a própria história do projeto provou, e não por um detalhe de
forma: **a suíte desta fase deu verde sobre um defeito CRÍTICO que chegou a produção.** O
`corpoDecisao` e os assuntos em `supabase/functions/_shared/email-templates.ts` — artefato desta fase
— não tinham um único caso exercitando o desfecho da decisão. Quando a Phase 39 ligou os triggers,
**um candidato aprovado recebeu a cópia de rejeição** (CR-01). O guard de regressão só nasceu no
commit `f3b7304`, em 2026-07-27, **depois** do incidente — e hoje vive em
`supabase/functions/_shared/__tests__/email-templates.test.ts:86-130`.

A lição está registrada aqui porque é o único lugar em que a auditoria do milestone vai procurá-la:
a cobertura desta fase era de **renderização**, não de **ramificação**. Verde não significava correto.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `deno test` (Supabase Edge Functions run on Deno, not the Vitest/src harness) |
| **Config file** | `supabase/functions/deno.json` |
| **Quick run command** | `deno test supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/_shared/__tests__/ics.test.ts --allow-env --allow-read` |
| **Full suite command** | `deno test supabase/functions/ --allow-env --allow-read` |
| **Estimated runtime** | ~5–15 seconds (no `--allow-net`; fetch is mocked) |

> Note: `npm run lint` (tsc) covers `src/**` only; Deno EF code is type-checked by `deno test`. The pre-existing 97-error `src/**` baseline is unrelated to this phase — keep it at 97 (documented husky infra-debt).

---

## Sampling Rate

- **After every task commit:** Run `{quick run command}`
- **After every plan wave:** Run `{full suite command}`
- **Before `/gsd:verify-work`:** Full Deno suite green + grep-guard green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

> Draft — exact task IDs are populated by the planner (step 8). Rows below map each COMM requirement to its proof type from the Validation Architecture; the planner attaches `<automated>` commands per task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | ics port | 1 | COMM-04 | — | `.ics` PUBLISH, TZ America/Sao_Paulo, base64 round-trips | unit | `deno test .../ics.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |
| TBD | templates | 1 | COMM-06 | — | rejection HTML has NO scoring tokens (grep-guard); no react-email import | unit + source | `deno test .../email-templates.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |
| TBD | templates | 1 | COMM-02/03/05 | — | confirmação/avanço/decisão render correct subject + body | unit | `deno test .../email-templates.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |
| TBD | EF | 2 | COMM-01 | T-38 self-auth | Bearer≠service_role ⇒ 401; no `select('*')`; ledger 2-phase write; returns 200 on send-fail | unit + source | `deno test .../notificar-candidato.test.ts --allow-env --allow-read` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(O mapa acima é o contrato de planejamento, congelado como foi escrito. O estado real medido está
na seção seguinte.)*

---

## Per-Requirement Verification Map — estado em 2026-08-09

Medido no repositório vivo, não copiado. Todos os comandos abaixo entram no job `deno-test` do CI,
que roda `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions`
e é **bloqueante** (`.github/workflows/ci.yml:136-137`).

| Req ID | Comportamento | Comando / evidência citada por caminho | Roda em portão? | Cobertura |
|--------|---------------|-----------------------------------------|-----------------|-----------|
| COMM-01 | Self-auth: Bearer diferente do service_role ⇒ 401; sem `select('*')`; escrita de ledger em 2 fases; devolve 200 mesmo quando o envio falha | `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` (650 linhas) | ✅ sim | **automatizada** |
| COMM-01 | Vocabulário de eventos estável entre trigger e EF | `supabase/functions/notificar-candidato/__tests__/vocabulario-eventos.test.ts` | ✅ sim | **automatizada** |
| COMM-01 (critério 4) | Envio ponta-a-ponta ao vivo | `38-HUMAN-UAT.md` — `status: passed`, fechado em 2026-07-28 com `status='enviado'`, `provider_message_id` real e reconciliação para `entregue` em 5 s | ❌ não automatizável sem PROD | **manual, fechada** |
| COMM-02/03/05 | Confirmação, avanço e decisão renderizam assunto e corpo corretos | `supabase/functions/_shared/__tests__/email-templates.test.ts` | ✅ sim | **automatizada** |
| COMM-04 | `.ics` PUBLISH, fuso America/Sao_Paulo, round-trip base64 preservando acento | `supabase/functions/_shared/__tests__/ics.test.ts` — **medido junto com o de templates: 31/31 verdes, 22 ms** | ✅ sim | **automatizada** |
| COMM-06 | O HTML de rejeição não carrega token de pontuação | `email-templates.test.ts` (grep-guard) | ✅ sim | **automatizada** |
| COMM-02/05 (ramificação) | Desfecho `aprovado` renderiza aprovação e **nunca** a rejeição; desfecho ausente é fail-safe para rejeição | `email-templates.test.ts:91-116` + `notificar-candidato.test.ts:530` — **acrescentados em `f3b7304` (2026-07-27), depois do incidente** | ✅ sim, **hoje** | automatizada **a posteriori** — G-38-01 |
| COMM-01 (paridade com PROD) | A EF deployada é a mesma do repositório | nenhuma | ❌ não | **sem cobertura** — G-38-02 |

**Classificação:** 6 de 6 requirements com comando automatizado em portão bloqueante · 1 deles com
o critério ao vivo fechado por UAT humano · 2 propriedades estruturais sem guard.

---

## Gaps Nomeados

### G-38-01 — A cobertura da fase não exercitava a ramificação do desfecho, e o defeito chegou a produção

- **Comportamento sem cobertura (à época):** que o evento `decisao` renderizasse a cópia **correta**
  para cada desfecho. Os testes cobriam que cada template renderiza; nenhum cobria qual template é
  escolhido. Consequência real: candidato aprovado recebeu a cópia de rejeição (CR-01, registrado em
  `39-VERIFICATION.md:9-19`).
- **Plano de origem:** `38-02-PLAN.md` (templates) — a `<verify>` pedia render de cada um dos quatro
  templates e o grep-guard da rejeição, nunca a escolha entre eles.
- **Razão registrada:** o desfecho é resolvido **na EF** a partir de `etapa_atual`, porque o corpo do
  trigger é ids-only por exigência de PII (DISPATCH-04). A ramificação nasceu na fronteira entre duas
  fases e ficou sem dono nas duas.
- **Comando que fecharia o gap — e que hoje o fecha:**
  `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/notificar-candidato/`
  — os casos `CR-01` e `CR-02` já existem e rodam no CI. **O gap está fechado como código e permanece
  aberto como lição:** ele foi fechado por incidente, não por portão.

### G-38-02 — Nada verifica que a EF em produção é a EF do repositório

- **Comportamento sem cobertura:** paridade entre a fonte versionada e a função deployada. O ciclo
  inteiro do CR-01 dependeu de um redeploy manual (v2 → v3, `39-VERIFICATION.md:17`), e a prova de
  que o deploy pegou foi inspeção humana da fonte deployada via MCP.
- **Plano de origem:** `38-04-PLAN.md` (deploy) — o deploy foi deliberadamente adiado para sessão
  humana, então nenhum plano assumiu a paridade.
- **Razão registrada:** `38-HUMAN-UAT.md` — a chave do Vault não existia em 2026-07-23, e o operador
  optou por adiar deploy e smoke para uma sessão humana única. Decisão correta; deixou a paridade
  sem dono.
- **Comando que fecharia o gap:** um step que compare o hash da fonte local com o retorno de
  `get_edge_function` do projeto, ou — mais simples e sem MCP — um passo de deploy versionado que
  publique a EF a partir do CI, tornando a paridade estrutural em vez de verificada.

### G-38-03 — Adicionar um teste Deno sob `supabase/functions/` pode quebrar a suíte Vitest, e nada guarda isso

- **Comportamento sem cobertura:** que todo teste com especificador `https:` ou `npm:` esteja na lista
  `exclude` do bloco `test` de `vite.config.ts`. Os três testes Deno **desta fase** não foram
  incluídos e reprovaram `npm run test:run` no repositório inteiro até a Phase 40 corrigir
  (`40-VERIFICATION.md:38`). O próprio `vite.config.ts` documenta, em comentário, que o erro já
  ocorreu mais de uma vez.
- **Plano de origem:** `38-01-PLAN.md` / `38-02-PLAN.md` — os planos que criaram `ics.test.ts`,
  `email-templates.test.ts` e o teste da EF.
- **Razão registrada:** o `vite.config.ts` explica que a entrada é **literal por opção**, nunca um
  glob de diretório, porque `strict-schema.test.ts` mora na mesma pasta e precisa continuar rodando
  sob Vitest. A precisão exigida é justamente o que torna a omissão fácil.
- **Comando que fecharia o gap:** um teste Vitest que varra `supabase/functions/**` atrás de arquivos
  de teste contendo `https://deno.land` ou `npm:` e exija que cada caminho apareça no `exclude` de
  `vite.config.ts`. Roda em `npm run test:run` e converte um erro recorrente em falha determinística.

---

## Achados da auditoria

1. **Divergência: o comando de suíte completa registrado neste arquivo FALHA hoje.** O texto original
   registra `deno test supabase/functions/ --allow-env --allow-read`, sem `--config`. Executado em
   2026-08-09, ele aborta com *"Could not find a matching package for `npm:svix@1.99.1`"* em
   `supabase/functions/resend-webhook/__tests__/resend-webhook.test.ts:22`. A causa é posterior a
   esta fase: a Phase 41 trouxe uma dependência `npm:` para o corpus. O comando correto é o do CI,
   com `--config supabase/functions/deno.json`. **Registrado como achado, não corrigido no texto original.**
2. **O comando rápido registrado continua correto.** `deno test supabase/functions/_shared/__tests__/email-templates.test.ts supabase/functions/_shared/__tests__/ics.test.ts --allow-env --allow-read`
   — medido: **31/31 verdes, 22 ms**. Sem divergência.
3. **Os quatro arquivos de teste da Wave 0 existem** nos caminhos registrados, e o de EF cresceu para
   650 linhas com os casos de gap-closure da Phase 39.
4. **O `38-HUMAN-UAT.md` está fechado** (`status: passed`, 2026-07-28) — o único proof não-autônomo
   da fase não ficou pendurado.

---

## Wave 0 Requirements

- [ ] `supabase/functions/_shared/__tests__/ics.test.ts` — `.ics` parity vs M6 fixture + base64 round-trip (COMM-04)
- [ ] `supabase/functions/_shared/__tests__/email-templates.test.ts` — render each of 4 templates + rejection grep-guard (COMM-02/03/05/06)
- [ ] `supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts` — mocked-fetch request-shape + self-auth + allowlist source assertions (COMM-01)
- [ ] Mocked `fetch` indirection so the EF's Resend request is asserted without `--allow-net`

*Existing `deno test` infrastructure (`supabase/functions/_shared/__tests__/`) covers the harness; only the new test files above are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end live send | COMM-01 (criterion 4) | Requires dormant EF **deploy** (`--no-verify-jwt`), a live Vault `RESEND_API_KEY`, and Supabase MCP — GSD executor subagents lack MCP tools (upstream bug). Orchestrator checkpoint. | After deploy, `net.http_post` to the EF with a Vault Bearer + real test candidatura id + `evento` (mode teste). Assert: (a) email lands at `delivered+<evento>@resend.dev`; (b) `notificacoes_enviadas` row exists with `status='enviado'` + non-null `provider_message_id`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags (no `deno test --watch`)
- [x] Feedback latency < 15s (medido: 22 ms no caminho rápido)
- [ ] `nyquist_compliant: true` set in frontmatter — **NÃO**, e as três razões estão nomeadas em `## Gaps Nomeados`

**Approval:** veredito **PARCIAL** emitido em 2026-08-09 por **auditoria documental** dos artefatos
existentes, **sem re-execução** da fase. Fecha o CONSOL-01 para a Phase 38 registrando que a suíte
desta fase deu verde sobre um defeito crítico — a cobertura era de renderização, não de ramificação.
