# Requirements: Sistema de Recrutamento Beauty Smile — v3.0 (M3 — Refinamento RH & Hardening)

**Defined:** 2026-06-29
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricao — e o RH consegue triar, avaliar e decidir num único sistema rastreável com scores comparáveis.
**Milestone type:** Hardening / consolidação (**não** expansão). Endurece o funil de IA do M2 para uso real em produção + refina a experiência do RH.
**Phase numbering:** continua de M2 (terminou na Phase 16; Phase 17 foi mini-fase standalone) → M3 começa na **Phase 18**.
**Seeds incluídos:** SEED-001 (`ENTREV-GUIA-EDIT-01`) — RH editar/adicionar perguntas no guia de entrevista.

> Invariante transversal preservado: IA é sempre **recomendação, nunca decisão** (RNF-07a); nenhuma escrita nova em `candidaturas` por trait/score/idade. Write-paths privilegiados seguem **authenticate-THEN-authorize**.

## v1 Requirements

Requirements deste milestone. Cada um mapeia para exatamente uma fase do roadmap.

### Resiliência das EFs de IA

- [ ] **RESIL-01**: As EFs de IA resistem a latência alta e overload transiente da Anthropic — timeout configurável + retry com backoff exponencial + tratamento explícito de 429/529/overload (sem falha dura na 1ª tentativa). *[achado live #1: EFs 38–102s + overload transiente → retry]*
- [ ] **RESIL-02**: `gerar-devolutiva-bigfive` completa dentro do limite de execução (reduzir/paralelizar/encadear as 5 chamadas de IA ou tornar a geração assíncrona) — não estoura timeout. *[achado live #2]*
- [ ] **RESIL-03**: Candidato e RH veem estado claro quando uma EF de IA demora ou falha (loading + erro + retry visível; nenhuma tela trava em branco) — graceful degradation.

### Correção de bugs do funil (E2E live)

- [ ] **FIX-01**: `consolidar-decisao-final` lida corretamente com `work_sample_sjt='na'` + caso aberto pendente (não trava nem zera o consolidado). *[achado live #3]*
- [ ] **FIX-02**: A tela de avaliação carrega as perguntas independentemente do mismatch `status='active'` vs filtro `'ativo'` — alinhar status/filtro na fonte. *[achado live #4]*

### Performance

- [ ] **PERF-03**: Bundle servido em chunks (code-splitting route-level + vendor) — candidato mobile-first não paga os 661 KiB monolíticos no first paint. *(fecha tech-debt HARD-02)*
- [ ] **PERF-04**: Mudança escrita (candidato/RH) aparece no perfil/dashboard do candidato em ≤60s — invalidação de cache alvo nas mutations relevantes. *(fecha tech-debt PERF-01)*

### Refino RH — Guia de Entrevista (SEED-001)

- [ ] **ENTREV-06**: RH edita o texto e a dimensão de perguntas existentes no guia de entrevista (online/presencial).
- [ ] **ENTREV-07**: RH adiciona perguntas manuais (texto + dimensão), remove e reordena perguntas no guia.
- [ ] **ENTREV-08**: Edições do guia persistem por write-path seguro (RPC/EF authenticate-THEN-authorize: role RH derivado de `usuarios_rh` + posse via `candidatura → vaga.created_by`, `administrador` bypassa; **sem** policy RH UPDATE ampla em `entrevista_guias`); cada pergunta marcada `origem: 'ia' | 'manual'` para auditoria; regenerar o guia por IA **não** descarta edições manuais silenciosamente; RNF-07a preservada (guia nunca escreve `candidaturas`).

### Production-Readiness

- [ ] **PROD-01**: UAT live da Phase 11 (Work-Sample/SJT open-case + redação — scoring round-trip com candidato real) fechado em PROD.
- [ ] **PROD-02**: HUMAN-UAT live deferidos da Phase 16 fechados (cold-start login RH, Tier-B R5/C5 axe sweep, keyboard roving-focus, Big Five aria-live) — ou explicitamente re-deferidos com justificativa registrada.

## Future Requirements

Reconhecidos mas deferidos — **não** estão no roadmap do M3. Mover para v1 exige update de roadmap.

### Tech-debt (deferido p/ M4)

- **FOUND-08**: Burn-down do tail estrutural do baseline tsc (~290 erros; ~65 são shadcn vendored DO-NOT-TOUCH; cada item restante precisa de decisão de tipo real, não one-liner).
- **CC0-01**: Sourcing do item-bank cognitivo CC0 real + ligar a prova cognitiva (hoje OFF por default via `vaga.aplica_cognitivo`; `pontuar_cognitivo` tem empty-bank guard).

### Features (candidatas a M4)

- **SCHED-01**: MS Bookings auto-scheduling de entrevistas (hoje agendamento manual; `ENTREV-02` notifica 24h antes).
- **BIAS-01**: Auditoria de bias automatizada/agendada (hoje snapshot mensal manual com export CSV — EEOC 4/5).
- **JUDGE-01**: LLM-as-judge calibrado para as avaliações de IA (rubrica + golden set).
- **NORM-01**: Norma local (percentis) do cognitivo / Big Five a partir de dados próprios acumulados.
- **DEVOL-01**: Carta de devolução por IA ao candidato rejeitado.

## Out of Scope

Explicitamente excluído neste milestone. Documentado para evitar scope creep.

| Feature | Motivo |
|---------|--------|
| Qualquer feature de domínio nova (scheduling, bias automation, LLM-judge) | M3 é hardening/consolidação — adicionar superfície a um sistema ainda não endurecido acumula fragilidade composta; deferido p/ M4 |
| FOUND-08 tsc burn-down | Tail estrutural; cada erro precisa de decisão de tipo real, desproporcional a um milestone de hardening; deferido p/ M4 |
| CC0 item-bank cognitivo | Trabalho de conteúdo (sourcing CC0) + meio-feature; prova cognitiva fica OFF por default até seed; deferido p/ M4 |
| Reescrever o perfil RH mock legado (`PerfilCandidatoRHPage`) | Fora do escopo de hardening; navegação real já cabeada na Phase 17 (RH-NAV-WIRING-01 absorvido) |
| Migrar páginas legado de `components/pages/` p/ `features/` | Refactor estrutural amplo; não bloqueia hardening |

## Traceability

Quais fases cobrem quais requirements. Preenchido durante a criação do roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESIL-01 | TBD | Pending |
| RESIL-02 | TBD | Pending |
| RESIL-03 | TBD | Pending |
| FIX-01 | TBD | Pending |
| FIX-02 | TBD | Pending |
| PERF-03 | TBD | Pending |
| PERF-04 | TBD | Pending |
| ENTREV-06 | TBD | Pending |
| ENTREV-07 | TBD | Pending |
| ENTREV-08 | TBD | Pending |
| PROD-01 | TBD | Pending |
| PROD-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 0 (roadmap pendente) ⚠️
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-06-29 (M3 — Refinamento RH & Hardening, via `/gsd-new-milestone`)*
*Last updated: 2026-06-29 after initial definition*
