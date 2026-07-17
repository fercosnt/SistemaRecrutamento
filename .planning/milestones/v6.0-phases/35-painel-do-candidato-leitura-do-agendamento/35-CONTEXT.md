# Phase 35: Painel do Candidato — Leitura do Agendamento - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 3 grey areas resolved via batch proposal

<domain>
## Phase Boundary

O candidato acompanha a entrevista agendada **exclusivamente** pelo painel do candidato (não há e-mail — o painel é o canal único). Entrega:
- **AGEND-04:** um card no painel do candidato mostrando data/hora em `America/Sao_Paulo` + link (online) ou local (presencial), lido **own-row por allowlist explícita** via a RPC DEFINER `get_meu_agendamento` (nunca `select('*')`, nunca a base table, nunca expõe `observacoes_rh`/`entrevistador`/campos internos do RH).
- **AGEND-05:** download de arquivo `.ics` client-side (zero e-mail, zero npm novo) + um **badge de lembrete** quando a entrevista está a ≤24h.

Read-only para o candidato — nenhuma escrita. Depende inteiramente da tabela `agendamentos_entrevista` + RLS + RPC provadas seguras na Phase 33. **Zero mudança de schema/migration** nesta fase (frontend puro).

**Out of scope:** notificação por e-mail/push (RNF: painel é o canal único), qualquer escrita do candidato, exibir dados internos do RH.
</domain>

<decisions>
## Implementation Decisions

### Surface & Routing
- **Correção da ROADMAP:** o card monta em `src/components/pages/DashboardCandidatoPage.tsx` (rota `/candidato/dashboard`), **NÃO** em `HubCandidatoRH.tsx` — este último é RH-only (`/rh/candidatos/:id`, wrap `RHLayout`). A menção da ROADMAP 35-01 a "HubCandidatoRH" é shorthand/erro; AGEND-04 é candidate-facing.
- **Card inline, sem rota nova.** O card renderiza inline no footer "Próximo passo" do `GlassCard` por-candidatura do `DashboardCandidatoPage`, apenas para candidaturas em etapa `entrevista_online`/`entrevista_presencial` que tenham um agendamento retornado por `get_meu_agendamento`. Nenhuma rota `/candidato/entrevista/*` nova; `funilNavMap.rotaCandidato` para as etapas de entrevista permanece inline (não precisa navegar).
- Visual: seguir a linguagem `GlassCard` existente do `DashboardCandidatoPage` (público, mobile-first) — não importar o `HubSection` dark-glass do hub RH. Estados loading/empty/error do card seguem o padrão da própria página.

### Data Display & Timezone
- **Reusar o idioma SP-pinned** de `EntrevistaDashboard.tsx:44-73` (`Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', … }).formatToParts()` → `dd/mm/aaaa às hh:mm`), **extraindo-o para um util compartilhado** (ex.: `formatDataHoraSP`) que tanto o card do candidato quanto `EntrevistaDashboard` importam. NÃO usar o formatter `date-fns` browser-local do `AgendamentoBlock` (TZ errada para AGEND-04).
- Campos exibidos (do allowlist de 7 cols): `data_hora` (formatada SP), `tipo` (online/presencial), `local_ou_link`, `status`. Nunca exibir campos fora do allowlist.
- `local_ou_link`: se `tipo='online'` e o valor for URL → link clicável (`<a target="_blank" rel="noopener noreferrer">`); se `presencial` → texto do local. 
- **Status:** linhas `cancelada`/`reagendada` permanecem visíveis (o candidato PRECISA ver cancelamentos — a RPC retorna a mais recente por `data_hora DESC`). Card sempre renderiza; `cancelada` é visivelmente marcada ("Cancelada").

### .ics Download & Reminder Badge
- **`.ics` hand-rolled client-side** (string VCALENDAR + `Blob({type:'text/calendar'})` + `URL.createObjectURL`), espelhando o precedente de download de `biasAuditService.ts:147-148`. **Zero npm novo** (confirmado ROADMAP L15 + AGEND-05).
- Conteúdo do `.ics`: `SUMMARY` genérico (ex.: "Entrevista Beauty Smile" — `vaga_id` está fora do allowlist, então sem nome da vaga), `DTSTART` = `data_hora` (emitir em UTC/`Z`, pois é timestamptz — correto e simples), `DTEND` = +1h default, `LOCATION` = `local_ou_link`. Sem PII interna.
- **`.ics` + badge de lembrete SÓ para entrevistas upcoming não-canceladas.** Botão de download `.ics` e badge ≤24h aparecem apenas quando `data_hora` é futura E status não é `cancelada`. Badge de lembrete: mostrar quando `0 < (data_hora − now) ≤ 24h`.

