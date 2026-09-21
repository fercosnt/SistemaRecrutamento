---
phase: 48-consertos-da-jornada-bloco-1
plan: 02
subsystem: frontend
status: complete
tags: [jorn-26, candidatura-encerrada, predicado-canonico, knockout, hub-rh, funil, publicacao]

requires:
  - phase: 48-consertos-da-jornada-bloco-1
    provides: "48-01 — public.candidatura_encerrada(etapa, status) e a CTE volume de funil_kpis, em PROD"
provides:
  - "src/lib/candidatura/candidaturaEncerrada.ts — espelho TS do predicado SQL (candidaturaEncerrada, ETAPAS_TERMINAIS, STATUS_TERMINAIS)"
  - "HubCandidatoRH sem Avançar/Rejeitar para candidatura encerrada, com data-testid=hub-acoes-encerrada dizendo por quê (C1/C1b)"
  - "getEntrevistaContexto / EntrevistaContextoRow com status"
  - "CandidatosRHPage.funilEtapas pela mesma regra da CTE volume (C2)"
  - "DashboardCandidatoPage usando o helper canônico, sem mudança de comportamento"
affects: [48-08, 48-09]

tech-stack:
  added: []
  patterns:
    - "Predicado de domínio compartilhado em src/lib/<dominio>/ espelhando função SQL, com os mesmos casos da tabela-verdade do smoke"
    - "Ação escondida vem com linha que diz por quê (data-testid próprio), nunca some calada"

key-files:
  created:
    - src/lib/candidatura/candidaturaEncerrada.ts
    - src/lib/candidatura/__tests__/candidaturaEncerrada.test.ts
    - src/features/hub-candidato/components/__tests__/hubAcoesEncerrada.test.tsx
  modified:
    - src/features/entrevista/services/entrevistaService.ts
    - src/features/hub-candidato/components/HubCandidatoRH.tsx
    - src/components/pages/CandidatosRHPage.tsx
    - src/components/pages/DashboardCandidatoPage.tsx

key-decisions:
  - "Retroceder e o CTA de workspace NÃO foram gated por encerrada — posicionais (varredura §4 ii); D-21 lista só Avançar/Rejeitar"
  - "funilEtapas usa candidaturaEncerrada + ETAPAS_TERMINAIS inline (critério de aceite literal), sem helper extra; o «Total» da aba segue contando todas"
  - "vagaCandidaturas já traz status (listCandidaturasByVaga projeta *), então nenhuma allowlist nova foi precisa para C2"

requirements-completed: [JORN-26]

metrics:
  duration: "~35 min"
  completed: 2026-09-21

plan_head_before: 694dce1ef4ead21eb7da1cccc97ee463b277b6c0
actuals:
  tokens: 5400
  tasks: 3
  commits: 2
---

# Phase 48 Plan 02: predicado canônico no front — hub, funil e painel · SUMMARY

**O hub do RH para de oferecer «Avançar»/«Rejeitar» a candidatura encerrada (knockout e
`finalizado` legado) e diz por quê; o funil da aba «Por Vaga» deixa de contar knockout como
inscrição pendente — tudo por um helper TS que espelha `public.candidatura_encerrada` — e está
no ar.**

## O que mudou

| Onde | Mudança | Prova |
|---|---|---|
| `src/lib/candidatura/candidaturaEncerrada.ts` (novo) | `candidaturaEncerrada(etapa, status)` = etapa ∈ {aprovado, rejeitado} OU status ∈ {rejeitado, finalizado}, null-safe; exporta os dois conjuntos | 14 testes: os 10 casos do plano + `aprovado_proxima`, etapa terminal sem status, valor desconhecido, conjuntos = SQL. Predicado conferido contra a migration `20260921000001:127-128` |
| `entrevistaService.getEntrevistaContexto` | allowlist passa a `id, vaga_id, etapa_atual, status, …`; `EntrevistaContextoRow.status: string \| null` | nenhum consumidor quebrou (`useEntrevistaScorecard`, `EntrevistaDashboard`, `EntrevistaWorkspace` e as invalidações só usam a chave) |
| `HubCandidatoRH` (C1/C1b) | `encerrada = candidaturaEncerrada(etapaAtual, contexto?.status)`; Avançar só se `proximaEtapa && !encerrada`; Rejeitar só se `!encerrada`; senão `<p data-testid="hub-acoes-encerrada">Candidatura encerrada — não há ação de funil a tomar.</p>` | `hubAcoesEncerrada.test.tsx` (knockout, `triagem`+`finalizado`, em andamento) verde; `hubAcoesEmTriagem.test.tsx` segue verde. **O teste morde:** com o status neutralizado (`candidaturaEncerrada(etapaAtual, null)`) os casos (a) e (b) reprovam |
| `CandidatosRHPage.funilEtapas` (C2 · D6) | etapa soma só se `ETAPAS_TERMINAIS.has(e) \|\| !candidaturaEncerrada(etapa, status)` — a CTE `volume` de `funil_kpis` | leitura direta contra `20260921000002:389-390`; `status` já vem na lista (`select *`) |
| `DashboardCandidatoPage` | `STATUS_TERMINAIS` local removido; os dois usos e `emAndamento` passam pelo helper | suítes `DashboardCandidatoPage.*` verdes; `hasDecisaoFinal` byte a byte intocado (D-12, grep da linha de retorno) |

Nenhum portão de evidência foi acrescentado ao avanço (D-08): em andamento, Avançar segue 1 clique.

## Verificação

- `npx vitest run src/lib/candidatura src/features/hub-candidato src/features/entrevista` → 18 arquivos / 146 testes verdes.
- `npm run test:run` → **204 arquivos / 2020 testes verdes**.
- `tsc` = **90** nos dois commits (D-15; hook do pre-commit confirmou).
- `npm run build` → marcador em `build/assets/PerfilCandidatoRHPage-B6-ecpqx.js` (chunk lazy de `/rh/*`).

## Publicação (D-16 / D-18)

`git push origin main` (`694dce1e..f9cf50c6`, só os dois commits deste plano estavam pendentes).
`git log --oneline origin/main..HEAD` **vazio**. Crawler do plano contra `https://rh.beautysmile.com.br`:
primeira passada logo após o push → `AUSENTE` (a Vercel ainda publicava); ~30 s depois →
**`PRESENTE em PROD: hub-acoes-encerrada`** em `/assets/PerfilCandidatoRHPage-B6-ecpqx.js` — o mesmo
hash do build local. Conferido de novo às 2026-09-21T13:46Z com o comando literal do plano.

## Commits

| Task | Commit | O quê |
|---|---|---|
| 1 (tracer) | `f72f052b` | helper + teste, `status` no contexto, hub gated + teste |
| 2 | `f9cf50c6` | funil «Por Vaga» e painel do candidato pelo helper |
| 3 | — | publicação, sem mudança de código |

## Deviations from Plan

None - plan executed exactly as written. (Registro: cheguei a extrair a regra do funil num
helper `contaNoVolumeDaEtapa`, mas o critério de aceite pede `candidaturaEncerrada` usado em
`funilEtapas`; desfiz antes do commit e escrevi a regra inline. Nada disso entrou no histórico.)

## Known Stubs

Nenhum.

## Self-Check: PASSED

- `src/lib/candidatura/candidaturaEncerrada.ts`, `…/__tests__/candidaturaEncerrada.test.ts`, `…/__tests__/hubAcoesEncerrada.test.tsx` existem ✓
- commits `f72f052b`, `f9cf50c6` no histórico e em `origin/main` ✓
- `origin/main..HEAD` vazio ✓ · marcador presente em PROD ✓
