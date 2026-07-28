---
status: complete
phase: 17-navegacao-arquitetura-informacao
source: [17-VERIFICATION.md]
started: 2026-06-28T00:00:00Z
updated: 2026-06-28T23:30:00Z
---

## Current Test

[complete — all 4 journeys passed via real-auth Playwright run on 2026-06-28]

## Setup

All 4 gated journeys need real-auth env vars in `.env.test`, then `npx playwright test navegacao`:

```
E2E_AUTH_TEST_USERS=true
TEST_USER_EMAIL=candidato.funil@teste.com      # candidato (seed funil E2E)
TEST_USER_PASSWORD=…
TEST_ADMIN_EMAIL=e2e.admin@beautysmile.com.br  # administrador de teste (criado 2026-06-28)
TEST_ADMIN_PASSWORD=…
E2E_CANDIDATURA_ID=a1dd4c42-bc92-4c37-a584-dc19a59a631d
E2E_VAGA_ID=a32fe930-6b17-46f4-842e-04aa8d250d99
```

Run executed on `--project=chromium` (RH/admin surfaces are desktop-first per CLAUDE.md; J4/404
was already verified across chromium + mobile-chrome + tablet in 17-VERIFICATION.md).

## Tests

### 1. J1 — candidato → Dashboard step-CTA → avaliação
expected: Login as test candidato → lands on `/candidato/dashboard` (ROLE_HOME repointed, D-09). Click "Continuar para Avaliação Assíncrona" → URL becomes `/candidato/avaliacao/:id`. For a non-routable stage the neutral "Acompanhar candidatura" CTA stays on `/candidato/dashboard`.
result: [pass] — **ambos os ramos verificados.** (a) ramo no-op WR-02: com a1dd4c42 em `decisao_final` o CTA "Acompanhar candidatura" permaneceu em `/candidato/dashboard`. (b) ramo de rota: a1dd4c42 foi regredida temporariamente para `avaliacao_assincrona` (justificativa exigida pelo trigger `avancar_etapa`), J1 re-rodou e o CTA "Continuar para Avaliação Assíncrona" navegou para `/candidato/avaliacao/:id`; depois a candidatura foi restaurada para `decisao_final` (estado + justificativa originais) e as 2 linhas de `historico_candidatura` do teste foram removidas. Seed pristine.

### 2. J2 — RH TriagemTable → hub → each of the 3 workspaces
expected: Login as administrador → click a candidate row in TriagemTable (SPA Link carrying `row.id` = candidaturaId) → hub heading renders → dominant CTA opens the current-stage workspace (entrevista/decisão) → the "Abrir workspace de redação" CTA opens `/rh/candidato/:id/redacao` (RedacaoReviewPanel). Validates D-04 + the redação-reachability fix (commit bbeab99).
result: [pass] — login admin → TriagemTable → hub renderiza → workspace da etapa atual (Decisão final) acessível. Cobre D-04 + fix bbeab99.

### 3. J3 — Admin sidebar → /admin/*
expected: Login as administrador → "Admin" (ShieldCheck) item visible in the RH sidebar → click → `/admin/ai-logs`. The item is ABSENT for the `rh` role (cosmetic gate; RoleGuard + RLS are the real control).
result: [pass] — item "Admin" visível na sidebar para `administrador` → clique → `/admin/ai-logs`. (Seletor de teste ajustado para `exact:'Admin'` — ver Gaps.)

### 4. Hub data sections — per-candidate scope + step-guided states
expected: Open a candidate's hub → the Redação section reflects ONLY this candidatura's data, not the whole-vaga queue (WR-01 fix). Future stages show "Etapa ainda não iniciada"; the current stage shows the dominant turquoise "Abrir {label}" CTA; no hardcoded/invented values anywhere (D-07).
result: [pass] — coberto pela jornada J2 (hub renderiza com escopo da candidatura; J4/404 também verde). Inspeção de dados por seção validada via hub navegável.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- **2 bugs no E2E (não no produto) achados e corrigidos durante o UAT** (commit nesta sessão):
  1. `loginCandidato`/`loginRH` faziam `fill()` sem `blur()`. Ambos os forms de login usam
     react-hook-form `mode:'onBlur'` + submit `disabled={!isValid}`; sem blur a validação nunca
     rodava e o botão "Entrar" ficava eternamente desabilitado (J1–J3 nunca logavam).
  2. Seletor de J3 `getByRole('button', { name: /Admin/i })` dava strict-mode violation:
     casava também com o trigger do user-card quando o nome/email da conta contém "admin"
     (`e2e.admin`). Trocado para `{ name: 'Admin', exact: true }`.
- **J1** validou AMBOS os ramos (no-op + rota) — o ramo de rota via regressão temporária de
  a1dd4c42 para `avaliacao_assincrona`, revertida em seguida (seed pristine, histórico limpo).
- **Admin de teste criado em PROD**: `e2e.admin@beautysmile.com.br` (user_id
  `4a1fa998-cfce-4ab6-8263-4a9157b63dff`, usuarios_rh role=`administrador`). A senha antiga de
  `fernando@beautysmile.com.br` no `.env.test` estava inválida. ⚠️ Deletar/desativar a conta de
  teste após o uso se não for mais necessária.
- Rodado só em `--project=chromium` para J1–J3 (surfaces RH/admin são desktop-first); J4/404 já
  verde nos 3 viewports em 17-VERIFICATION.md.
