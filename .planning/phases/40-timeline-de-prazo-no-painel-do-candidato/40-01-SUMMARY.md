---
phase: 40-timeline-de-prazo-no-painel-do-candidato
plan: 01
subsystem: frontend
tags: [react, tanstack-query, service, config-read, allowlist, timeline]

# Dependency graph
requires:
  - phase: 37
    provides: "config_sla_etapa seedada (8 etapas com rotulo_candidato) + RLS sla_public_read"
provides:
  - "src/features/timeline/types/timelineTypes.ts — SlaEtapa (Pick do Row gerado)"
  - "src/features/timeline/services/slaService.ts — listarSlaEtapas() allowlist + SlaServiceError"
  - "src/features/timeline/hooks/useSlaEtapas.ts — useSlaEtapas() (staleTime Infinity, lookup Map<etapa,SlaEtapa>) + slaKeys + rotuloDeEspera()"
affects: [40-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read de config estática via anon client + allowlist explícita (RLS public-read); nunca projeção estrela"
    - "Cache de config estática: TanStack Query staleTime Infinity (muda só por migration)"
    - "rotuloDeEspera() filtra estado de espera por prazo_valor não-nulo — terminal/stale/undefined → null (o painel não mostra linha)"

key-files:
  created:
    - src/features/timeline/types/timelineTypes.ts
    - src/features/timeline/services/slaService.ts
    - src/features/timeline/hooks/useSlaEtapas.ts
    - src/features/timeline/hooks/index.ts
    - src/features/timeline/services/__tests__/slaService.test.ts
  modified: []

key-decisions:
  - "SlaEtapa deriva do Row gerado via Pick (não redigita tipos) — 0 drift com database.types.ts"
  - "rotuloDeEspera é a fronteira 'estado de espera': só retorna rotulo quando prazo_valor != null; aprovado (prazo null) e etapa stale (undefined) → null"
  - "Comentário reescrito para não conter o literal select('*') (a acceptance grepa a fonte; o código usa allowlist SLA_COLUMNS)"

# Verification
verification:
  automated: "npx vitest run src/features/timeline/services → 4 passed / 0 failed (allowlist asserida, erro→SlaServiceError, null→[])"
  lint: "tsc src/** 97→97 (sem erro novo)"
---

# 40-01 — Camada de dados da timeline (TIMELINE-02)

Criei `src/features/timeline/`: `SlaEtapa` (Pick do Row de config_sla_etapa), `slaService.listarSlaEtapas()` (lê via anon client com allowlist `etapa, prazo_valor, prazo_unidade, rotulo_candidato` — nunca estrela; erro tipado `SlaServiceError`), e `useSlaEtapas()` (TanStack Query, `staleTime: Infinity`, query key `slaKeys.all`, expõe `lookup: Map<etapa,SlaEtapa>`). O helper `rotuloDeEspera(sla)` devolve o `rotulo_candidato` só para estados de espera (prazo_valor não-nulo) — a fronteira que faz terminal/stale/undefined não renderizarem nada no painel.

4 testes Vitest verdes (mock do client anon): retorno das linhas, allowlist asserida (sem `*`), erro→SlaServiceError, data null→[]. Lint 97→97.

**Deviations:** comentário reescrito para não conter o literal `select('*')` (falso positivo do grep de acceptance). **Next:** o componente + wire no painel (40-02).
