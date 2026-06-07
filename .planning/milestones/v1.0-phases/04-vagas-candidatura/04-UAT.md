---
status: complete
phase: 04-vagas-candidatura
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
  - 04-06-SUMMARY.md
  - 04-07-SUMMARY.md
  - 04-08-SUMMARY.md
prior_uat:
  - 04-08-UAT.md (plan-level, 6/6 PASS at 2026-04-26 pre-iteration-fixes)
fixes_under_test:
  - iteration-1: WR-01..WR-06 (commits 0eabead..5c7c7b1)
  - iteration-2: WR-07..WR-10 (commits 6195b75, c9c50c6, 33915a2, 78fc854)
started: 2026-04-26T07:30:00Z
updated: 2026-04-26T08:30:00Z
completed: 2026-04-26T08:30:00Z
---

# Phase 4 UAT — Vagas + Candidatura (Phase-Level Regression)

This UAT focuses on regression of iteration 1+2 code-review fixes (WR-01..WR-10) on top of the already-verified plan-level UAT (`04-08-UAT.md` = 6/6 PASS pre-fixes). Tests prioritize user-observable behavior changed by the fixes plus the canonical happy path.

**Pre-flight:** Edge Function `submit-candidatura` must be redeployed to land WR-09 (`supabase functions deploy submit-candidatura`). Frontend must be rebuilt/served via `npm run dev` for the FE-side fixes (WR-07, WR-08, WR-10).

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill dev server, run `npm run dev`. Vite boots on :3003 without errors. App root renders, auth-store hydrates without crash.
result: pass

### 2. Anonymous /vagas Browse (WR-10 regression)
expected: Open /vagas in a private/incognito window (logged-out). Vaga list renders with title, departamento, modalidade, localização. Per-card aggregate counts (totalCandidatos, candidatosEmAnalise, candidatosAprovados) are absent or hidden — no count badges leaking RLS-protected aggregates.
result: issue
reported: "ok, o botao candidatar-se a esta vaga esta mal diagramado, o icone esta no cando acima, o texto esta centralizado abaixo, e achoq ue ele deveria ficar fixo embaixo nao sobrepondo os outros textos"
severity: minor
note: "WR-10 target (count-leak prevention) appears to pass — issue reported is a separate UI/layout regression on the 'Candidatar-se a esta vaga' button card on /vagas list."

### 3. Anonymous Vaga Detail (WR-10 regression)
expected: From /vagas (anon), click a vaga card → navigates to /vagas/{slug}. Detail renders with title/descrição/requisitos/modalidade. "Já me candidatei?" UI absent or shows generic logged-out CTA. No PII or admin-only counts visible.
result: pass

### 4. Auth-gate flap test (WR-07 regression)
expected: Logged in as candidato. Hard-refresh `/candidato/candidatura/formulario/{slug}` of an open vaga. Page renders the form steadily — no flash of "redirecting to login" or bounce to /login during auth-store hydration. Stays on form.
result: pass
side_finding: "Páginas /vagas (lista) e /vagas/{slug} (detalhe) não exibem header de usuário autenticado — sem botão 'Área do candidato' nem botão 'Sair' quando logado. Logged-in candidate has no navbar/logout affordance on these pages."

### 5. Logged-out access to candidatura form (WR-07 regression)
expected: Logged-out browser hits `/candidato/candidatura/formulario/{slug}` directly. Redirects to /candidato/login (via RoleGuard, single source of truth). After login, ?redirect= consumption returns user to the formulário.
result: pass

### 6. Vaga share-button clipboard (WR-08)
expected: On a vaga detail page, click the "Compartilhar"/share icon. Toast says "Link copiado!" AFTER the clipboard write actually resolves. Pasting in another tab pastes the vaga URL. If clipboard permission is denied (revoke in DevTools), an ERROR toast surfaces with manual-copy hint, NOT a false "copiado!" success toast.
result: pass

### 7. Submit candidatura happy path (canonical regression)
expected: Logged in as candidato with completed cadastro. Pick an open vaga, complete the form (CV PDF ≤5MB + answer required perguntas). Submit. Toast "Candidatura enviada com sucesso!" appears, redirect to status page. New row appears in `candidaturas` (CV path matches `{auth.uid()}/{uuid}.pdf`).
result: pass
evidence: |
  Vaga: teste-coordenador-rh-sede (3 perguntas seeded for this cycle).
  Toast "Candidatura enviada com sucesso!" + redirect to /candidato/perfil.
  Candidatura row visible on /candidato/perfil.
  DB row: id=04864650-61d9-4bb9-9ccf-083318319f98, status=aguardando_resposta,
  etapa_atual=triagem, curriculo_url=4fceff36-.../55600c74-....pdf (D-10 schema).
  Pitfall 7 redacted console shape preserved.
  Iter-1 (WR-01..06) + iter-2 (WR-07..10) — zero regressions on happy path.
known_carryover: "F-04-08-G — text in form/CV section renders dark on light glass against dark gradient BackgroundImage. Non-blocking. Tracked for Phase 5 visual polish."

