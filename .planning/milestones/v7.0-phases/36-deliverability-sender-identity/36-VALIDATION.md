---
phase: 36
slug: deliverability-sender-identity
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-07-22
validated: 2026-08-09
source: auditoria documental retroativa (Phase 47 / Plan 47-05, CONSOL-01)
method: auditoria documental dos artefatos existentes — sem re-execução da fase
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `36-RESEARCH.md` § Validation Architecture.
>
> ⚠ **Veredito acrescentado retroativamente em 2026-08-09** pela Phase 47 (CONSOL-01). Este arquivo
> foi semeado no planejamento e ficou em rascunho, sem veredito, quando a fase fechou. O conteúdo
> original abaixo foi **preservado**; o que este veredito acrescenta são as seções `## Veredito`,
> `## Per-Requirement Verification Map — estado em 2026-08-09`, `## Gaps Nomeados` e
> `## Achados da auditoria`. As divergências encontradas entre o registrado e o repositório vivo
> viraram **achados**, nunca correção silenciosa do texto original.
>
> **A fase não foi re-executada.** Nenhum deploy, nenhuma migration, nenhum envio de e-mail. Os
> testes que já existem foram executados como leitura de estado.

---

## Veredito

**PARTIAL — `status: validated` + `nyquist_compliant: false`.**

Dois dos três requirements (DELIV-02, DELIV-03) têm comando automatizado rodando em portão
bloqueante do CI, e passam hoje. O DELIV-01 é **irredutivelmente meio-manual** — colocação em caixa
de entrada não é observável por API nenhuma — e sua metade humana está fechada e registrada
(`36-HUMAN-UAT.md`, `status: passed`, 2026-07-29).

O que impede a conformidade verdadeira não é o resíduo humano do DELIV-01: é que o **DELIV-02 depende
de um guard cuja integridade nenhum portão verifica**. O `scripts/assert-no-secrets.mjs` roda no
`postbuild` e num step dedicado do CI, mas o meta-teste que prova que ele não é no-op — plantar uma
chave sintética e exigir `exit 1` — foi um experimento manual de uso único, transcrito no docblock do
próprio guard. Se um dos quatro padrões ancorados fosse quebrado por edição, o guard passaria verde
para sempre e nada reprovaria.

