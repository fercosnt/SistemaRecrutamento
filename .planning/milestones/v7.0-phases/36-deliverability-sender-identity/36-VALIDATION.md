---
phase: 36
slug: deliverability-sender-identity
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
---

# Phase 36 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `36-RESEARCH.md` § Validation Architecture.

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
- [ ] Meta-teste do guard executado — DELIV-02 comprovadamente não é no-op
- [ ] Feedback latency < 90 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
