# Phase 25: Correção do Funil (lado RH — enums, colunas & contratos) - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, all accepted as recommended

<domain>
## Phase Boundary

O RH opera o funil sobre enums e colunas que **existem** — Kanban, UpdateStatusModal, Editar Vaga e decisão funcionam sem tocar em artefatos M1 mortos — e ninguém rejeita candidato sem trilha de auditoria/justificativa (RNF-07a). No mesmo file-touch, o hub RH e as affordances mortas são corrigidos/ocultados.

**Requirements:** FUNIL-02, FUNIL-03, FUNIL-04, FUNIL-05, FUNIL-06, FUNIL-09, FUNIL-11, UX-03, UX-06.

**In scope:**
- Server-side guard que impede rejeição sem trilha (FUNIL-02 / A9).
- Rewire do Kanban + UpdateStatusModal para o enum `etapa_processo` real e o fluxo M2 (FUNIL-03/06 / A12/A16); deleção do enum/escada M1 legado.
- Editar Vaga: hidratação sobre colunas reais + write-path real dos campos-base (FUNIL-04 / A13).
- Contrato canônico de test-id `cargoTemplates` ↔ `AvaliacaoContainer` (FUNIL-05 / A15).
- `registrar_decisao` preserva histórico (FUNIL-09 / A26).
- `upsert_pergunta_opcoes_metadata` com guard de status + ownership (FUNIL-11 / A29).
- Hub nav por `candidatura.id` + 404 (UX-03 / QW4); varredura de affordances mortas + telas mock gateadas (UX-06 / QW11 / A14 / A37).

**Out of scope (defer):**
- Gestão de usuários RH real e perfil RH real → **M5** (aqui só gatear/ocultar as telas mock — A14/A37).
- Busca global do RHTopBar (feature nova) → M5 (aqui só neutralizar o no-op).
- Alcançabilidade/scoring do candidato (A17/A18, SJT por cargo, cognitivo) → **Phase 26**.
- Migrations/baseline/ledger (A10) → **Phase 27**; `auto_rejeitado` semântica (A28) → Phase 27.
- Scoping horizontal de `analise_candidato_vaga`/`redacoes_candidato` (A30) — já é SEC/Phase 24 território; não reabrir aqui salvo se o planner achar aberto.
</domain>

<decisions>
## Implementation Decisions

### Area 1 — Rejection audit trail & legacy Kanban (FUNIL-02/03/06)
- **Rejection guard = DB trigger.** Adicionar `BEFORE UPDATE` trigger em `candidaturas` (sem cláusula `OF`, ou cobrindo `status`) que bloqueia mudança de `status` para `rejeitado`/`aprovado` fora dos caminhos sancionados. Caminhos sancionados = `registrar_decisao` / `submit_candidatura_atomic`, detectados por **flag GUC** setada dentro desses DEFINER RPCs (precedente `avancar_etapa_flag_guard` migration 20260624000004). Server-authoritative; não bypassável pelo client. **Não** pode quebrar o trigger `trg_n8n_status_candidatura AFTER UPDATE OF status` (Phase 24 SEC-03) nem o `candidaturas_avancar_etapa_trg BEFORE UPDATE OF etapa_atual`.
- **Kanban + UpdateStatusModal = rewire para o enum real.** `KanbanBoard.tsx` colunas passam a usar as 6 etapas reais (`inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final`) e o fluxo M2 (`updateCandidaturaEtapa` / trigger `avancar_etapa`) em vez do UPDATE cru + `getProximaEtapa`.
- **Deletar o auto-advance legado** de `updateCandidaturaStatus` (candidaturasService) e os símbolos M1 mortos de `vagasTypes.ts`: `EtapaProcesso` (10-value), `ETAPAS_SEQUENCIA`, `getProximaEtapa`, `ETAPA_PROCESSO_LABELS`/`ETAPA_PROGRESS`/`ETAPA_TO_KANBAN` na medida em que estiverem acoplados aos valores mortos.
- **Tipar `candidaturas.etapa_atual`** como `Database['public']['Enums']['etapa_processo']` para o drift não recorrer.

