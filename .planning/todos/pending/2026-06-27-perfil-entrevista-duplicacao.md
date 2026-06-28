---
created: 2026-06-27
title: Investigar duplicacao perfil do candidato vs workspace de entrevista (ENTREV-PERFIL-DUP-01)
area: entrevista
severity: baixa
files:
  - src/router/routes.tsx
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - "PerfilCandidatoRHPage (/rh/candidatos/:id)"
---

## Problem

[investigacao / baixa] Pego no re-teste 2026-06-27. Possivel conteudo duplicado/sobreposto
entre duas telas RH:
- `/rh/candidato/:id/entrevista` → `EntrevistaWorkspace` (Painel / Guia / Transcricao /
  Avaliacao).
- `/rh/candidatos/:id` → `PerfilCandidatoRHPage` — o perfil do candidato ja mostraria
  "partes de entrevista".

Confirmar:
1. Que conteudo de entrevista (se algum) aparece no perfil `/rh/candidatos/:id` e se
   sobrepoe/duplica o `EntrevistaWorkspace`.
2. O caminho de navegacao perfil → entrevista (existe link? esta claro? leva ao
   workspace certo?).
3. Se ha duplicacao real, decidir fonte unica (workspace) e o que o perfil deve so
   resumir/linkar vs renderizar.

## Solution

TBD — primeiro investigar (read-only): mapear o que `PerfilCandidatoRHPage` renderiza
sobre entrevista e comparar com `EntrevistaWorkspace`. Depois decidir consolidacao /
link. Sem mudanca ate confirmar o escopo da duplicacao.
