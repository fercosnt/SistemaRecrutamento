# Phase 34: Superfícies do RH — CV/IA, Agendamento, Fila de Trabalho + KPIs - Context

**Gathered:** 2026-07-16
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas, all accepted as recommended

<domain>
## Phase Boundary

O RH opera o funil pelas **superfícies reais**, cabeadas contra primitivos **já seguros**
(P32: EF `get-curriculo-url`, RPC `funil_kpis`; P33: tabela `agendamentos_entrevista` + RPC
`get_meu_agendamento`). 9 requirements / 5 plans:

- **VISRH-01/02/03** — na tela do candidato (`HubCandidatoRH`): CV via EF, análise da IA **completa**
  (forças/gaps na íntegra, não truncados a 2), feed de histórico read-only.
- **AGEND-02/03** — form de agendar/reagendar/cancelar entrevista + registrar `compareceu`/no-show,
  refletido no card do candidato (P35).
- **KPI-01/03** — fila de trabalho **cross-vaga** priorizada por tempo-em-etapa/SLA + badge de
  aging/SLA breach, **coexistindo** com o Kanban por-vaga existente.
- **KPI-02/04** — dashboard de KPIs operacionais via `funil_kpis` DEFINER vaga-scoped, substituindo
  a agregação client-side morta do M1 (`RelatoriosRHPage`).

**In scope:**
- **DB sub-task (net-new SQL):** estender `funil_kpis` (+4 keys KPI-04) — migration via MCP + smoke.
- Frontend: novos HubSections (CV/IA/Histórico), form de agendamento, nova aba "Fila", dashboard recharts.
- Novos serviços/hooks front-end: `agendamentoService`, `funilKpisService`, `useAnaliseCandidato`,
  `useHistoricoCandidatura` (padrões `entrevistaKeys`/`entrevistaService`, allowlist, sem `select('*')`).

**Out of scope (P35 / backlog):**
- Candidate-facing card do agendamento + `.ics` + badge ≤24h → **Phase 35**.
- Per-vaga SLA config UI (thresholds hardcoded nesta fase).
- COMM (e-mail), TALENT, LGPD-OPS.

</domain>

<decisions>
## Implementation Decisions

### Area 1 — KPI dashboard scope & data (accepted)
- **KPI-04: estender `funil_kpis` IN-PLACE** (+4 top-level keys: `time_to_hire`, `knockout_rate`,
  `drop_per_stage`, `no_show_rate`) — roadmap diz "no mesmo RPC". Net-new migration (`CREATE OR REPLACE
  FUNCTION public.funil_kpis` preservando as 3 keys existentes + as 4 novas) via Supabase MCP
  `apply_migration` + reconciliar ledger + smoke comportamental (PII-safe, vaga-scoped, admin bypass).
  **⚠ diff o corpo LIVE (`pg_get_functiondef`) ANTES do CREATE OR REPLACE** (Pitfall DBMIG-02 — não dropar
  as 3 keys/lógica existentes: median via LEAD-dwell, conversion, volume).
- **no-show rate:** join a `agendamentos_entrevista` — `count(compareceu=false) / count(compareceu IS NOT NULL)`
  (ou / total agendados concluídos), vaga-scoped internamente como o resto do RPC. `compareceu` nullable=pending.
- **Conversão (K4): coorte fechada por janela de inscrição** (default recomendado — não subconta
  candidatos ainda em andamento). Aplica ao cálculo de `drop_per_stage`/conversão-rate; a key existente
  `conversion_stage_to_stage` (contagens brutas) é preservada.
- **Chart lib: wrapper shadcn `@/components/ui/chart`** (`ChartContainer`/`ChartTooltip`/`ChartConfig`,
  como `AiCostsPage`). Manter o alias `recharts@2.15.2` (vite.config.ts:74 / tsconfig.json:35). **Zero npm novo.**
- **RelatoriosRHPage: substituir** a agregação M1 morta (lê conceitos M1 dropados disc/raven/bigfive-funnel)
  pelo dashboard `funil_kpis`, **na mesma rota `/rh/relatorios`**.