### Area 2 — Editar Vaga persistence & cargoTemplates contract (FUNIL-04/05)
- **Hidratação → colunas reais.** Mapear os 8 campos-fantasma para as colunas que existem: `faixa_salarial` → `faixa_salarial_min`/`max`; `carga_horaria` → `jornada_trabalho`; `descricao_completa` → `responsabilidades`/`sobre_cargo`; `requisito_formacao` → `requisitos_formacao`; `requisito_experiencia` → `requisitos_experiencia`; `requisito_tecnico` → `requisitos_tecnicos`; `requisito_comportamental` → `requisitos_habilidades`; `requisito_diferencial` → `diferenciais`/`perfil_ideal`. (Confirmar nomes exatos contra `database.types.ts` vagas Row no plano.)
- **Persistir os campos-base.** Adicionar um `.from('vagas').update(...)` real no submit (edição) para os campos-base + status radio — hoje só `pesos_avaliacao`/`testes_aplicaveis` são gravados (via `configVagaService`, que **já** funciona; o gap é o restante do formulário). Config M2 continua salvando como está.
- **Contrato de test-id = UM enum canônico compartilhado (lib).** `cargoTemplates` emite `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}`; `AvaliacaoContainer` reconhece `{sjt_mc, sjt_caso_aberto, big_five, redacao}`. Definir o conjunto canônico numa lib, `deriveCards` **filtra** só os testes candidate-facing, e mapear `work_sample_sjt`→telas mc+caso, `redacao_cultural`→`redacao`, `cognitivo`→prova cognitiva (a alcançabilidade em si é Phase 26 — aqui só o contrato de ids).
- **Adicionar teste de contrato** template↔container (parse de todo template pelo branch-map do container) para regress-guard.

### Area 3 — Decision history & option-edit guard (FUNIL-09/11)
- **`registrar_decisao` preserva histórico via tabela append-only.** Criar `decisao_final_historico` (não existe hoje) alimentada por trigger `AFTER UPDATE` em `decisao_final` que copia `OLD.*` antes do overwrite. Cobre os caminhos que hoje não geram linha de histórico (emenda sem mudança de etapa, `em_espera`).
- **`criterio_texto` honesto.** Setar `candidaturas.etapa_justificativa = p_justificativa` **antes** do UPDATE de etapa no RPC, para que a linha de `historico_candidatura` carregue a justificativa real da decisão (não a stale de uma transição antiga).
- **`upsert_pergunta_opcoes_metadata` = hard-block em vaga ativa.** `RAISE` se a vaga da pergunta tiver `status <> 'rascunho'` (espelha o gate do `publish_vaga`). Editar opções de vaga ATIVA fica bloqueado — evita regenerar `opcao_id`s, orfanar `opcao_knockout_id` e desalinhar o snapshot `qualificacao_etapa1`.
- **Ownership check** no mesmo RPC: além de `role IN ('rh','administrador')`, exigir posse da vaga (`vaga.created_by = auth.uid()` OU administrador), consistente com o scoping de Phase 24.

### Area 4 — Dead affordances & mock screens (UX-03/06)
- **Telas mock A14/A37 = empty-state "não disponível".** `/rh/configuracoes` (gestão de usuários mock) e RH `MeuPerfilPage` (stubs salvar/senha/foto) ficam ocultas atrás de um empty-state claro ("gestão de usuários ainda não disponível" / "edição de perfil em breve"). Implementação real → M5. É o fix de segurança mínimo (offboarding LGPD). **Não** DEV-gate, **não** deleção de rota.
- **Affordances no-op removidas** (ou ligadas a dados reais quando trivial): badges hardcoded `12`/`5` no `RHSidebar`, tiles "—", botões no-op ("📚 Usar da Biblioteca", "Preview" template, busca global do `RHTopBar`).
- **`DecisaoFinalPage` no-op avançar/rejeitar = ocultados** (o `ComparativoScreen` embutido com `onAvancar={()=>{}}`/`onRejeitar={()=>{}}`) — o caminho real de decisão é `registrar_decisao`.
- **Hub nav = `candidatura.id`.** Corrigir `CandidatosRHPage.handleVerPerfil` (e o forward do `KanbanBoard.onViewPerfil`) para passar `candidatura.id`, não `candidato.id`, ao `/rh/candidatos/:id` (que o `HubCandidatoRH` já lê como candidaturaId). Adicionar estado **404/not-found** no hub quando o id não resolve (hoje degrada silenciosamente para header genérico "Candidato"/"—").

### Claude's Discretion
- Nomes exatos de colunas/símbolos, forma do GUC flag, layout dos empty-states, e se algum símbolo M1 tem consumidor vivo que impeça deleção limpa (nesse caso, deprecar em vez de deletar) — a decidir no plano contra o código real.
</decisions>

<code_context>
## Existing Code Insights

