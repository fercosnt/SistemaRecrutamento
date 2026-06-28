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

## Investigação (2026-06-27 — CONCLUÍDA, read-only, nenhuma mudança de código)

**Achado: a duplicação é REAL e é sintoma de um gap maior — existem DUAS camadas de RH paralelas.**

1. **`PerfilCandidatoRHPage` (`/rh/candidatos/:id`) é um MOCK legado estático.** 1864 linhas,
   ZERO `useQuery`/`useParams`/`supabase`/service, NÃO importa nada de `@/features/*`. Dados
   100% hardcoded (perguntas/respostas fixas, "Recomendo agendar entrevista urgente.", tabela
   Raven, etc.). Tem abas próprias: visão-geral, formulário, **bigfive, disc, raven/inteligência,
   manifesto, entrevista-online, entrevista-presencial** — com `transcricaoOnline/Presencial`
   em `useState` e `salvar` stub ("// Aqui você salvaria no backend"). **Baseado numa concepção
   ANTIGA do funil** (DISC, Raven, manifesto) que nem bate com o funil M2 shipado
   (Big Five + SJT + redação + entrevista + cognitivo).

2. **Os workspaces RH REAIS (Phases 13/14/15) estão ÓRFÃOS — nenhum `navigate`/`Link` aponta
   p/ eles.** `EntrevistaWorkspace` (`/rh/candidato/:id/entrevista`), `RedacaoReviewPanel`
   (`/redacao`), `DecisaoFinalPage` (`/decisao`) só são alcançáveis por **URL direta** (foi
   assim que o funil E2E a1dd4c42 foi testado) ou DevNavigationMenu. Grep de navegação real:
   só comentários de doc citam essas rotas.

3. **A navegação RH cabeada usa só a camada legado mock**: TopBar / DashboardRHPage /
   CandidatosRHPage → `/rh/candidatos/:id` (mock). A ÚNICA ponte p/ feature real é
   `VagaCandidatosRHPage` (`/rh/vagas/:id/candidatos`) que usa a `TriagemTable` real +
   `useTriagemPanel`, mas só navega p/ `/rh/vagas/:id/comparativo` — **nunca** p/ entrevista/
   redação/decisão.

4. **Caminho perfil → entrevista: NÃO EXISTE.** As abas de entrevista do perfil são mock
   self-contained, sem link p/ o workspace real.

**Conclusão:** não é só "conteúdo duplicado" pontual — o perfil mock duplica (com dados falsos)
o funil inteiro, e o funil real não está cabeado na navegação. Decisão de produto necessária
(escopo maior que [baixa]). Trabalho acionável capturado em **[[2026-06-27-rh-nav-wiring]]**
(RH-NAV-WIRING-01). Esta investigação está fechada.
