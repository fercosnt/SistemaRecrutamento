# Phase 20: Refino RH — Editar Guia de Entrevista (SEED-001) - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — grounded in a code scout of entrevista_guias storage, the gerar-guia EF write-path, RLS, the canonical SECURITY DEFINER RPC pattern, and the read-only guide UI

<domain>
## Phase Boundary

O RH consegue editar (texto + dimensão), adicionar, remover e reordenar perguntas do guia de
entrevista, com a persistência por um write-path seguro authenticate-THEN-authorize, marcação de
origem por pergunta para auditoria, e sem que a regeneração por IA descarte edições manuais
silenciosamente. Cobre ENTREV-06, ENTREV-07, ENTREV-08. Depende da Phase 18 (guia é uma das
superfícies de IA endurecidas).

**Estado descoberto no scout (importa para o plano):**
- Tabela `public.entrevista_guias (id, candidatura_id, tipo CHECK online|presencial, guia jsonb,
  prompt_version, created_at)`. A guia jsonb tem `questions[]` com `{type, competency, question,
  rationale, bars_anchors[], follow_up_probes[], red_flags[], green_flags[]}`. **SEM campo `origem`,
  SEM campo de ordem** (frontend usa índice do array). Service normaliza EN→pt-BR (questions→perguntas,
  competency→dimensao, question→pergunta) — `entrevistaService.ts`.
- `gerar-guia-entrevista` EF **INSERTA** (não upsert) uma nova row a cada regen (`index.ts:318`);
  `getGuia` lê a mais recente por created_at DESC → regen ORFÃ a row antiga → edições manuais seriam
  perdidas silenciosamente (o risco central do ENTREV-08).
- RLS em `entrevista_guias`: **só SELECT** p/ rh/administrador; **SEM policy INSERT/UPDATE** (só
  service_role EF escreve). ENTREV-08 proíbe policy RH UPDATE ampla → write-path via RPC SECURITY DEFINER.
- Padrão canônico: `salvar_avaliacao_entrevista` RPC (SECURITY DEFINER, role check, own-vaga via
  candidatura→vaga.created_by, admin bypass). EF precedent deriva role de `usuarios_rh`.
- `GuiaEntrevistaPanel.tsx` é read-only; `react-dnd` existe (KanbanBoard) mas vamos de up/down buttons.

NÃO inclui: editar bars_anchors/probes/flags (IA-only, read-only); scheduling; feature nova.
Verificação live (UAT round-trip real) → Phase 21.

</domain>

<decisions>
## Implementation Decisions

### Área 1 — Write-path & data model (ENTREV-08)
- Write mechanism: **RPC SECURITY DEFINER `save_entrevista_guia_edits`** (sem chamada Anthropic → RPC
  mais simples que EF; espelha `salvar_avaliacao_entrevista`).
- Autorização: role derivado de **`usuarios_rh`** (SELECT dentro do SECURITY DEFINER, conforme texto
  ENTREV-08) + posse via `candidatura → vaga.created_by` + `administrador` bypassa. RH sem posse e
  candidato → negação (`insufficient_privilege`). **NENHUMA policy RH UPDATE ampla** em entrevista_guias
  — o RPC é o único write-path. `auth.uid()` é GUC-based (sobrevive SECURITY DEFINER — D-09).
- `origem`: campo per-pergunta `origem: 'ia' | 'manual'` DENTRO da guia jsonb (em cada objeto de
  pergunta) + ordem explícita persistida pela posição no array.
- Upsert key: migration **deduplica para a row mais recente por (candidatura_id, tipo)** + adiciona
  `UNIQUE(candidatura_id, tipo)` + coluna `updated_at`; o RPC faz upsert `ON CONFLICT (candidatura_id, tipo)`.

### Área 2 — AI-regen vs edições manuais (anti-silent-discard, ENTREV-08)
- Comportamento de regen: **merge-preserve** — a regeneração mantém as perguntas `origem:'manual'` e
  regenera só as `origem:'ia'`; a guia nova = perguntas manuais + perguntas IA frescas (edições manuais
  sobrevivem; nada descartado silenciosamente).
- `gerar-guia-entrevista` EF muda para **upsert em (candidatura_id, tipo) + preservar perguntas manuais**
  (redeploy do EF — passo human-gated, precedente PROD). Perguntas geradas marcadas `origem:'ia'`.
