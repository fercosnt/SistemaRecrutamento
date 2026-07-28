---
phase: 40-timeline-de-prazo-no-painel-do-candidato
verified: 2026-07-24
status: passed
score: 1/1 requirement (TIMELINE-02) verified; 7 novos testes + suíte completa 1025/1025 verde
overrides_applied: 0
human_verification: []
---

# Phase 40: Timeline de Prazo no Painel do Candidato — Verification Report

**Phase Goal:** Cada estado de espera do painel do candidato mostra o prazo esperado da etapa a partir de `config_sla_etapa` ("triagem — resposta em até X dias úteis"), enquadrado explicitamente como **estimativa** (nunca countdown) — o *pull* que complementa o *push* do e-mail, arquiteturalmente independente do pipeline (lê só a tabela de config estática).

**Verified:** 2026-07-24
**Status:** passed
**Re-verification:** No — initial verification

## Methodology Note

O verificador re-executou de forma independente: `npx vitest run src/features/timeline/` (7/7), `npm run test:run` (**1025 passed / 128 files, 0 fail**), `npm run build` (verde, assert-chunks PASSED), `npm run lint` (97 — baseline inalterado). Confirmou por leitura que não há nenhum `Date`/`setInterval`/cálculo de tempo no caminho de render (RNF anti-countdown).

## Goal Achievement — Success Criteria

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| SC1 | Cada estado de espera mostra a estimativa de prazo da etapa lida de config_sla_etapa | ✓ VERIFIED | `DashboardCandidatoPage` chama `useSlaEtapas()` 1x e renderiza `<PrazoEstimadoLinha rotulo={rotuloDeEspera(slaLookup.get(etapa_atual))} />` por card. `rotuloDeEspera` só devolve texto para etapas com `prazo_valor` não-nulo (estado de espera). Texto = `rotulo_candidato` verbatim do config (seedado na P37). |
| SC2 | Enquadrada como estimativa, NUNCA countdown | ✓ VERIFIED | Componente puro sem `Date`/`setInterval`/`Intl` de tempo (grep-guard na acceptance = 0; teste assere texto verbatim sem sufixo de contagem). Chip "Estimativa" + o texto "em até X" do config. |
| SC3 | Arquiteturalmente independente do pipeline de e-mail (lê só config estática) | ✓ VERIFIED | `src/features/timeline/` lê só `config_sla_etapa` via anon client + allowlist; zero import de EF/trigger/notificação. Falha do fetch ⇒ Map vazio ⇒ null ⇒ card intacto (enhancement). |

## Requirements Coverage

| REQ | Plan(s) | Status |
|-----|---------|--------|
| TIMELINE-02 | 40-01 (dados), 40-02 (UI) | ✓ |

## Notes

- **Correção de gap da P38 detectada aqui:** a suíte Vitest reprovava porque os 3 Deno tests da P38 (ics/email-templates/notificar-candidato) não estavam no exclude do `vite.config.ts`. Corrigido no 40-02 (caminho literal). `npm run test:run` voltou a 1025/1025.
- **Sem HUMAN-UAT:** a fase completa 100% em código/UI; nada gated (lê só config já seedada). Contraste com P38 (smoke live deferido).

## Conclusion

TIMELINE-02 está entregue e provado por execução: a estimativa de prazo aparece em cada card de espera do painel do candidato, com texto verbatim do config, enquadrada como estimativa e **nunca** como countdown, sem acoplamento ao pipeline de e-mail. Suíte completa verde. **Status: passed.**