### Claude's Discretion
- Nome/local exato do util compartilhado (`formatDataHoraSP`), formato preciso do card, cópia pt-BR dos labels/badges, duração default do `.ics` (1h), e detalhes de layout — à discrição do executor, seguindo convenções do `DashboardCandidatoPage` + design system Beauty Smile.
- Se a RPC deve ser chamada por candidatura (a página itera candidaturas) ou uma vez — à discrição, mas respeitar staleTime/TanStack do projeto.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Read primitive:** RPC DEFINER `get_meu_agendamento(p_candidatura_id)` — `supabase/migrations/20260716000001_agendamentos_entrevista.sql:133-168`. Allowlist de 7 cols: `id, candidatura_id, tipo, data_hora, local_ou_link, status, compareceu`. Ownership via JOIN `candidatos.user_id = auth.uid()` DENTRO da fn. **Zero client callers hoje** — Phase 35 adiciona o service `.rpc(...)` + hook TanStack (espelhar shape de `useAgendamento.ts`). Cita `[[reference_select_star_leaks_pii]]`.
- **Timezone idiom (reusar/extrair):** `EntrevistaDashboard.tsx:44-73` — `DISPLAY_TIME_ZONE='America/Sao_Paulo'` + `Intl.DateTimeFormat().formatToParts()`.
- **Blob-download idiom (espelhar p/ .ics):** `biasAuditService.ts:147-148` — `new Blob([...], {type:'text/csv…'})` + `URL.createObjectURL`.
- `HubSection` disponível mas NÃO usar (dark-glass RH); o card do candidato segue os `GlassCard` de `DashboardCandidatoPage`.

### Established Patterns
- Candidate own-row reads via **DEFINER RPC**, nunca base table, nunca `select('*')` (RLS é row-level; isolamento de coluna vem da assinatura do allowlist da RPC). `agendamentos_entrevista` não tem policy SELECT de base-table para candidato (migration L96-100; smoke 33-02 (e) prova negação).
- TanStack Query v5 (staleTime 5min, retry 2); service `camelCaseService.ts` + `class XServiceError`; hooks `useCamelCase.ts`; features em `src/features/<dominio>/`.
- `tsc ≤ 104` baseline pré-existente (atualmente 97) em cadastro/vagas — não é regressão desta fase; husky pre-commit strict tsc → `--no-verify` sancionado quando bloqueado só por esse débito.

### Integration Points
- **Surface:** `DashboardCandidatoPage.tsx` — footer "Próximo passo" por-candidatura em L379-398; `formatarData` local (L86-93) é date-only browser-local (NÃO reusar p/ AGEND-04).
- **Routing:** `funilNavMap.ts:93-106` — `entrevista_online`/`entrevista_presencial` têm `rotaCandidato: () => null` hoje; card inline não exige mudar isso (nenhuma rota nova de entrevista em `routes.tsx`).
- Enums: `tipo` = `online|presencial`; `status` = `agendada|em_andamento|concluida|cancelada|reagendada|nao_compareceu` (`agendamentoService.ts:43-53`).
</code_context>

<specifics>
## Specific Ideas

- AGEND-04 (`REQUIREMENTS.md:31`) + AGEND-05 (`REQUIREMENTS.md:32`) são os 2 requirements desta fase; regra global `REQUIREMENTS.md:11` (allowlist candidate-facing, nunca `select('*')`).
- ROADMAP sub-tasks 35-01 (card own-row + AGEND-04) e 35-02 (`.ics` + badge ≤24h + AGEND-05), reusando o idioma SP.
</specifics>

<deferred>
## Deferred Ideas

- Notificação por e-mail/push do agendamento — fora de escopo por design (painel é o canal único; substitutos client-side são o `.ics` + badge). Não implementar.
- Rota/tela dedicada de entrevista do candidato — descartada em favor do card inline (pode ser revisitada num milestone futuro se o card crescer).
</deferred>
