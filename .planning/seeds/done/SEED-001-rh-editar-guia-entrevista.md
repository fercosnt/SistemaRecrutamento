---
id: SEED-001
status: dormant
planted: 2026-06-29
planted_during: post-v2.0 (milestone complete; no active milestone)
trigger_when: next milestone scoping RH funnel refinement / entrevista / avaliação
scope: medium
---

# SEED-001: RH editar/adicionar perguntas no guia de entrevista (ENTREV-GUIA-EDIT-01)

## Why This Matters

O guia STAR/PEI é o artefato de preparação do entrevistador. Hoje (funil M2 shipado) o RH
só consegue **gerar** o guia por IA (online/presencial) e **visualizá-lo** — não pode
**editar** as perguntas geradas nem **adicionar** perguntas manuais (texto + dimensão),
remover ou reordenar. Um roteiro de entrevista que não pode ser ajustado pelo entrevistador
tem valor limitado: o RH precisa adaptar o roteiro ao candidato/vaga antes da conversa.

Earmarked pelo usuário (2026-06-29, `/gsd-discuss-phase ENTREV-GUIA-EDIT-01`) para ser
feito no **próximo milestone (M3)** e executado via `/gsd-autonomous` junto com o batch.

## When to Surface

**Trigger:** when relevant — qualquer milestone que toque o funil RH, entrevista, ou
refinamento de avaliação. Naturalmente um candidato a M3 ("Refinamento RH & Hardening").

This seed will surface during `/gsd:new-milestone` when the milestone scope matches.

## Scope Estimate

**Medium** — não é só frontend; envolve um **novo caminho de escrita seguro** em
`entrevista_guias` (hoje candidate-DENY, sem policy INSERT/UPDATE → só o service_role da EF
escreve, em modo append). Já escopado read-only durante a discussão; gray areas a fechar no
`/gsd-discuss-phase` do M3:

1. **Transporte de escrita** — RPC `SECURITY DEFINER` (recomendado: edição não usa IA;
   espelha o padrão `publish_vaga` / `salvar_avaliacao_entrevista`) **vs** EF nova/estendida.
   Auth = authenticate-THEN-authorize ([[reference_ef_authenticate_vs_authorize]]):
   role RH derivado de `usuarios_rh` (NÃO dos claims JWT — silent-403 landmine) +
   posse da vaga via `candidatura → vaga.created_by`; `administrador` bypassa.
2. **Modelo de persistência** — UPDATE da row mais recente in-place **vs** append de uma
   nova row versionada. A EF `gerar-guia-entrevista` faz **append-INSERT** por geração;
   `getGuia` lê a row mais recente **por `tipo`** (online|presencial). Decidir qual row
   o "editar" alveja e como `tipo` interage.
3. **Shape + origem** — persistir o shape pt-BR canônico `guia.perguntas[]`
   (`pergunta`/`dimensao`) que o painel lê, com **`origem: 'ia' | 'manual'` por pergunta**
   (auditoria — pedido explícito do todo). `normalizeGuia` (entrevistaService) já faz a
   ponte EF `questions[]`→`perguntas[]`; na escrita manual persistir já-normalizado.
   Campos editáveis: `pergunta` + `dimensao` (+ talvez âncoras BARS / `score_atual`).
4. **UX de edição** — inline vs modo-edição/modal; controles add/remover/reordenar;
   botão explícito "Salvar guia" vs autosave; optimistic vs refetch. `GuiaEntrevistaPanel`
   é **read-only** hoje.
5. **Interação com regenerar (edge importante)** — se o RH editar e depois clicar "Gerar
   guia", a EF append-INSERT cria nova row IA → `getGuia` passa a ler a nova (edições
   "perdidas"). Decidir: avisar antes de regenerar / mesclar / manter edição manual à parte.
6. **RLS** — manter a escrita funilada pelo caminho DEFINER (RPC/EF) com authorize explícito;
   **NÃO** adicionar uma policy RH UPDATE ampla em `entrevista_guias` que contornaria o
   check de posse. Invariante RNF-07a preservada (guia nunca escreve `candidaturas`).

## Breadcrumbs

- `src/features/entrevista/components/GuiaEntrevistaPanel.tsx` — painel read-only (renderiza `guia.perguntas[]`)
- `src/features/entrevista/components/EntrevistaWorkspace.tsx` — host da aba "Guia"
- `src/features/entrevista/services/entrevistaService.ts` — `getGuia` / `normalizeGuia` / `gerarGuia` (read + EF invoke)
- `supabase/functions/gerar-guia-entrevista/index.ts` — EF de geração (append-INSERT, two-client authorize)
- `supabase/migrations/20260624000001_entrevista_cognitivo_tables.sql` — DDL + RLS de `entrevista_guias` (candidate-DENY, sem INSERT/UPDATE policy)
- Todo detalhado: `.planning/todos/pending/2026-06-27-guia-editar-perguntas.md`

## Notes

Capturado e enriquecido durante `/gsd-discuss-phase ENTREV-GUIA-EDIT-01` (2026-06-29). A
discussão completa de gray areas foi adiada para o ciclo do M3 a pedido do usuário ("coloque
para ser feito no próximo milestone, aí vou rodar o autonomous"). O todo em
`.planning/todos/pending/` permanece como a captura detalhada e será cross-referenciado pelo
`/gsd-discuss-phase` do M3 (via `todo.match-phase`). Precedente de write-path seguro:
`reference_ef_authenticate_vs_authorize`, `feedback_integration_contract_gap`.