### DB state (verificado live via Supabase MCP, 2026-07-09)
- Enum `etapa_processo` LIVE = `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado` (6 etapas + 2 terminais). Migration de cutover: `20260607000002_etapa_processo_v2_cutover.sql` (colapsa `bigfive/disc/raven/cultura/avaliacao_final → triagem`).
- `status_candidatura` = `aguardando_resposta, em_analise, aprovado_proxima, rejeitado, finalizado` (UpdateStatusModal já alinhado).
- Triggers em `candidaturas`: `candidaturas_avancar_etapa_trg BEFORE UPDATE **OF etapa_atual**` (→ um UPDATE só de `status` NÃO dispara — raiz de A9); `trg_n8n_status_candidatura AFTER UPDATE OF status` (Phase 24 SEC-03, preservar); `trg_candidaturas_analise AFTER INSERT`; `update_candidaturas_updated_at`.
- `decisao_final_historico` **não existe** (FUNIL-09 aberto). `candidaturas.status` = enum `status_candidatura`.

### Frontend drift (scout 2026-07-09)
- **`src/components/KanbanBoard.tsx`** L44–57 `KANBAN_COLUMNS` (colunas mortas `bigfive/disc/raven/cultura`; faltam `inscricao/avaliacao_assincrona/decisao_final`); L283–302 grouping cai etapas M2 no `console.warn` → coluna `triagem`; L176 `onViewPerfil(candidato?.id)` (bug nav).
- **`src/components/modals/UpdateStatusModal.tsx`** L41–59 status labels/transitions OK; L44/269–276 "Aprovado para Próxima Etapa".
- **`src/features/vagas/types/vagasTypes.ts`** L200–207 `EtapaProcesso` M1 10-value (stale); `ETAPA_PROCESSO_LABELS` 604–611; `ETAPAS_SEQUENCIA` 652–668; `getProximaEtapa` 670+ — todos sobre etapas mortas.
- **`src/features/vagas/services/candidaturasService.ts`** `updateCandidaturaStatus` L401–525: UPDATE cru `.from('candidaturas').update({status,etapa_atual,feedback_rejeicao}).eq('id',…)` (L464–467), rejeição não muda `etapa_atual` → trigger não dispara (A9); L441–449 `getProximaEtapa` legado (`triagem`→`bigfive` = 22P02, A16); L503–506 comentário confirma n8n status é server-side agora.
- **`src/components/pages/CriarEditarVagaPage.tsx`** hidratação L135–184 lê 8 colunas-fantasma (L158–168); save só via `handleSalvarRascunho` L302–318 / `handlePublicar` L322–374 → só `testes_aplicaveis`+`pesos_avaliacao`; base form/perguntas/status radio (L644–666) sem write-path; perguntas stubadas L170–172; "Usar da Biblioteca" no-op L887–893/999–1005.
- **`src/features/config-vaga/services/configVagaService.ts`** L64–68 update real de config (funciona); publish L131 via `publish_vaga`. `templates/cargoTemplates.ts` L55–73 `baseTestes` emite `{triagem, work_sample_sjt, redacao_cultural, big_five, cognitivo, entrevista}`.
- **`src/features/avaliacao/components/AvaliacaoContainer.tsx`** L56–72 `testeLabel` + L308–322 `handleOpenTeste` reconhecem `{sjt_mc, sjt_caso_aberto, big_five, redacao}` — zero overlap com cargoTemplates exceto `big_five` (A15).
- **`src/features/hub-candidato/components/HubCandidatoRH.tsx`** L78–79 lê `:id` como candidaturaId (correto); sem 404, degrada p/ header genérico L104–105.
- **`src/components/pages/CandidatosRHPage.tsx`** `handleVerPerfil` L252–254 navega `/rh/candidatos/${candidatoId}`; chamado com `candidato?.id` L409/L774 (`candidato = candidatura.candidato`); `<KanbanBoard onViewPerfil={handleVerPerfil}/>` L963 (bug UX-03).

### DB objects (migrations)
- **`registrar_decisao`** — `supabase/migrations/20260625100001_decisao_final_phase15.sql` fn L73–149; UPSERT `ON CONFLICT (candidatura_id) DO UPDATE SET … por_usuario=auth.uid()` L122–131 (overwrite); UPDATE terminal candidaturas L139–143 só p/ `aprovado`/`rejeitado`; `em_espera` sem history (A26).
- **`upsert_pergunta_opcoes_metadata`** — `supabase/migrations/20260607010003_upsert_pergunta_opcoes_metadata_rpc.sql` fn L34–91; só role check L50–54; DELETE total L57 + `gen_random_uuid()` L62 (regen opcao_id); grava `opcoes_resposta` L84–86 (A29).
- Precedente de flag GUC: `supabase/migrations/20260624000004_avancar_etapa_flag_guard.sql`; gate `publish_vaga` (status rascunho→ativa) a espelhar.

