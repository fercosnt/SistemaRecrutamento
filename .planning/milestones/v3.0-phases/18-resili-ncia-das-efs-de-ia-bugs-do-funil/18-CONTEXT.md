# Phase 18: Resiliência das EFs de IA & Bugs do Funil - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — grounded in code scout of the live funnel surfaces

<domain>
## Phase Boundary

Endurecer as Edge Functions de IA do funil M2 contra latência alta e overload transiente
da Anthropic, dar ao candidato e ao RH estado claro durante chamadas lentas/falhas, e
fechar/blindar os 4 achados do E2E live em PROD (candidatura `a1dd4c42`).

Cobre RESIL-01 (timeout configurável + retry/backoff já existente), RESIL-02 (timeout do
`gerar-devolutiva-bigfive`), RESIL-03 (graceful degradation no frontend), FIX-01
(`consolidar-decisao-final` com `work_sample_sjt='na'` + caso aberto pendente) e FIX-02
(tela de avaliação `status='active'` vs `'ativo'`).

**Estado descoberto no scout (importa para o plano):**
- `_shared/ai-client.ts::callAi()` JÁ tem retry exp-backoff 3x (`MAX_ATTEMPTS=3`,
  `RETRYABLE_STATUS={429,503,529}` + regex overload), circuit-breaker e fallback OpenAI.
  **Falta apenas** timeout per-call explícito (AbortSignal) e tornar attempts/timeout
  configuráveis. RESIL-01 é "hardening + tornar configurável", não "do zero".
- `gerar-devolutiva-bigfive` faz **5 chamadas sequenciais** (uma por dimensão OCEAN),
  cada uma com até 2 tentativas, **sem budget de tempo externo** → risco de timeout real.
- **FIX-01 e FIX-02 já estão codados e commitados** em 2026-06-26 (`350e994`
  normalizeSjtComposite; `686c460` perguntas `'active'`). O trabalho desta fase é
  **travar com testes de regressão** e **verificar deploy da EF em PROD**, não re-corrigir.

NÃO inclui: features de domínio novas, burn-down tsc (FOUND-08), item-bank cognitivo
(CC0), nem os UATs live (Phase 21). Verificação live round-trip em PROD é deferida p/ Phase 21.

</domain>

<decisions>
## Implementation Decisions

### Área 1 — Resiliência das EFs (RESIL-01 + RESIL-02)
- Timeout configurável vive no helper compartilhado `callAi()`: cada chamada Anthropic/OpenAI
  envolvida em timeout via `AbortSignal`, exposto por env `AI_CALL_TIMEOUT_MS` (default ~25s),
  e `MAX_ATTEMPTS` também configurável por env. Uma fonte única cobre TODAS as EFs de IA.
- `gerar-devolutiva-bigfive`: paralelizar as 5 dimensões com `Promise.allSettled`, 1 tentativa
  por dimensão, com graceful-degrade per-dim para o template determinístico em caso de falha —
  cabe numa janela de execução. (Não tornar assíncrona/background nesta fase.)
- Quando as tentativas esgotam ou o breaker abre, a EF retorna erro estruturado
  `{ error_code: 'AI_UNAVAILABLE', retryable: true }` com HTTP 503 para o frontend exibir retry.
- Escopo do hardening RESIL-01 é uniforme: aplica-se a todas as EFs de IA via o helper compartilhado.

### Área 2 — Graceful degradation no frontend (RESIL-03)
- Extrair um wrapper compartilhado `<AsyncState>` que generaliza o padrão do `HubSection`
  (loading skeleton / erro legível PT-BR / vazio / **retry visível**), adotado nas telas de IA
  candidato-facing (BigFive, SJT caso aberto, redação) e RH (consolidação, comparativo).
- Padronizar o botão "Tentar novamente" (chama refetch/re-invoke) em todas as telas —
  já existe no `ConsolidacaoDashboard`, virar padrão.
- UX de chamada lenta (ex.: bigfive ~30s): mensagem explícita "pode levar até ~30s" + skeleton,
  desabilitar double-submit, nunca tela em branco.
- Superfície de erro: estado de erro inline na região da tela + mensagem legível PT-BR;
  toast opcional para transientes.

### Área 3 — Travar FIX-01/FIX-02 (já codados) + deploy
- Como os fixes já estão commitados: adicionar testes de regressão que teriam pego cada bug
  — consolidar: caso_aberto pendente-único → `null` mas MC preservado; avaliação:
  `status='active'` retorna linhas — e verificar que `consolidar-decisao-final` está deployado em PROD.