Distinção que importa para a auditoria do milestone: o resíduo do DELIV-01 é da mesma família que a
Phase 43 tratou como aceito-permanentemente — não fechável por engenharia. O gap do DELIV-02 é
**fechável com um arquivo de teste**.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest 4.1.9 — `vite.config.ts` `test` block, env `happy-dom` |
| **Framework (Edge Functions)** | `deno test` (Deno 2.7.7) + `deno.land/std@0.224.0/assert` |
| **Config file** | `vite.config.ts` (Vitest) · `supabase/functions/deno.json` (Deno import map) |
| **Quick run command** | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/_shared/__tests__/email-config.test.ts` |
| **Full suite command** | `npm run build` (dispara ambos os gates via `postbuild`) · `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` · `npm run test:run` |
| **Build gates** | `postbuild` → `assert-no-secrets` **&&** `assert-chunks` |
| **Estimated runtime** | ~90 s (build ~60 s + deno ~10 s + vitest ~20 s) |
| **Framework install needed** | **Nenhum** — Vitest e Deno já instalados e já rodando no CI |

---

## Sampling Rate

- **After every task commit:** `node scripts/assert-no-secrets.mjs` (após um `npm run build`) · `deno test … email-config.test.ts`
- **After every plan wave:** `npm run build` (ambos os gates) · `deno test … supabase/functions` · `npm run test:run`
- **Before `/gsd:verify-work`:** suíte completa verde + meta-teste do guard executado + `36-HUMAN-UAT.md` criado com o checklist SC1 explicitamente marcado como pendente
- **Max feedback latency:** ~90 s (quick path ~10 s)

---

## Per-Task Verification Map

> Task IDs preenchidos pelo planner; a coluna Requirement/Comando é o contrato fixo.

| Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|-----------|-------------------|-------------|--------|
| DELIV-01 | Constantes canônicas From/Reply-To/domínio congeladas; From nunca é `resend.dev` | unit (Deno) | `deno test … email-config.test.ts` (caso 7) | ❌ W0 | ⬜ pending |
| DELIV-01 | Domínio existe na conta Resend, `status: verified`, tracking off | script opt-in | `node scripts/check-resend-dominio.mjs` (**nunca no CI**) | ❌ W0 | ⬜ pending |
| DELIV-01 | DMARC publicado | manual + `dig` | `dig +short TXT _dmarc.recruta.beautysmile.com.br` contém `v=DMARC1; p=none` | ❌ runbook | ⬜ pending |
| DELIV-01 | **E-mail real cai na INBOX, não no spam** | **HUMAN-UAT** | irredutível — checklist abaixo | ❌ HUMAN-UAT | ⬜ pending |
| DELIV-02 | Nenhuma chave/endpoint Resend no bundle público | build gate | `npm run build` (postbuild) **e** `node scripts/assert-no-secrets.mjs` | ❌ W0 | ⬜ pending |
| DELIV-02 | O gate é real, não no-op | meta-teste | guard contra `build/` com `re_…` sintético plantado ⇒ **exit 1** | ❌ W0 | ⬜ pending |
| DELIV-02 | Segredo existe no Vault e é legível pela RPC `service_role` | smoke SQL | `select name, length(decrypted_secret) from vault.decrypted_secrets where name='resend_api_key';` → 1 linha, len > 20 | ❌ (depende da chave real) | ⬜ pending |
| DELIV-03 | Env ausente/inválido ⇒ modo `teste` (fail-safe) | unit (Deno) | `email-config.test.ts` casos 1-2 | ❌ W0 | ⬜ pending |
| DELIV-03 | Modo teste redireciona p/ `@resend.dev` preservando o original | unit (Deno) | casos 3-4 | ❌ W0 | ⬜ pending |
| DELIV-03 | Modo produção sem chave ⇒ erro explícito | unit (Deno) | caso 6 | ❌ W0 | ⬜ pending |
| DELIV-03 | CI não precisa de chave viva | CI (observável) | job `deno-test` verde; `grep -rn "RESEND" .github/workflows/ci.yml` retorna **zero** | ✅ (estado atual) | ⬜ pending |
| DELIV-03 | O teste Deno novo não quebra o Vitest | CI | `npm run test:run` verde após adicionar `test.exclude` | ✅ infra, ❌ a linha | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(O mapa acima é o contrato de planejamento, congelado como foi escrito. O estado real medido está
na seção seguinte.)*

---

## Per-Requirement Verification Map — estado em 2026-08-09

Medido no repositório vivo, não copiado.

| Req ID | Comportamento | Comando / evidência citada por caminho | Roda em portão? | Cobertura |
|--------|---------------|-----------------------------------------|-----------------|-----------|
| DELIV-01 | Constantes canônicas de remetente congeladas; From nunca é `resend.dev` | `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions/_shared/__tests__/email-config.test.ts` — **medido: 15/15 verdes, 7 ms**; cobre `supabase/functions/_shared/email-config.ts` | ✅ sim — job `deno-test` do CI, bloqueante | **automatizada** |
| DELIV-01 | Domínio verificado no Resend, região, tracking desligado | `npm run check:resend-dominio` (`scripts/check-resend-dominio.mjs`) | ❌ **deliberadamente fora do CI** — `.github/workflows/ci.yml:110-112` declara a exceção: é o único script do repositório que fala com a rede | reporter opt-in |
| DELIV-01 | DMARC publicado · e-mail cai na Caixa de entrada | `dig +short TXT` + inspeção humana | ❌ não automatizável | **manual, fechada** — `36-HUMAN-UAT.md` `status: passed`, UAT-36-1 fechado em 2026-07-29 com SPF/DKIM/DMARC os três PASS |
| DELIV-02 | Nenhuma chave nem endpoint do provedor no bundle público | `node scripts/assert-no-secrets.mjs` (200 linhas) — encadeado no `postbuild` do `package.json` **e** step dedicado `Secret gate (DELIV-02)` em `.github/workflows/ci.yml:168-169` | ✅ sim, duas vezes | **automatizada** |
| DELIV-02 | **O guard não é no-op** | meta-teste de 4 provas plantadas — executado uma vez, transcrito no docblock `META-TEST` de `scripts/assert-no-secrets.mjs:37-39` e em `36-02-SUMMARY.md:45` | ❌ **não** | **sem cobertura recorrente** — G-36-01 |
| DELIV-02 | Segredo existe no Vault e é legível só por `service_role` | smoke SQL via MCP sobre `vault.decrypted_secrets` | ❌ não | **manual, fechada** — UAT-36-2, 2026-07-26 |
| DELIV-03 | Env ausente ou inválido ⇒ modo teste (fail-safe); modo teste redireciona preservando o destinatário original; modo produção sem chave ⇒ erro explícito | `supabase/functions/_shared/__tests__/email-config.test.ts` (196 linhas, 15 casos) | ✅ sim | **automatizada** |
| DELIV-03 | CI não precisa de chave viva | `grep -c "RESEND" .github/workflows/ci.yml` = 0 | ❌ não roda em portão | fato observável, sem guard — G-36-02 |

**Classificação:** 2 de 3 requirements com comando automatizado em portão · 1 com metade automatizada
e metade irredutivelmente humana (fechada) · 2 propriedades de segurança sem guard recorrente.

---

## Gaps Nomeados

### G-36-01 — O meta-teste que prova o guard de segredos nunca virou arquivo

- **Comportamento sem cobertura:** que `scripts/assert-no-secrets.mjs` **reprove de fato** quando uma
  chave do provedor aparece no bundle. Hoje o portão prova que o bundle está limpo; não prova que o
  detector funciona. Um guard quebrado e um bundle limpo produzem exatamente a mesma saída verde.
- **Plano de origem:** `36-02-PLAN.md:156-168` — o plano especificou as quatro provas, exigiu a
  transcrição no SUMMARY e no docblock, e determinou explicitamente que *"nenhum arquivo de meta-teste
  pode ficar no repo"*. A escolha foi deliberada e está registrada.
- **Razão registrada:** o meta-teste escreve em `build/`, e deixar um artefato de plantio versionado
  seria pior do que o gap. A decisão evitou um risco e criou outro.
- **Comando que fecharia o gap:** um teste que invoque o guard em subprocesso contra um diretório
  **temporário** — nunca `build/` — com uma chave sintética plantada, exigindo saída não-zero, e
  depois sem ela, exigindo zero. O molde já existe no repositório:
  `deno test --allow-env --allow-read scripts/__tests__/` é step bloqueante do CI
  (`.github/workflows/ci.yml:143-144`) e hoje contém apenas `sync-prompts.test.ts`.

### G-36-02 — A ausência de credencial no CI é fato conferido, não invariante guardada

- **Comportamento sem cobertura:** que nenhum workflow passe a exigir uma chave viva do provedor. O
  `grep -c "RESEND"` valendo zero foi conferido na verificação e reconferido hoje; nada impede a
  próxima fase de adicionar a variável e ninguém perceber.
- **Plano de origem:** `36-01-PLAN.md` (DELIV-03).
- **Razão registrada:** nenhuma — o `36-VERIFICATION.md:39` trata o grep como evidência, o que é
  correto para verificar uma vez e insuficiente para proteger.
- **Comando que fecharia o gap:** uma asserção no mesmo arquivo do G-36-01 lendo
  `.github/workflows/ci.yml` e exigindo zero ocorrência do nome da variável de credencial —
  a mesma técnica de sonda de texto-fonte que `docs/compliance/__tests__/` já usa neste repositório.

### G-36-03 — O `check:resend-dominio` cobre a parte automatizável do DELIV-01 e não roda nunca

- **Comportamento sem cobertura:** que o domínio de envio continue `Verified`, na região certa, com
  tracking desligado. A propriedade pode regredir no painel do provedor sem nenhum sinal no repositório.
- **Plano de origem:** `36-03-PLAN.md` — o script nasceu como reporter opt-in por desenho.
- **Razão registrada:** `.github/workflows/ci.yml:110-112` — exceção **declarada**: o script fala com
  a rede e exige credencial viva; mantê-lo fora do CI é decisão travada da fase, não esquecimento.
- **Comando que fecharia o gap:** `npm run check:resend-dominio` num workflow **agendado** e separado
  do CI de PR, com a credencial em segredo de repositório. É trabalho de operação, não de teste —
  e enquanto não existir, o gap é real e deve ser lido como tal.

---

## Achados da auditoria

1. **Divergência de domínio — o texto original está desatualizado, e foi mantido como estava.**
   Este arquivo cita `recruta.beautysmile.com.br` (linhas 49, 86, 89, 93) e
   `recrutamento@beautysmile.com.br` como Reply-To. O repositório vivo declara
   `DOMINIO_ENVIO = 'rh.beautysmile.com.br'` (`supabase/functions/_shared/email-config.ts:21`) e
   `REPLY_TO = 'rh@beautysmile.com.br'` (`:36`) — que é também o que o `36-HUMAN-UAT.md` fechado usa.
   O domínio mudou entre o planejamento e a execução. **Não corrigi o texto original**: a divergência
   é o achado. Quem ler este arquivo deve tomar `email-config.ts` como fonte da verdade.
2. **O corpus de teste do DELIV-03 cresceu.** O `36-VERIFICATION.md:39` registra 9/9 casos Deno;
   hoje são **15/15** em `email-config.test.ts` (196 linhas) — crescimento por code review da própria
   fase e por fases seguintes, não regressão.
3. **O guard cresceu de 181 para 200 linhas** desde a verificação. Continua encadeado no `postbuild`
   e com step próprio no CI; nenhuma quebra.
4. **O corpus Deno inteiro está verde hoje:** `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions`
   — **424 passed, 0 failed, 6 s** (medido).

---

## Wave 0 Requirements

- [ ] `supabase/functions/_shared/__tests__/email-config.test.ts` — cobre DELIV-01 (constantes) + DELIV-03 (modo/destinatário/chave)
- [ ] `vite.config.ts` → 1 entrada em `test.exclude` para o arquivo acima — **na mesma tarefa**, nunca separada (Pitfall 8; o próprio arquivo documenta que esse erro já ocorreu duas vezes, `vite.config.ts:38-43`)
- [ ] `scripts/assert-no-secrets.mjs` — cobre DELIV-02
- [ ] Meta-teste do guard (plantar/remover secret sintético) — prova que DELIV-02 não é no-op
- [ ] `scripts/check-resend-dominio.mjs` — automatiza a parte checável do DELIV-01
- [ ] `docs/runbooks/resend-dominio-envio.md` — novo diretório + runbook
- [ ] Instalação de framework: **nenhuma**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| E-mail real cai na Caixa de entrada (não Spam) em Gmail e Outlook | DELIV-01 | Colocação em inbox não é observável por API — nenhum provedor expõe isso; depende de reputação e de heurística do destinatário | Checklist de 9 itens abaixo |
| Publicação dos records DNS | DELIV-01 | Ação humana no painel do provedor de DNS (fora do controle do repo) | Runbook `docs/runbooks/resend-dominio-envio.md`; verificação por `dig` + `check-resend-dominio.mjs` |
| Criação do segredo no Vault | DELIV-02 | Depende de o Fernando gerar a chave prod no dashboard do Resend; sem placeholder por decisão do CONTEXT | `vault.create_secret` via Supabase MCP + smoke SQL |

### HUMAN-UAT — SC1 (DELIV-01), 9 itens

1. Domínio `recruta.beautysmile.com.br` mostra **Verified** no dashboard Resend (região `sa-east-1`).
2. Open tracking e click tracking **desligados** nesse domínio.
3. `dig` confirma os 3-4 records do Resend + o TXT em `_dmarc.recruta.beautysmile.com.br`.
4. Enviar 1 e-mail de teste **de** `nao-responda@recruta.beautysmile.com.br` **para** uma conta **Gmail** e uma **Outlook/Hotmail** pessoais.
5. Em ambas: mensagem na **Caixa de entrada**, não em Spam / Promoções-com-aviso.
6. No Gmail: "Mostrar original" → `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
7. O remetente exibido é **"Beauty Smile Recrutamento"**.
8. Responder o e-mail → a resposta chega em `recrutamento@beautysmile.com.br`.
9. Registrar data + prints em `36-HUMAN-UAT.md` (padrão P22–P35).

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, nunca `vitest`)
- [x] Meta-teste do guard executado — DELIV-02 comprovadamente não é no-op **na data da execução**; não é reexecutável por portão (G-36-01)
- [x] Feedback latency < 90 s (medido: 7 ms no caminho rápido do Deno)
- [ ] `nyquist_compliant: true` set in frontmatter — **NÃO**, e as três razões estão nomeadas em `## Gaps Nomeados`

**Approval:** veredito **PARCIAL** emitido em 2026-08-09 por **auditoria documental** dos artefatos
existentes, **sem re-execução** da fase (nenhum deploy, nenhuma migration, nenhum envio). Fecha o
CONSOL-01 para a Phase 36 com a cobertura declarada em vez de suposta.