### Affordances mortas (scout)
- `src/components/RHSidebar.tsx` L74 `badge:12`, L80 `badge:5` (render L224–227).
- `src/components/RHTopBar.tsx` `handleSearch` L31–35 no-op; search box L84–95.
- `src/features/decisao/components/DecisaoFinalPage.tsx` `<ComparativoScreen onAvancar={()=>{}} onRejeitar={()=>{}}/>` L194–207 (L197–198).
- **`src/components/pages/ConfiguracoesPage.tsx`** (A14) `/rh/configuracoes` — mock usuarios L169–207, handlers local/stub (toggle L461–463, excluir L465–471, reset L490–494, saves L417/436/473); webhooks c/ nomes M1 mortos L153–157. Rota `routes.tsx` L60/407–414 (RoleGuard administrador); nav L507; sidebar id `configuracoes-rh`.
- **`src/components/pages/MeuPerfilPage.tsx`** (A37) `/rh/perfil` — `handleSalvarDados` L38–40, `handleAlterarSenha` L42–49, `handleAlterarFoto` L51–53 (todos TODO(M5) sem persistência). Rota `routes.tsx` L61/399–406; nav L506; via RHTopBar L37–39.

### Established patterns (reuse)
- EF/RPC privilegiado: two-client + authenticate-THEN-authorize + vaga-scope por `created_by` (Phases 10/24).
- Migrations PROD via **Supabase MCP** `apply_migration`/`execute_sql` (bypassa 42601; grava version row). Version-row reconcile é território de Phase 27.
- Commits via `git -c core.hooksPath=/dev/null` (allowlistado).
- Baseline tsc travado em **128** (`ci.yml`, red-on-growth). Corrigir colunas-fantasma deve **reduzir** o baseline (TS2551/TS2339 hoje enterrados) — re-medir e re-travar.
- Deno EF corpus verde em CI; vitest verde; contract test é o padrão de regress-guard (precedente Phase 11 SJT open-case).

### Integration points
- Rotas RH: `src/router/routes.tsx` (`/rh/candidatos`, `/rh/candidatos/:id`, `/rh/vagas/editar`, `/rh/configuracoes`, `/rh/perfil`).
- Fluxo M2 vivo em paralelo: `triagemService.ts` (`updateCandidaturaEtapa`, `ETAPA_M2_LABELS`) — o alvo do rewire do Kanban.
</code_context>

<specifics>
## Specific Ideas

- A9 guard deve ser **estrutural** (trigger + GUC), não só policy — o audit é explícito que RLS não congela colunas. Espelhar o precedente `avancar_etapa_flag_guard`.
- Preservar invariantes: RNF-07a (nunca auto-rejeita por score), `decisao_final.por_usuario NOT NULL`, revisão humana obrigatória. O guard de A9 fecha o buraco pelo qual uma rejeição escapava da auditoria LGPD-02.
- FUNIL-04 nuance do scout: a **config** (pesos/testes) já persiste; o que se perde é o resto do formulário — escopar o write-path novo aos campos-base, sem reescrever a config existente.
- A15 aqui é **só o contrato de ids** (template↔container). A alcançabilidade de fato do cognitivo/SJT-por-cargo (A17/A18) é Phase 26 — não puxar para cá.
</specifics>

<deferred>
## Deferred Ideas

- Gestão de usuários RH real + perfil RH real (A14/A37 implementação) → **M5** (aqui só empty-state).
- Busca global do RHTopBar → M5.
- Alcançabilidade + scoring íntegro do candidato, SJT filtrado por cargo, cognitivo alcançável (A17/A18) → **Phase 26**.
- Baseline/ledger de migrations (A10), semântica de `auto_rejeitado` (A28), reinscrição pós-soft-delete (A27) → **Phase 27** (A27 pode encostar em Phase 26 — decisão do roadmap).
- FK real `candidaturas.opcao_knockout_id → pergunta_opcao_metadata` + coluna de texto denormalizada (parte de A29) — considerar no plano; se pesado, o hard-block de status já fecha o vetor principal.
</deferred>