- Redeploy de `consolidar-decisao-final` (+ EFs alteradas pelo RESIL) para PROD como passo
  `[BLOCKING]` human-gated via Supabase MCP/CLI (precedente PROD do M2).
- Camada de teste de regressão: Vitest unit nos pontos puros/mockados (rápido, sem rede).
- Lock + deploy agora; a verificação live round-trip em PROD é deferida p/ Phase 21 (PROD-01/02)
  para não duplicar setup de UAT.

### Claude's Discretion
- Nome exato/API do componente `<AsyncState>` e como ele compõe com `HubSection` existente.
- Valor default exato de `AI_CALL_TIMEOUT_MS` e `MAX_ATTEMPTS` (dentro do razoável p/ Sonnet).
- Estrutura interna da paralelização do bigfive (Promise.allSettled vs map+await) desde que
  preserve o graceful-degrade per-dim e o limite de palavras.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/functions/_shared/ai-client.ts::callAi()` — orquestrador central: idempotência →
  injection detection → PII masking → circuit-breaker → Anthropic (retry 3x) → fallback OpenAI.
  Ponto único para RESIL-01 (timeout + attempts configuráveis).
- `supabase/functions/_shared/circuit-breaker.ts` — disjuntor CLOSED/OPEN/HALF-OPEN (5 falhas/60s).
- `src/features/hub-candidato/components/HubSection.tsx` — padrão loading/erro/vazio reutilizável
  (base do `<AsyncState>`).
- `src/features/decisao/components/ConsolidacaoDashboard.tsx:91-111` — loading skeleton + erro
  AlertTriangle + botão "Tentar novamente" (`refetch()`); modelo do retry padronizado.
- `src/features/decisao/hooks/useConsolidacao.ts` — padrão TanStack Query (retry:2, staleTime 5min)
  para invocar EF.

### Established Patterns
- Imports `npm:` ESTÁTICOS em toda EF de IA (zod v4; Anthropic 0.102.0; OpenAI 6.42.0) — nunca
  `await import([...].join(""))` (M2/AVAL-03). Preservar ao editar EFs.
- TanStack Query v5: componentes observam `isLoading/isPending/isError/error/refetch` direto
  (sem `onError` callback).
- EFs privilegiadas: two-client + authenticate-THEN-authorize (M2/Phase 10). Preservar nas EFs editadas.
- RNF-07a: IA é sempre recomendação; nenhuma escrita por trait/score; revisão humana obrigatória.
  `consolidar-decisao-final` é determinístico (NUNCA LLM) — manter assim.

### Integration Points
- EFs de IA com `callAi`: analise-candidato-individual, avaliar-redacao, avaliar-redacao-cultural,
  avaliar-transcricao-entrevista, gerar-devolutiva-bigfive, gerar-guia-entrevista, comparativo-candidatos.
- `src/features/avaliacao/services/avaliacaoService.ts:133-139` — FIX-02 (já corrigido) + alvo de
  teste de regressão.
- `supabase/functions/consolidar-decisao-final/index.ts:173-182` — FIX-01 (`normalizeSjtComposite`,
  já corrigido) + alvo de teste de regressão; EF a verificar/redeployar em PROD.
- Telas candidato-facing que invocam EFs de IA lentas: BigFiveQuestionnaireScreen, SjtCasoAbertoScreen,
  RedacaoEditorScreen, EntrevistaWorkspace. RH: ConsolidacaoDashboard, ComparativoScreen.

</code_context>

<specifics>
## Specific Ideas

- Achados live (candidatura `a1dd4c42`, vaga `[TESTE] Dentista — Funil E2E`, 2026-06-26):
  (1) EFs 38–102s + overload transiente → retry; (2) devolutiva-bigfive timeout (5 IA-calls);
  (3) consolidar `work_sample_sjt='na'` + caso aberto pendente; (4) tela avaliação `status='active'`
  vs filtro `'ativo'`. Detalhe operacional em MEMORY `project_funil_e2e_seed_achados`.
- Contrato de erro `{ error_code:'AI_UNAVAILABLE', retryable:true }` + 503 deve casar com o que o
  `<AsyncState>` lê para decidir mostrar retry.

</specifics>

<deferred>
## Deferred Ideas

- Verificação live round-trip em PROD dos fixes/hardening → Phase 21 (PROD-01/02).
- Tornar `gerar-devolutiva-bigfive` totalmente assíncrona (job + poll) — só se a paralelização
  não couber na janela; caso contrário fica fora de escopo.
- LLM-as-judge / golden set para calibrar as avaliações de IA → M4 (JUDGE-01).

</deferred>