### 8. Submit with oversized respostas array (WR-09)
expected: With DevTools, intercept the EF call and inflate `respostas` to >100 entries (or send a 2MB+ payload). EF responds 400 with `error_code: VALIDATION` (or 413 PAYLOAD_TOO_LARGE per fix). Frontend shows a non-success toast. No 500 / no silent timeout.
result: pass
evidence: |
  Repro from DevTools console: fetch POST to /functions/v1/submit-candidatura with respostas array of 200 entries (full valid payload incl vaga_id + candidato_id + curriculo_url + curriculo_nome + curriculo_size).
  Response: HTTP 400, body { ok: false, error_code: "VALIDATION", message: "Máximo 100 respostas por candidatura", field: "respostas" }.
  Latency < 1s. No 500, no timeout.
  First attempt earlier failed on curriculo_nome (required Zod field) BEFORE reaching the respostas cap — Zod field-order works as designed; once curriculo_nome was added the .max(100) cap on respostas fired as expected.
  EF redeploy (npx supabase functions deploy submit-candidatura) confirmed in effect — cap is live in production.

### 9. Already-applied redirect (WR-03 iter-1 regression)
expected: As a candidato who already submitted to a vaga, navigate to `/candidato/candidatura/formulario/{slug}`. Briefly shows loading state, then redirects to the existing-candidatura status page. NO flash of empty form, no double-mount that destroys in-flight input.
result: pass
evidence: |
  Navigated directly to /candidato/candidatura/formulario/teste-coordenador-rh-sede (already submitted in Test 7 — candidatura 04864650-...).
  Behavior: brief loading → smooth redirect away from form. No flash of empty form, no double-mount visible.
  WR-03 gate working — useHasApplied query settled before redirect fired (`appliedQuerySettled && alreadyApplied === true`).
  Console clean — only vite/react/i18n boilerplate, no errors, no Phase 4 warnings.
  Network: standard Vite HMR WS only — no failing requests.

### 10. Vaga 404 anti-enumeration
expected: Visit `/vagas/this-slug-does-not-exist`. Renders a friendly 404 (`VagaNotFoundState`) — NOT a generic crash, NOT a "you don't have permission" error that would leak existence.
result: pass
evidence: |
  Renderizou a mensagem canônica:
  "Vaga não encontrada"
  "Vaga não encontrada ou não está mais ativa"
  + CTA "Voltar para vagas".
  Anti-enumeration: mesma resposta para slug inexistente vs existente-mas-RLS-denied → OK.
side_finding: "Botão 'Voltar para vagas' no VagaNotFoundState está com layout quebrado — ícone numa linha, texto em linha de baixo. Mesmo pattern de quebra do gap do Test 2 (botão 'Candidatar-se a esta vaga' no card de /vagas)."

## Summary

total: 10
passed: 9
issues: 1
side_findings: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Card de vaga em /vagas (anon) deve apresentar um botão 'Candidatar-se a esta vaga' bem diagramado — ícone+texto alinhados, sem sobreposição com outros textos do card."
  status: failed
  reason: "User reported: ok, o botao candidatar-se a esta vaga esta mal diagramado, o icone esta no cando acima, o texto esta centralizado abaixo, e achoq ue ele deveria ficar fixo embaixo nao sobrepondo os outros textos"
  severity: minor
  test: 2
  artifacts: []
  missing: []
  note: "Tangential to WR-10 — WR-10 target (count-leak prevention for anon) appears OK. This is a card layout regression."

- truth: "Páginas /vagas (lista) e /vagas/{slug} (detalhe), quando o candidato está logado, devem exibir um header com botão 'Área do candidato' e botão 'Sair' (logout) — equivalente ao shell canônico candidato (precedente: MeuPerfilCandidatoPage / FormularioCandidaturaPage post-Carryover-B)."
  status: failed
  reason: "User reported: senti falta na pagina de vagas e ate na pagina da vaga em si, o head para mostrar que esta logado e para ir para a area do candidato, nao tem nenhum botao para isso. nem botao sair"
  severity: major
  test: 4
  artifacts: []
  missing:
    - "Navbar/header de candidato logado em src/components/pages/VagasPage.tsx OU equivalente lista de vagas"
    - "Navbar/header de candidato logado em src/components/pages/VagaDetalhePage.tsx"
  note: "Phase 4 carryover D-27 (canonical persona shell pattern) foi aplicado em FormularioCandidaturaPage (Carryover-B) mas não nas páginas /vagas (lista) e /vagas/{slug} (detalhe). Mesma regra: BackgroundImage + BeautySmileLogo + sticky navbar Glass + Avatar + nome + GlassButton 'Sair' + 'Área do candidato' link."

- truth: "Botão 'Voltar para vagas' no VagaNotFoundState (404 inline state) deve renderizar ícone + texto em uma única linha, não quebrar para duas linhas."
  status: failed
  reason: "User reported on Test 10: arrumar o botao voltar para vagas, o icone ficou em uma linha e o escrito na linha de baixo"
  severity: minor
  test: 10
  artifacts:
    - path: "src/components/pages/VagaDetalhePage.tsx"
      issue: "VagaNotFoundState inline component — likely flex direction or whitespace-nowrap missing on the back-link button"
  missing:
    - "Apply inline-flex + items-center + gap-2 + whitespace-nowrap to the 'Voltar para vagas' anchor/button in VagaNotFoundState"
  note: "Mesma classe de gap do Test 2 (icon+texto fora de linha). Se o root cause for o mesmo Glass button styling shared, um fix único pode resolver ambos."
