# Phase 40: Timeline de Prazo no Painel do Candidato - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas (visual), all recommended answers accepted. UI contract folded into `<decisions>` (no separate UI-SPEC subagent).

<domain>
## Phase Boundary

Cada **estado de espera** do painel do candidato (`DashboardCandidatoPage`) mostra a estimativa de prazo daquela etapa — o texto candidate-facing `rotulo_candidato` lido de `config_sla_etapa` (seedada na P37) — enquadrado explicitamente como **estimativa**, nunca countdown. É o *pull* que complementa o *push* do e-mail (P38), arquiteturalmente **independente** do pipeline de notificação: lê só a tabela de config estática non-PII (RLS public-read), zero acoplamento à EF/triggers.

**Requirement:** TIMELINE-02. (TIMELINE-01 — a tabela + seed — já aterrissou na P37.)

**Fora de escopo:** qualquer cálculo de tempo restante/countdown; qualquer escrita; timeline computada do histórico (deferida a M7-v2); mudança na UI de decisão existente (aprovado/rejeitado já têm painel próprio).
</domain>

<decisions>
## Implementation Decisions

### Camada de dados (config_sla_etapa)
- Código numa **nova feature** `src/features/timeline/` (services/, hooks/, types/) — segue a convenção de organização por domínio.
- `slaService.listarSlaEtapas()` lê via supabase **anon** client (RLS `sla_public_read`, roles anon+authenticated), com **allowlist explícita** `select('etapa, prazo_valor, prazo_unidade, rotulo_candidato')` — nunca `select('*')`.
- `useSlaEtapas()` (TanStack Query v5) com `staleTime: Infinity` (config estática — só muda por migration) e query key `slaKeys.all`. Uma classe de erro custom `SlaServiceError` no service (convenção camelCaseService).
- O hook expõe os dados como `Map<etapa, rotulo_candidato>` (ou `Record`) para lookup O(1) por `etapa_atual` no card.

### Onde e o que exibir
- Mostra a estimativa **só nos estados de espera**: etapas com `prazo_valor` **não-nulo e não-terminais**. Terminais (`aprovado` — prazo null; `rejeitado` — já tem painel de decisão/motivo) mantêm a UI existente, sem a linha de estimativa.
- Posição: uma **linha própria** abaixo do label da etapa (`ETAPA_M2_LABELS`) em cada card de candidatura, com o ícone `Clock` (já importado no `DashboardCandidatoPage`).
- Texto: o `rotulo_candidato` **verbatim** do config (já é candidate-facing e já diz "em até X") — nunca recompor no client.
- Etapa desconhecida/stale (M1 legacy, ausente do config) → **não renderiza nada** (graceful, espelha o guard existente do `funilNavMap`/DRIFT GUARD).

### Enquadramento como estimativa (nunca countdown)
- **NUNCA** countdown/tempo restante: zero `Date`/relógio/setInterval, zero cálculo de tempo — só o texto estático do config. Este é o coração do RNF (estimativa, não promessa rígida).
- Reforço visual: um chip/caption sutil **"Estimativa"** ao lado do texto (o `rotulo_candidato` já enquadra com "em até").
- Estilo: glass sutil/muted (`text-white/70`, tamanho caption), coerente com o design system Beauty Smile; **não** compete com o status badge nem com o CTA da etapa.
- Loading/erro do fetch: **falha silenciosa** (a linha simplesmente não aparece) — a estimativa é enhancement, nunca bloqueia nem quebra o card.

### UI Contract (folded — no separate UI-SPEC)
- **Componente:** um `PrazoEstimadoLinha` (ou inline no card) — recebe `etapa_atual` + o Map do hook; retorna `null` quando não há rotulo aplicável.
- **Estados:** (a) espera com rotulo → ícone Clock + rotulo + chip "Estimativa"; (b) terminal/stale/loading/erro → `null`.
- **Acessibilidade:** o ícone Clock é decorativo (`aria-hidden`); o texto é lido normalmente.
- **Responsivo:** herda o layout do card (glass); a linha quebra naturalmente em telas estreitas (mobile-first do candidato).

### Claude's Discretion
- Nome exato do componente/arquivos e do chip.
- Se o Map é `Map` nativo ou `Record<string,string>` — o que ficar mais limpo no lookup.
- Posição exata do chip "Estimativa" (antes/depois do texto) e o token de cor muted.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/pages/DashboardCandidatoPage.tsx` — o painel; já importa `Clock` (lucide), usa `ETAPA_M2_LABELS`/`EtapaFunilM2`, `funilNavMap` com DRIFT GUARD para etapas stale, e renderiza um card por candidatura (~linhas 300-390). Ponto de integração.
- `config_sla_etapa` (P37, vivo em PROD, RLS `sla_public_read`): colunas `etapa` (PK, enum etapa_processo), `prazo_valor` (int, nullable), `prazo_unidade` (text), `rotulo_candidato` (text), `atualizado_em`. Seed das 8 etapas com o texto candidate-facing já pronto (ex.: triagem → "Em triagem — retorno em até 48 horas.").
- Convenções de query key + hook: `bigfiveKeys`/`meuAgendamentoKeys`/`usuariosRhKeys` (padrão `<dominio>Keys = { all: [...], ... }`); services com classe de erro custom.
- `@/lib/supabase/client` — o client anon (nunca admin no client-side).

### Established Patterns
- TanStack Query v5 (staleTime/retry) por hook; query keys hierárquicas.
- Feature dir `src/features/<dominio>/` com services/hooks/types; export nomeado PascalCase.
- Glass UI (`Glass`, `GlassCard`, etc.) + Tailwind; mobile-first no candidato.
- Allowlist de colunas nos selects (nunca `*`); RLS é row-level.

### Integration Points
- O hook `useSlaEtapas()` é chamado no `DashboardCandidatoPage`; o lookup por `candidatura.etapa_atual` alimenta a linha de estimativa em cada card.
- Zero acoplamento com a P38/P39 (push de e-mail) — lê só `config_sla_etapa`.
</code_context>

<specifics>
## Specific Ideas

- O `rotulo_candidato` já é o texto final ao candidato — a fase é essencialmente "buscar e exibir", com o cuidado do enquadramento de estimativa e a disciplina de nunca virar countdown.
- Seed vivo confirmado (2026-07-24): inscricao/triagem 48h, avaliacao_assincrona 7 dias corridos, entrevistas 7 dias úteis, decisao_final 3 dias úteis, aprovado (sem prazo), rejeitado 24h.
</specifics>

<deferred>
## Deferred Ideas

- Timeline **computada** do histórico (barra de progresso por etapa com datas reais) → M7-v2/backlog.
- Nudge/aviso quando o prazo estimado "estoura" → fora de escopo (seria countdown-adjacente; o RNF proíbe promessa rígida).
- Push de e-mail (P38) e o rewire de triggers (P39) — independentes desta fase.
</deferred>
