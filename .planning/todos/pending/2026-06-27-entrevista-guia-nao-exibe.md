---
created: 2026-06-27T01:44:50.225Z
title: Guia de entrevista existente nao aparece na aba (ENTREV-GUIA-DISPLAY-01)
area: entrevista
files:
  - src/features/entrevista/components/EntrevistaWorkspace.tsx
  - src/features/entrevista/hooks/useGuiaEntrevista.ts
  - supabase/functions/gerar-guia-entrevista/index.ts
---

## Problem

[bug / alta] Pego no UAT-14 live 2026-06-26. Existe 1 linha em `entrevista_guias`
(tipo `online`, 5 perguntas) para a candidatura `a1dd4c42-bc92-4c37-a584-dc19a59a631d`,
mas a aba "Guia de entrevista" (`/rh/candidato/:id/entrevista`) mostra "Nenhum guia
gerado ainda. Gere o guia para preparar a entrevista." — a UI nao carrega o guia
persistido.

Reproduzir: login `recruiter@teste.com` / `Recrutador@2026` →
`/rh/candidato/a1dd4c42-bc92-4c37-a584-dc19a59a631d/entrevista` → aba "Guia de entrevista".

## Solution

TBD — investigar:
(a) o hook `useGuiaEntrevista` nao busca o guia existente (so renderiza apos gerar na
    sessao, ou cache stale do React Query);
(b) o `guia` jsonb gravado pela EF tem um shape que o render nao reconhece como
    "gerado".
O guia foi seedado via chamada DIRETA a EF `gerar-guia-entrevista` (nao pela UI) —
confirmar se o shape gerado pela UI e identico ao da EF
(`SELECT guia FROM entrevista_guias WHERE candidatura_id='a1dd4c42-...'`).
