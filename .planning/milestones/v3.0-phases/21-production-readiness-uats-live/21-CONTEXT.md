# Phase 21: Production-Readiness — UATs Live - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous)

<domain>
## Phase Boundary

Executar e fechar em PROD os HUMAN-UAT live deferidos do M2 (Phases 11 e 16) e do M3
(Phases 18, 19, 20) — validando com dados/contas reais o hardening feito neste milestone.
Entrega: evidência de PASS / re-deferido com justificativa para cada item, registrada nos
artefatos de UAT, **mais** um runbook humano para o Fernando re-validar tudo por conta própria.

Esta fase **não** constrói feature nova nem altera contrato — é validação. A única escrita de
código permitida é correção de bug encontrado durante a validação (commit atômico).
Invariantes preservadas: IA é recomendação, humano decide (RNF-07a); nenhuma escrita nova em
`candidaturas` por trait/score/idade; write-paths privilegiados authenticate-THEN-authorize.

</domain>

<decisions>
## Implementation Decisions

### Execução
- Claude dirige a validação live por **Playwright (E2E_REAL_LOGIN) + Supabase MCP + Chrome browser automation**, usando as credenciais disponíveis em `.env.test`.
- Ambiente "live PROD" = app local (`npm run dev`, porta 3003) apontado ao **backend PROD Supabase** (`isljnozzlvckrgjjbjwp.supabase.co`) — auth, DB, Storage, Edge Functions e Anthropic todos PROD. É exatamente como todos os UATs live anteriores rodaram (não há frontend deployado separado no repo).
- Claude **valida tudo, corrige o que estiver quebrado** (commit atômico), e **só então escreve o runbook** para o Fernando re-validar manualmente.
- Contas: candidato `candidato.funil@teste.com` (TEST_USER) + admin `e2e.admin@beautysmile.com.br` (TEST_ADMIN). Admin-bypass cobre o happy-path RH de edição de guia; negação coberta por candidato/sem-posse.

### Escopo / reconciliação
- Itens **já PASS** em sessões live anteriores são reconciliados a partir da evidência (não re-executados): P11 #1/#2/#3 (2026-06-26, fix F4 + IA real provada) e P16 #1 (cold-start login RH, 2026-06-26).
- Apenas o conjunto **genuinamente aberto (~9 itens)** é ativamente executado nesta sessão.

### Itens human-only — proxy + re-deferral
- P16 #4 (screen reader VoiceOver/NVDA aria-live): Claude verifica a **região aria-live no DOM** (existe + atualiza no save). O anúncio literal por leitor de tela é **re-deferido com justificativa** (o goal da fase permite re-deferral registrado).
- P18 UAT-18-01 (forçar 429/529 real da Anthropic): Claude valida **timeout per-call + retry/backoff + shape 503 AI_UNAVAILABLE** via invocação live + logs de EF. O evento de overload real é oportunístico / re-deferido com justificativa.

### Dados PROD
- Autorizado **seed/reset** de candidaturas de teste + edição de guia em vaga `[TESTE]` conforme necessário, com **limpeza dos artefatos de teste ao final** (precedente: seed E2E do funil 2026-06-26).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Playwright e2e/** com `E2E_REAL_LOGIN` + `E2E_AUTH_TEST_USERS` + `E2E_CANDIDATURA_*` env já fiada; `a11y.spec.ts` roda axe-core. `playwright.config` webServer = `http://localhost:3003`.
- **Supabase MCP** (`apply_migration`/`execute_sql`/`get_logs`/`invoke`/`get_edge_function`/`get_advisors`) — caminho usado em todo o M2/M3 para PROD.
- **`<AsyncState>`** (src/components/ui/) — contrato de 5 estados (loading→slow@8s→error→empty→success) adotado nas 5 telas de IA (P18).
- **`save_entrevista_guia_edits`** RPC + `gerar-guia-entrevista` EF v4 (merge-preserve) já live (P20-02/20-04).

### Established Patterns
- Migrations/DB PROD via MCP `apply_migration`/`execute_sql`. EF deploy via `supabase functions deploy` ou MCP `deploy_edge_function`.
- Seed/reset de candidatura: `candidaturas` tem unique idx sem filtro deleted_at → soft-delete NÃO libera; hard-delete + limpar `historico_candidatura`/`decisao_final` antes (ref: candidatura_test_data_reset).
- Commits via `git -c core.hooksPath=/dev/null` (allowlistado).

### Integration Points
- App local 3003 → PROD Supabase. EF logs via MCP get_logs. axe via Playwright. Visual via Chrome MCP.

</code_context>

<specifics>
## Specific Ideas

- Contas seed em PROD (memória): `candidato.funil@teste.com`/`Candidato@2026`, candidatura `a1dd4c42` (percorreu funil) + `f73682b6` (limpa em avaliacao_assincrona), vaga `[TESTE] Dentista — Funil E2E`.
- Achado conhecido P11: devolutiva Big-Five estourava timeout com 5 IA-calls → **endereçado por P18 RESIL-02** (paraleliza 5 dims allSettled). Validar que agora completa.
- Achado conhecido P11 #4: autosave 30s UX nunca re-observado; back-lock server-side já verde (42501).

</specifics>

<deferred>
## Deferred Ideas

- Anúncio literal por leitor de tela (P16 #4) e evento real de overload Anthropic (P18-01) → re-deferidos com justificativa registrada (proxy DOM/log aceito nesta fase).
- Top-level guide fields (introduction/closing/scoring_instructions) não preservados no manual save (anti-tamper tradeoff P20) — fora do escopo dos UATs.

</deferred>
