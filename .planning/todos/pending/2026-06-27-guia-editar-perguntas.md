---
created: 2026-06-27
title: RH editar/adicionar perguntas no guia de entrevista (ENTREV-GUIA-EDIT-01)
area: entrevista
severity: media
files:
  - src/features/entrevista/components/GuiaEntrevistaPanel.tsx
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/entrevista/services/entrevistaService.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
---

## Problem

[feature / media] Pego no re-teste 2026-06-27. No guia de entrevista (aba "Guia"), o RH
hoje so consegue GERAR perguntas por IA (online/presencial) e visualiza-las — nao
consegue EDITAR as perguntas geradas nem ADICIONAR perguntas manuais. O guia e um
artefato de preparacao do entrevistador; o RH precisa poder ajustar o roteiro.

## Solution

TBD — precisa de design + decisao de persistencia (envolve escrita em `entrevista_guias`):
- UI: tornar cada pergunta editavel (texto + competencia/dimensao) + botao "Adicionar
  pergunta" manual + remover/reordenar.
- Persistencia: escrever o guia editado de volta. Hoje a EF `gerar-guia-entrevista`
  insere uma row nova a cada geracao; editar manualmente precisa de um caminho de
  WRITE seguro (RPC SECURITY DEFINER ou EF) — role RH + posse da vaga (mesmo padrao
  authenticate-THEN-authorize, [[reference_ef_authenticate_vs_authorize]]). Marcar
  perguntas manuais vs IA (origem) para a auditoria.
- Manter a shape lida pelo painel (`perguntas[]` com `pergunta`/`dimensao` — ver
  `normalizeGuia`, ENTREV-GUIA-DISPLAY-01) ou normalizar na escrita.
Item maior — provavelmente quer um /gsd-discuss antes de implementar (escopo + contrato
de escrita). NAO e so frontend.

## Earmark (2026-06-29)

Decidido pelo usuario: fazer no PROXIMO MILESTONE (M3), executado via /gsd-autonomous junto
com o batch. Plantado como **SEED-001** (`.planning/seeds/SEED-001-rh-editar-guia-entrevista.md`)
— enriquecido com o scouting read-only + 6 gray areas a fechar no /gsd-discuss do M3
(transporte de escrita RPC-DEFINER-vs-EF, persistencia UPDATE-vs-append, shape+origem,
UX de edicao, edge regenerar-vs-editar, RLS). O /gsd-new-milestone vai surfacar a SEED-001
automaticamente; este todo segue como a captura detalhada (cross-ref via todo.match-phase).
