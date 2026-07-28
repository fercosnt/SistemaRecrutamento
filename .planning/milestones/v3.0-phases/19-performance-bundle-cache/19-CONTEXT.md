# Phase 19: Performance — Bundle & Cache - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — grounded in a code scout of router, vite config, TanStack Query setup, and mutation→read invalidation paths

<domain>
## Phase Boundary

Fazer o candidato mobile-first parar de pagar o bundle monolítico no first paint
(code-splitting route-level + vendor) e garantir que uma mudança escrita por candidato
ou RH apareça no perfil/dashboard do candidato em ≤60s (invalidação de cache alvo).

Cobre PERF-03 (code-splitting, fecha tech-debt HARD-02) e PERF-04 (invalidação de cache
≤60s, fecha tech-debt PERF-01) + a condição transversal de "nenhuma regressão de navegação".

**Estado descoberto no scout (importa para o plano):**
- `src/router/routes.tsx`: TODAS as rotas usam `import` estático — ZERO lazy/Suspense hoje.
  Bundle principal ~2.7 MB raw (+ html2canvas 200 KB, recharts/index.es 156 KB).
- `vite.config.ts` build block NÃO tem `rollupOptions.output.manualChunks` (só aliases de dedupe).
- Libs pesadas de uso único: jsPDF+autotable (~200 KB, só no export de comparativo da triagem),
  recharts (~156 KB, só em `/admin/ai-costs`), tiptap (~80 KB).
- QueryClient (`src/App.tsx`): staleTime 5min, gcTime 10min, retry 2, refetchOnWindowFocus FALSE.
  Query-key factories hierárquicas consistentes (vagasKeys, candidaturasKeys, decisaoKeys, etc.).
- **2 gaps reais de invalidação (PERF-04):** `useEntrevistaScorecard().salvarAvaliacao`
  (`useEntrevistaScorecard.ts:151-159`) e `useRedacaoRevisao().salvarRevisao`
  (`useRedacaoRevisao.ts:54-67`) NÃO invalidam `decisaoKeys.consolidacao()` → dashboard
  final fica stale. candidaturas já tem staleTime 1min + invalidação em useUpdateCandidaturaStatus.

NÃO inclui: feature nova, reescrita de páginas legado, tsc burn-down (FOUND-08).

</domain>

<decisions>
## Implementation Decisions

### Área 1 — Code-splitting (PERF-03)
- Lazy-load (`React.lazy` + dynamic `import()`) as rotas `/rh/*` e `/admin/*` (auth-gated, baixo tráfego);
  MANTER os fluxos do candidato (landing, dashboard, avaliação) EAGER para o first-paint mobile.
- Libs pesadas de uso único via dynamic `import()` no call site: jsPDF no clique "Exportar",
  recharts dentro da rota admin lazy.
- Adicionar `rollupOptions.output.manualChunks` separando um vendor chunk estável (react + @radix-ui)
  do código de app.
- Fallback de Suspense: um `PageSkeleton`/spinner glass de marca no boundary lazy (sem flash em branco).

### Área 2 — Cache invalidation & freshness (PERF-04)
- Corrigir os 2 gaps: `salvarAvaliacao` e `salvarRevisao` também invalidam
  `decisaoKeys.consolidacao(candidaturaId, vagaId)` (threadar os ids — invalidação ALVO, não broad).
- Freshness cross-client (aba aberta do candidato vs mudança de status pelo RH): habilitar
  `refetchOnWindowFocus` para os reads de status/dashboard do candidato + manter staleTime ≤60s
  desses reads → mudança visível em ≤60s no refocus/navegação.
- Política de staleTime: manter o default global de 5min; reads de status candidato-visíveis ≤60s
  (candidaturas já 1min).
- Escopo: corrigir os gaps conhecidos + um quick audit de que cada mutation invalida os reads
  candidato-visíveis que ela afeta.

### Claude's Discretion
- Exato conjunto/limite dos manualChunks (quais libs no vendor chunk) desde que o chunk da rota
  inicial do candidato encolha e os chunks de rota resolvam em runtime.
- Forma exata do `PageSkeleton` (reusar HubSection/AsyncState skeleton vs novo) e onde ancorar o
  `<Suspense>` (root layout vs por-grupo de rota).
- Se habilitar `refetchOnWindowFocus` global vs per-query nos reads candidato-visíveis (preferir
  o mais cirúrgico que ainda garanta ≤60s).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/AsyncState.tsx` + HubSection skeleton — base p/ o `PageSkeleton` do Suspense fallback.
- Query-key factories: vagasKeys, candidaturasKeys, triagemKeys, decisaoKeys, entrevistaKeys,
  scorecardKeys, explicacaoKeys, redacaoRevisaoKeys — usar para invalidação alvo.
- `src/App.tsx:36-45` QueryClient defaults (staleTime/gcTime/retry/refetchOnWindowFocus).

### Established Patterns
- Mutations já chamam `queryClient.invalidateQueries(...)` no onSuccess (padrão a seguir nos 2 fixes).
- Aliases em vite.config dedupam radix/recharts/etc (um único copy) — manualChunks é ortogonal.
- Vite build: outDir 'build', target 'esnext'.

### Integration Points
- `src/router/routes.tsx` (rotas — alvo do lazy + Suspense), `src/App.tsx` (RootLayout, QueryClient).
- `vite.config.ts` build block (manualChunks).
- `src/features/entrevista/hooks/useEntrevistaScorecard.ts:151-159`,
  `src/features/triagem/hooks/useRedacaoRevisao.ts:54-67` (os 2 gaps de invalidação).
- `src/features/triagem/pdf/exportComparativo.ts` (jsPDF — dynamic import no clique).
- `src/components/pages/DashboardCandidatoPage.tsx` + useCandidaturas (read candidato-visível).

</code_context>

<specifics>
## Specific Ideas

- "661 KiB" do requirement é a medida histórica de tech-debt HARD-02; o scout mediu ~2.7 MB raw no
  chunk principal atual — a métrica de sucesso é o chunk da rota inicial do candidato encolher
  visivelmente após o split, com chunks de rota emitidos separadamente no `npm run build`.
- ≤60s de PERF-04 = "quando o candidato navega/refoca, vê a mudança em ≤60s"; garantido por
  invalidação na mutation (mesmo cliente) + refetchOnWindowFocus + staleTime ≤60s (cross-client).

</specifics>

<deferred>
## Deferred Ideas

- Lazy-load dos fluxos do candidato — fora de escopo (mantidos eager para first-paint); reconsiderar
  só se o chunk inicial ainda for grande após o split RH/admin.
- Otimização de imagens/assets, prefetch de rotas, e SSR — fora do escopo deste milestone de hardening.

</deferred>
