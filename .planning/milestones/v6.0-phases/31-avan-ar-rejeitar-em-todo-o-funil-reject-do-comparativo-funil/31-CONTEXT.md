# Phase 31: Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo (funil-02) - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

O RH move cada candidatura por qualquer uma das 6 etapas do funil (`inscricao` → `triagem` → `avaliacao_assincrona` → `entrevista_online` → `entrevista_presencial` → `decisao_final`, + terminais `aprovado`/`rejeitado`) — **avançar**, **rejeitar** (motivo estruturado por enum + justificativa livre ≥50 exigida no servidor) e **retroceder** (justificativa obrigatória) — e rejeita direto da tela de comparativo, tudo pelo **mesmo** write-path auditável único (`UPDATE candidaturas.etapa_atual` → trigger `avancar_etapa()`), sem nunca auto-rejeitar por score (RNF-07a).

**Fora de escopo desta fase:** agendamento (Phase 33/34/35), CV/IA/KPIs/fila (Phase 34), read-primitives seguros (Phase 32). Nenhuma notificação por e-mail (COMM é M7+). Nenhuma ação em lote (v2).

**Requirements:** OPER-01, OPER-02, OPER-03, OPER-04.
</domain>

<decisions>
## Implementation Decisions

### Enforcement da rejeição + motivo estruturado (OPER-02/04)
- **Mecanismo:** nova RPC `rejeitar_candidatura` `SECURITY DEFINER` que faz `RAISE` em justificativa curta e executa o `UPDATE candidaturas.etapa_atual='rejeitado'` (+ `status='rejeitado'`, satisfazendo `guard_rejeicao_auditada()`). **NÃO edita o trigger `avancar_etapa()`** — o trigger permite terminal `rejeitado` de qualquer etapa sem exigir justificativa, então a exigência ≥50 + motivo estruturado vive na camada RPC. (Default recomendado das REQUIREMENTS "Decisões de escopo em aberto".)
- **Motivo estruturado:** novo tipo enum Postgres `motivo_rejeicao_rh` usado como **parâmetro** da RPC (validação no boundary do Postgres — valor inválido → erro); o valor é gravado como `::text` na coluna `candidaturas.motivo_rejeicao` (hoje `text`, já contém `'knockout_automatico'`). **Sem** ALTER de tipo da coluna (risco desnecessário).
- **Opções do enum (pt-BR):** `perfil_desalinhado`, `reprovado_avaliacao`, `reprovado_entrevista`, `nao_compareceu`, `desistencia`, `outro`.
- **Regra do ≥50:** `btrim()` na justificativa e exigir `char_length >= 50` com `RAISE` de mensagem pt-BR (server-authoritative, não só validação de form — OPER-02). `outro` também exige a justificativa ≥50.

### Avançar & retroceder (OPER-01/03)
- **Avançar:** reusar o `UPDATE candidaturas.etapa_atual` existente (`triagemService.updateCandidaturaEtapa` / `useUpdateCandidaturaEtapa`), estendido para funcionar a partir de qualquer uma das 6 etapas (hoje concentrado no Kanban da etapa 5). O trigger escreve a trilha de auditoria.
- **Retroceder:** reusar o mesmo `UPDATE etapa_atual` — o trigger `avancar_etapa()` **já** faz `RAISE 'Regressão de etapa exige justificativa preenchida'` quando `etapa_justificativa` é vazia. O form torna a justificativa obrigatória; nenhuma RPC nova para regressão.
- **Alvo do retrocesso:** dropdown de qualquer etapa anterior não-terminal (por ordinal do enum).
- **Piso da justificativa de retrocesso:** não-vazia (padrão do trigger). O piso ≥50 é reservado à rejeição (barra de compliance de disposição de candidato).

### Superfícies de UI + limpeza de legado (OPER-01/04)
- **Superfícies das ações:** menu do card no `KanbanBoard.tsx` + tela de perfil do candidato (`PerfilCandidatoRHPage`) + `ComparativoScreen.tsx` — as três compartilham um único diálogo de rejeição.
- **Componente compartilhado:** um `RejeitarCandidaturaDialog` (`<select>` do enum de motivo + `<textarea>` + contador de caracteres ao vivo com o piso 50) reusado nas 3 superfícies. Segue o padrão de erro `TriagemServiceError`/`DecisaoServiceError` + mutation TanStack com invalidação por `candidaturasKeys`/`vagasKeys`/`triagemKeys`.
- **Dropar RPCs legadas mortas:** na mesma migração da fase, `DROP FUNCTION` dos overloads M1-era `avancar_etapa(uuid,uuid)` e `rejeitar_candidato(uuid,text,uuid)` — ambos têm **zero callers** no código (só presentes em `database.types.ts`), resolvendo o drift dos types. (Resolve a "flag opcional de remoção" das REQUIREMENTS.)
- **Reject do comparativo (OPER-04):** rotear `ComparativoScreen.onRejeitar` → `ComparativoCandidatosPage` pela nova RPC `rejeitar_candidatura` com justificativa+motivo, substituindo o `updateCandidaturaEtapa(id, 'rejeitado')` sem justificativa de hoje. (O caso "no-op" real é o embed read-only em `DecisaoFinalPage.tsx:194`, que omite handlers de propósito — deixar como está.)

