# Phase 21 — Runbook de re-validação humana (live PROD)

Guia auto-contido para o Fernando re-validar tudo. Tudo já foi validado por mim onde
determinístico (Playwright/Supabase/curl) + 3 defeitos corrigidos; este runbook cobre
o resíduo VISUAL/INTERATIVO (o que precisa de olho humano / leitor de tela) + um
re-check opcional dos itens já verdes.

## Setup (uma vez)

```bash
cd "/Users/fernando/Cursor Repo/DB Sistema de recrutamento"
npm run dev          # app em http://localhost:3003 → backend PROD Supabase
```

**Contas (em `.env.test`):**
- Candidato: `candidato.funil@teste.com`  (login em `/auth/login`)
- Admin/RH: `e2e.admin@beautysmile.com.br` (login em `/auth/login-rh`)
- (RH role 'recrutador' p/ teste de posse: `recrutador.rh@teste.com` — peça/redefina a senha se for testar o caminho sem-posse pela UI)

**Dados de teste (PROD, vaga `[TESTE] Dentista — Funil E2E`):**
- Candidatura `a1dd4c42-bc92-4c37-a584-dc19a59a631d` (decisao_final) — funil completo, guia online já populado (1 manual + 5 IA), devolutiva gerada.
- Candidatura `f73682b6-7827-4e89-b6c1-f25116a30083` (avaliacao_assincrona) — limpa p/ exercitar o fluxo de avaliação do candidato.

> Login: os forms usam RHF `mode:'onBlur'` — depois de digitar email/senha, **clique fora (blur)** antes de "Entrar", senão o botão fica desabilitado. (Não é bug.)

---

## A) Itens VISUAIS a confirmar (resíduo)

### UAT-21-A · P18-02 — AsyncState (loading → lento → erro → "Tentar novamente")
Telas: BigFive, SJT caso aberto, Redação (candidato) · Consolidação, Comparativo (RH).
- Abra cada tela com uma chamada de IA lenta/instável. **Esperado:** spinner → nota de "está demorando" (~8s) → em falha, erro legível + botão **"Tentar novamente"** visível; `AI_UNAVAILABLE` mostra a copy de *sobrecarga*, outras falhas a genérica; **nunca tela em branco**. Telas de leitura de DB mostram "Carregando…" neutro (não a copy de IA).
- _Status atual:_ contrato `<AsyncState>` unit-testado + adotado nas 5 telas (P18). Falta o olho humano sob latência real.

### UAT-21-B · P19-02 — Frescor cross-client ≤60s
- Aba 1: logado como **candidato** em `/candidato/dashboard`. Aba 2: como **RH**, mude o status do candidato / salve um scorecard de entrevista / salve uma revisão de redação.
- **Esperado:** o dashboard do candidato reflete a mudança em **≤60s** (ao focar a aba — `refetchOnWindowFocus` + staleTime 1min). O dashboard de Consolidação do RH atualiza **imediatamente** após salvar (invalidação alvo `decisaoKeys.consolidacao`).
- _Status atual:_ invalidação alvo unit-testada verde (19-03). Falta a confirmação live de duas sessões.

### UAT-21-C · P16 #3 — Foco por teclado (roving focus + anel de foco no glass)
- Só teclado (sem mouse): em `DecisaoFinalPage` / `EntrevistaWorkspace` os **Tabs** (setas movem, Enter/Space ativa); em `RegistrarDecisaoForm` (RadioGroup) e nos grupos de opção do SJT, **ArrowUp/Down/Left/Right** movem a seleção (roving). Anel de foco **visível** sobre o fundo glass.
- _Status atual:_ Tabs/RadioGroup são primitivos Radix (roving nativo); navegação E2E alcança os workspaces. Falta o check visual do anel de foco.

### UAT-21-D · P16 #4 — Leitor de tela anuncia o autosave (AB-8) — **fix aplicado, confirmar**
- Com VoiceOver (⌘F5) ou NVDA ativo, interaja com o BigFive (e telas com autosave). **Esperado:** "Salvando…" / "Salvo automaticamente" são **anunciados** (agora há `role="status" aria-live="polite"`).
- _Status atual:_ região aria-live estava **ausente → corrigida** nesta fase (commit ce2d683). Falta só o teste literal com leitor de tela.

### UAT-21-E · P11 #4 — Autosave 30s + estado travado
- No fluxo de avaliação do candidato (`f73682b6`), observe o autosave debounced ~30s. Depois, como RH, avance a etapa além de `avaliacao_assincrona` e volte ao candidato → tentar editar mostra estado **travado neutro** ("Sua etapa avançou…"), sem toast de erro.
- _Status atual:_ back-lock server-side verificado (write RLS → 42501). Falta o olho na UX de autosave/locked.

### UAT-21-F · P16 #2 — axe Tier-B populado (R5 Redação / C5 BigFive)
- Faça login real e navegue até uma **RedacaoReviewPanel** populada (RH) e um **BigFive** com 120 itens (candidato); rode axe-core (DevTools axe ou a extensão) → **zero serious/critical**.
- _Nota:_ o teste Playwright `a11y Tier-B` atual **não faz login** (faz só `page.goto`) → não exercita a tela populada. Tier-A (15 telas) está verde: `npx playwright test e2e/a11y.spec.ts --project=chromium --workers=1` (use `--workers=1` — em paralelo total o axe pisca falso-positivos por render transiente).

---

## B) Itens já validados por mim (re-check opcional)

- **P18-03 / FIX-01 consolidar** ✅ — `consolidar-decisao-final` (a1dd4c42) → 55.55; SJT 83.33 (só mc sucesso, caso pendente excluído); entrevista pendente tratada (WR-02); sem NaN.
- **P18-01/02 RESIL-02** ✅ — `gerar-devolutiva-bigfive` 13.4s (5 dims paralelas; antes estourava timeout) e **passou a PERSISTIR** (defeito F1 corrigido).
- **P20-01 write-path** ✅ — `save_entrevista_guia_edits`: admin → 200; candidato → 403/42501 (negação limpa).
- **P20-02 regen merge-preserve** ✅ — regen falho preserva o manual (Pitfall-3); regen ok = 1 manual + 5 IA.
- **P19-01 lazy routes** ✅ — `E2E_AUTH_TEST_USERS=true E2E_CANDIDATURA_ID=a1dd4c42-… E2E_VAGA_ID=a32fe930-… npx playwright test e2e/navegacao.spec.ts --project=chromium` → 4/4.
- **P16 #1 login RH** ✅ — provado pela navegação E2E (admin → /rh, /admin).
- **gerar-guia timeout (F2)** ✅ — RH consegue gerar/regenerar guia de novo (antes 500 em toda geração).

## C) Defeitos corrigidos nesta fase (já em PROD)
1. `6501f70` — devolutiva-bigfive persiste o **auth uid** (corrige FK 23503 → devolutiva nunca gravava).
2. `0e85ee6` — **timeout per-call** no callAi; gerar-guia (60s) volta a funcionar (era 500 em toda geração).
3. `ce2d683` — autosave com **região aria-live** persistente (P16 #4).

Gates verdes após os fixes: **vitest 692/692 · tsc 257 · build ✓ · Deno EF 19/19**.