### Area 2 — Candidate screen: CV + IA + History (accepted)
- **CV (VISRH-01):** botão on-click → `getSignedUrl(candidaturaId)` async → `window.open(url,'_blank')`.
  URL 60s TTL, **nunca persistir em query cache nem logar** (Pitfall 7). Dono-da-vaga/admin only (EF já
  authenticate-THEN-authorize). Novo consumidor RH (hoje 0).
- **IA (VISRH-02):** novo hook por-candidatura `useAnaliseCandidato(candidaturaId)` (allowlist:
  `score_match, pontos_fortes[], gaps[], flags[], analise_status`) — forças/gaps **na íntegra** (sem
  `.slice(0,2)`), bandas **neutras** p/ Big Five (RNF-12a, precedente P23 UX-07). Substitui o placeholder
  vazio "Score de Triagem" HubSection (`HubCandidatoRH.tsx:293-302`). Candidato NUNCA vê score/análise.
- **Histórico (VISRH-03):** novo hook `useHistoricoCandidatura(candidaturaId)` + feed read-only render de
  `historico_candidatura` (allowlist: `etapa_de, etapa_para, ator, criado_em, justificativa`). RLS
  `rh_le_historico` WR-04 (P32) já gateia. Nova HubSection no fim.
- **Placement:** blocos como novos `<HubSection>`/`<Glass>` siblings dentro do `space-y-6` do
  `HubCandidatoRH` (CV+IA logo após "Próximo passo"/timeline; Histórico ao fim, após Decisão Final).

### Area 3 — Agendamento form + Work queue (accepted)
- **Agendamento (AGEND-02/03):** bloco na seção Entrevista do hub, **gated a `etapa_atual IN
  ('entrevista_online','entrevista_presencial')`**. Form: shadcn `Calendar` + `<input type="time">` em
  `Popover`; ações agendar / **reagendar (UPDATE in-place**, `status='reagendada'`) / **cancelar**
  (`status='cancelada'`, linha mantida) / toggle **`compareceu`**. Via novo `agendamentoService`
  (`.from('agendamentos_entrevista').insert/.update` — RLS `rh_gerencia_agendamento` gateia; **NÃO passar**
  `vaga_id`/`agendado_por`/`updated_by`/`updated_at` — o trigger `agendamento_normaliza_vaga_id` os carimba).
  Reflete no card do candidato (P35 lê via `get_meu_agendamento`).
- **Fila de trabalho (KPI-01):** nova aba **"Fila"** no `CandidatosRHPage` (tabbed page
  `todos|por-vaga|kanban` → +`fila`), **cross-vaga**, sort por tempo-em-etapa/SLA. **Coexiste** com a aba
  Kanban (ambos preservados). Prioriza "o que precisa da minha ação agora".
- **SLA thresholds (KPI-03):** **defaults hardcoded por-etapa** num constant compartilhado (ex.
  `SLA_POR_ETAPA` em `src/features/funil/.../slaThresholds.ts`); badge de aging/breach quando
  tempo-em-etapa > limite. Config por-vaga **diferida** ao backlog.

### Claude's Discretion
- Nomes finais de arquivos/hooks/componentes/rotas; ordering exato dos HubSections.
- Denominador exato do no-show rate + forma do closed-cohort na SQL (planner/researcher decide na migration).
- Se a fila cross-vaga lê de `v_triagem_panel`/`candidaturas`+`historico` ou de uma nova view/RPC leve.
- Estrutura visual do dashboard (quais charts p/ quais keys) — respeitar ui-brand + `@/components/ui/chart`.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (scout — file:line)
- **Hub:** `src/features/hub-candidato/components/HubCandidatoRH.tsx` (fn :85; "Próximo passo" :183-253;
  HubSection blocks :293-379). Rota `/rh/candidatos/:id` (`:id`=**candidaturaId**), `routes.tsx:310-316`
  → thin `PerfilCandidatoRHPage` wrapper. `HubSection.tsx` (`HubSectionEstado`).
- **IA truncation:** `src/features/triagem/components/TriagemTable.tsx:238-239` (`.slice(0,2)` — vaga-level,
  NÃO no hub). Shape `TriagemTableAnalise` :72-78. Source: view `v_triagem_panel` via
  `triagemService.ts` (allowlist :129) + `useTriagemPanel.ts` (whole-vaga, paginado).