### Claude's Discretion
- Assinatura exata da RPC (`p_candidatura_id`, `p_motivo motivo_rejeicao_rh`, `p_justificativa text`), naming do service method e labels pt-BR do enum na UI ficam a critério na fase de plano, seguindo os padrões `registrar_decisao`/`registrarDecisao`.
- Migração PROD via Supabase MCP `apply_migration` (bypassa 42601 em corpos `$$`, grava version row) — precedente das Phases 6–15/24/27.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Trigger `avancar_etapa()`** — `supabase/migrations/20260712110001_avancar_etapa_auto_rejeitado_fix.sql` (corpo vivo, Phase 27). `SECURITY DEFINER SET search_path=''`, `BEFORE UPDATE OF etapa_atual`. Terminais permitidos de qualquer etapa; regressão exige justificativa; guard Phase-14 (ENTREV-03) segura avanço além de `entrevista_online` com bandeira pendente; escreve 1 row em `historico_candidatura` (`ator=auth.uid()`). **NÃO editar.**
- **`guard_rejeicao_auditada()`** — `20260709000010`, `BEFORE UPDATE OF status`; bloqueia reject só-de-status sem trilha. A RPC de rejeição deve mover `etapa_atual='rejeitado'` (dispara o trigger → escreve a trilha) para satisfazê-lo.
- **Enum `etapa_processo_v2`** — `20260607000002_etapa_processo_v2_cutover.sql`, em ordem de pipeline (`<`/`>` calcula regressão). Colunas `candidaturas.etapa_atual`/`etapa_justificativa`/`motivo_rejeicao` (`database.types.ts:845-851`).
- **`KanbanBoard.tsx`** — `src/components/KanbanBoard.tsx`; 6 colunas de trabalho (`WORKING_STAGES`/`KANBAN_COLUMNS`), terminais como pills; `handleDrop`→`moveEtapa`→`useUpdateCandidaturaEtapa`.
- **`useUpdateCandidaturaEtapa`** — `src/features/vagas/hooks/useCandidaturas.ts:413-455` → `triagemService.updateCandidaturaEtapa` (`src/features/triagem/services/triagemService.ts`), um `UPDATE candidaturas.etapa_atual` (rejeitado também seta `status='rejeitado'`).
- **`ComparativoScreen.tsx`** — `src/features/triagem/components/ComparativoScreen.tsx` (candidatos como colunas; Avançar/Rejeitar inline gated por `AlertDialog`, `showActions` quando `onAvancar && onRejeitar`). Wiring em `src/components/pages/ComparativoCandidatosPage.tsx:114-134`.
- **Padrão RPC de serviço** — `decisaoService.registrarDecisao` (`src/features/decisao/services/decisaoService.ts:151`): `supabase.rpc('registrar_decisao', {p_candidatura_id, p_decisao, p_justificativa})`; erro em classe `DecisaoServiceError` com code (`INVALID_INPUT|DATABASE_ERROR`). `TriagemServiceError` espelha isso.

### Established Patterns
- Params RPC com prefixo `p_`; mutations TanStack com key factories (`candidaturasKeys.all`/`vagasKeys.all`/`triagemKeys.all`); classes de erro customizadas por serviço.
- Migrations PL/pgSQL PROD via Supabase MCP (`apply_migration`) — corpo `$$` sem wrapper `BEGIN;/COMMIT;` (D-22).
- RLS de `candidaturas` já vaga-scoped (WR-04, Phase 24) — a RPC DEFINER continua respeitando posse via checagem interna ou herda o scoping das RLS ao rodar como o caller? (RPC DEFINER: incluir checagem de posse da vaga como as demais EFs/RPCs privilegiadas.)

### Integration Points
- Nova migração: enum `motivo_rejeicao_rh` + RPC `rejeitar_candidatura` + `DROP FUNCTION` das 2 legadas.
- Novo componente `RejeitarCandidaturaDialog` + wiring em Kanban, perfil e comparativo.
- Novo service method `rejeitarCandidatura` (+ hook `useRejeitarCandidatura`) em `src/features/triagem/`.
- Regeneração de `database.types.ts` após a migração (remove os overloads mortos, adiciona a nova RPC + enum).
</code_context>

<specifics>
## Specific Ideas

- A rejeição do comparativo (OPER-04) é o "fecho do débito funil-02": hoje o comparativo faz um `UPDATE`-para-`rejeitado` **sem justificativa/motivo**; a fase o substitui pela RPC auditável com justificativa ≥50 + motivo enum.
- Enum de motivos parte de 6 valores pt-BR; `outro` cobre casos não listados mas ainda exige a justificativa ≥50.
- O contador de caracteres ao vivo (piso 50) no diálogo é a affordance que espelha o `RAISE` do servidor — o servidor é a autoridade, o contador é UX.
</specifics>

<deferred>
## Deferred Ideas

- **Ações em lote** (avançar/rejeitar vários candidatos de uma vez) — OPER-v2-01, risco de integridade de auditoria; v1 é individual.
- **Flag "manter no banco de talentos"** no reject — TALENT é M7+.
- **Notificação ao candidato da rejeição/transição** por qualquer canal além do painel in-app — COMM é M7+; o painel do candidato lê o próprio status (fora desta fase).
- **Remoção do `RelatoriosRHPage`** legado — cleanup opcional, tratado no dashboard de KPIs (Phase 34).
</deferred>