- Trigger de save: botão explícito **"Salvar edições"** + toggle de modo edição (batch-save da guia
  editada inteira via RPC).

### Área 3 — Edit UI (ENTREV-06/07)
- Reorder: **botões up/down** (mais simples, keyboard-accessible, sem edge cases de DnD numa lista curta).
- Escopo de edição: inline-edit de `pergunta` (texto) + `dimensão`; adicionar pergunta manual
  (texto + dimensão, marcada `origem:'manual'`); remover; reordenar. Campos IA-only
  (bars_anchors/probes/flags) ficam display read-only.
- Auditabilidade: badge pequeno **`IA` / `Manual`** por pergunta (origem visível ao RH).

### Claude's Discretion
- Forma exata da migration de dedup (CTE keep-latest vs DISTINCT ON) e se `updated_at` ganha trigger
  ou é setado no RPC.
- Como o EF identifica/preserva perguntas manuais no merge (por origem + match de texto/ordem) desde
  que NUNCA descarte uma `origem:'manual'`.
- Forma do componente de edição (EditablePerguntaRow inline vs modal) e onde o botão "Editar"/"Salvar".
- Se o RPC valida/normaliza o jsonb (schema guard) antes do upsert.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Padrão RPC SECURITY DEFINER: `salvar_avaliacao_entrevista` (migration 20260624000002) — role + own-vaga
  + admin bypass + REVOKE PUBLIC + GRANT authenticated. Skeleton direto p/ save_entrevista_guia_edits.
- `publish_vaga` / `reprocessar_analise` RPCs — own-vaga via vaga.created_by = auth.uid(), admin bypass.
- `entrevistaService.ts` (getGuia allowlist, gerarGuia invoke + read-back) + `useGuiaEntrevista`
  (entrevistaKeys.guia(candidaturaId), gerarGuia mutation) — base p/ saveGuiaEdits service + saveEdits mutation.
- `GuiaEntrevistaPanel.tsx` (read-only render, PerguntaRow) — base do modo edição.
- `EntrevistaWorkspace.tsx` (tab 'guia') — host do painel.

### Established Patterns
- Migrations PROD via Supabase MCP `apply_migration` (bypassa 42601; grava version row) — precedente M2.
- authenticate-THEN-authorize: two-client EF (gerar-guia/index.ts:143-199) — role de usuarios_rh via
  service_role, NÃO do JWT claim; own-vaga; admin bypass. Espelhar no RPC (lookup usuarios_rh).
- RNF-07a: guia NUNCA escreve `candidaturas`; IA é recomendação. Preservar no write-path.
- Imports `npm:` estáticos no EF; named exports no front; @/ alias.

### Integration Points
- Migration nova: `entrevista_guias` (origem per-pergunta no jsonb, UNIQUE(candidatura_id,tipo),
  updated_at, dedup) + RPC `save_entrevista_guia_edits` (SECURITY DEFINER). Aplicar via MCP (human-gated).
- `supabase/functions/gerar-guia-entrevista/index.ts:318` (insert→upsert + merge-preserve manual). Redeploy (human-gated).
- `src/features/entrevista/services/entrevistaService.ts` (saveGuiaEdits + getGuia origem-aware).
- `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` (+ EditablePerguntaRow, edit-mode, badges, up/down).
- `src/features/entrevista/hooks/useEntrevistaScorecard.ts` (useGuiaEntrevista → +saveEdits mutation).
- `supabase/functions/_shared/interview-output-schemas.ts` (per-question origem no schema, se IA precisa emitir).

</code_context>

<specifics>
## Specific Ideas

- O RPC nega RH-sem-posse e candidato com `insufficient_privilege` (42501) — testar ambos os DENY no smoke SQL.
- Merge-preserve: a invariante dura é "nenhuma pergunta `origem:'manual'` some após um regen". Testar.
- Two-client/RPC: `auth.uid()` lido do JWT GUC sobrevive SECURITY DEFINER (D-09 confirmado em M2).

</specifics>

<deferred>
## Deferred Ideas

- Editar bars_anchors/probes/flags (campos IA) — fora de escopo; ficam read-only.
- Versionamento/histórico de edições do guia (audit trail por edição) — futuro; esta fase marca origem
  por pergunta mas não guarda diff por edição.
- UAT live round-trip (RH edita guia real em PROD, regen preserva) → Phase 21.

</deferred>