- **CV:** `getSignedUrl(candidaturaId)` em `src/features/vagas/services/cvUploadService.ts:199-213`
  (`functions.invoke('get-curriculo-url',{body:{candidatura_id}})` → `data.signedUrl`; throws
  `CVUploadServiceError`). 0 consumidores RH.
- **KPI target:** `src/components/pages/RelatoriosRHPage.tsx` (fn :712; rota `/rh/relatorios`
  `routes.tsx:424-427`; importa `recharts` cru :18-34; agrega client-side conceitos M1 dropados).
- **Chart:** `src/components/ui/chart.tsx` (shadcn recharts wrapper; exports
  `ChartContainer/ChartTooltip/ChartTooltipContent/ChartLegend/ChartLegendContent/ChartStyle` :346-353 +
  `ChartConfig` :11; alias `recharts@2.15.2` vite.config.ts:74). `recharts ^2.15.2` em `package.json:59`.
  Consumidor exemplo: `src/features/admin/ai-costs/components/AiCostsPage.tsx:51`.
- **Kanban:** `src/components/KanbanBoard.tsx` (fn :460) dentro de `src/components/pages/CandidatosRHPage.tsx`
  (import :42, render :942; tabbed `activeTab:'todos'|'por-vaga'|'kanban'` :143, rota `/rh/candidatos`
  `routes.tsx:300-306`).
- **`funil_kpis` contrato ATUAL:** `supabase/migrations/20260715000002_...:113-120` — 3 keys:
  `median_time_per_stage {stage:seconds}`, `conversion_stage_to_stage [{de,para,n}]`,
  `volume_by_stage {etapa:n}`. **KPI-04 keys AUSENTES** (net-new).
- **Padrões:** query-key factory `entrevistaKeys` (`src/features/entrevista/hooks/useEntrevistaScorecard.ts:39-45`,
  `useQuery staleTime 5min/retry 2`, mutations `invalidateQueries`). Service module + `class XServiceError`
  + allowlist consts (`entrevistaService.ts`). `.insert/.update`: `candidaturasService.ts:172,456`.
  `.rpc`: `decisaoService.ts:151`, `triagemService.ts:439`.

### Established Patterns
- RLS row-level, não column-level → leituras por allowlist explícita, nunca `select('*')`
  ([[reference_select_star_leaks_pii]]).
- EF privilegiada authenticate-THEN-authorize ([[reference_ef_authenticate_vs_authorize]]) — CV já pronto.
- Migrations PROD via MCP `apply_migration` + reconciliar `schema_migrations.version`→filename (Pitfall 6);
  **diff `pg_get_functiondef` antes de `CREATE OR REPLACE`** (DBMIG-02, near-miss P27).
- MCP `execute_sql` NÃO surfaça `RAISE NOTICE` → smokes via adaptação result-returning (`set_config`+SELECT).
- Bandas neutras p/ Big Five (não avaliativo, RNF-12a; P23 UX-07). RNF-07a (humano decide) — nenhuma ação
  desta fase auto-rejeita.

### Integration Points
- `agendamentos_entrevista` (P33): RH escreve DIRETO; trigger carimba vaga_id/agendado_por/updated_*.
  `get_meu_agendamento` = leitura candidato (P35). `funil_kpis`/`get-curriculo-url` (P32).
- `database.types.ts` na RAIZ — regen após estender `funil_kpis`.
- Charts consomem `funil_kpis` (nunca agregação client-side, nunca PII).

</code_context>

<specifics>
## Specific Ideas
- REQUIREMENTS.md linha 56 (K4): coorte fechada por janela de inscrição é o default recomendado.
- VISRH-02: a análise "completa" = forças/gaps na íntegra (o `.slice(0,2)` é só da tabela vaga-level; o hub
  não renderiza IA hoje → é display novo).
- Fila + Kanban COEXISTEM (KPI-01 explícito: "mantendo o Kanban por-vaga existente").
- Dashboard substitui `RelatoriosRHPage` na MESMA rota (não órfã uma rota nova).

</specifics>

<deferred>
## Deferred Ideas
- Candidate-facing agendamento card + `.ics` + badge ≤24h → **Phase 35**.
- SLA thresholds configuráveis por-vaga (UI/tabela) → backlog (v1 = hardcoded constant).
- COMM (notificação e-mail do agendamento), TALENT, LGPD-OPS → M7+.

</deferred>
