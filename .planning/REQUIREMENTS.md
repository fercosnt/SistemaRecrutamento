# Requirements: Sistema de Recrutamento Beauty Smile — M6 (v6.0) "Operação do Funil RH"

**Defined:** 2026-07-14
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e **decidir** sobre candidatos num único sistema rastreável com scores comparáveis.
**Milestone thesis:** construir a *esteira* que faz o funil (já avaliativo) **andar** pela mão do RH. Reuse-and-tighten, não build-from-scratch — 1 tabela nova (`agendamentos_entrevista`), 2 read-primitives novos (EF `get-curriculo-url`, RPC `funil_kpis` DEFINER), e o fechamento de 2 leaks vivos. Zero dependências npm novas.

## Invariantes (mantidas em toda fase — não são requisitos, são gates)

- **RNF-07a:** o sistema **nunca** rejeita automaticamente por score — toda rejeição é uma escrita disparada por humano com justificativa; `ator=auth.uid()` mantém `auto_rejeitado=false`.
- **RNF-12a:** linguagem sempre "avaliação comportamental/cognitiva" (nunca "teste psicológico").
- **RLS não é segredo de coluna:** leituras candidato-facing usam allowlist explícita, nunca `select('*')`.
- **No-email:** COMM está fora do M6 — o candidato é notificado **apenas** pelo painel in-app (nenhum wiring de `notificar-candidato`/n8n/pg_net num diff do M6).
- **Trilha de auditoria:** nenhum código do M6 faz `INSERT` direto em `historico_candidatura` — toda transição é `UPDATE candidaturas.etapa_atual` (+ opcional `etapa_justificativa`) e o trigger `avancar_etapa()` é o único escritor. O trigger **não é editado** no M6 (carrega o guard ENTREV-03 + o predicado GUC `auto_rejeitado`).

## v1 Requirements

Requirements para este milestone. Cada um mapeia para exatamente uma fase (ver Traceability).

### OPER — Operação do funil (avançar / rejeitar / mover)

- [x] **OPER-01**: RH pode avançar um candidato para a próxima etapa em qualquer uma das 6 etapas do funil (hoje concentrado na etapa 5/Kanban), com a transição registrada em `historico_candidatura` pelo write-path existente (trigger único; nenhuma escrita direta na tabela de auditoria).
- [x] **OPER-02**: RH pode rejeitar um candidato em qualquer etapa informando um motivo estruturado (enum) **e** uma justificativa livre ≥50 caracteres, exigida no servidor (RAISE, não só validação de formulário), sem nunca rejeitar por score (RNF-07a).
- [x] **OPER-03**: RH pode mover um candidato para uma etapa anterior (regressão) informando justificativa obrigatória, respeitando o guard de regressão do trigger e registrando a trilha.
- [x] **OPER-04**: RH pode rejeitar um candidato a partir da tela de comparativo, exigindo justificativa, escrevendo pelo mesmo write-path auditável — fecha o débito **funil-02** (os botões hoje são no-op).

### AGEND — Agendamento de entrevista

- [ ] **AGEND-01**: RH pode agendar uma entrevista para um candidato (modalidade online/presencial, data e hora, link de videochamada ou local), gravada com o autor (`agendado_por`) e vaga-scoped, na tabela nova `agendamentos_entrevista`.
- [x] **AGEND-02**: RH pode reagendar ou cancelar um agendamento existente, refletido no card do candidato no painel.
- [x] **AGEND-03**: RH pode registrar o comparecimento/no-show do candidato à entrevista (campo `compareceu`) — habilita o KPI de no-show.
- [ ] **AGEND-04**: O candidato vê a entrevista agendada num card no painel — data/hora em `America/Sao_Paulo` + link ou local — sendo o painel o **único** canal (sem e-mail); leitura restrita à própria linha por allowlist explícita (nunca expõe observações internas do RH).
- [ ] **AGEND-05**: O candidato pode baixar um arquivo `.ics` do agendamento e vê um badge de lembrete quando a entrevista está a ≤24h (substitutos client-side/painel do que o mercado faz por e-mail).

### VISRH — Visibilidade do candidato para o RH

- [x] **VISRH-01**: RH pode abrir/baixar o CV do candidato via URL assinada emitida por Edge Function *authenticate-THEN-authorize* (dono da vaga ou admin) — nenhum recrutador acessa o CV de uma vaga que não é sua.
- [x] **VISRH-02**: RH vê a análise da IA completa do candidato (score_match + forças/gaps na íntegra, não truncados a 2) na tela do candidato; o candidato nunca vê score/análise.
- [x] **VISRH-03**: RH vê um feed de atividade read-only do candidato (transições de `historico_candidatura`: etapa origem→destino, autor, data, justificativa).

### KPI — Fila de trabalho & indicadores operacionais

- [x] **KPI-01**: RH vê uma fila de trabalho cross-vaga priorizada por tempo-em-etapa/SLA ("o que precisa da minha ação agora"), mantendo o Kanban por-vaga existente (dois artefatos, ambos preservados).
- [ ] **KPI-02**: RH vê KPIs operacionais essenciais sobre `historico_candidatura` — tempo **mediano** por etapa, taxa de conversão etapa-a-etapa, volume por vaga/etapa — computados por RPC SECURITY DEFINER **vaga-scoped** (nunca agregação client-side, nunca PII).
- [x] **KPI-03**: RH vê um indicador de aging/SLA breach (candidatos parados além do limite configurado por etapa).
- [ ] **KPI-04**: RH vê KPIs adicionais no mesmo RPC — time-to-hire, taxa de knockout, drop por etapa e taxa de no-show (esta habilitada por AGEND-03).

### SEG — Blindagem (security-first; invariantes testáveis por smoke comportamental)

- [ ] **SEG-01**: O acesso ao CV é vaga-scoped — a policy de leitura role-only do bucket `curriculos` é **removida** e substituída pela EF (única via RH); um smoke com JWT impersonado prova que o recrutador A não obtém o CV de um candidato da vaga de B.
- [ ] **SEG-02**: A agregação de KPIs é vaga-scoped por construção (scoping interno no RPC DEFINER) e o read role-only de `historico_candidatura` (`rh_le_historico`, diferido na P24 e nunca varrido) é endurecido para o predicado vaga-scoped WR-04 (defense-in-depth); smoke prova que o recrutador A não vê números da vaga de B.
- [ ] **SEG-03**: O agendamento respeita isolamento — o candidato lê apenas a própria linha (sem observações internas do RH) e o RH é vaga-scoped; smokes cross-candidato e cross-recrutador (incl. exclusão de `observacoes_rh` da projeção do candidato).

## Decisões de escopo em aberto (resolver no planejamento das fases)

- **Mecanismo de enforcement da justificativa de rejeição (OPER-02/04):** RPC `rejeitar_candidatura` DEFINER que RAISE em justificativa vazia **(default recomendado — não toca o trigger)** vs. estender o ramo terminal de `avancar_etapa()`. Decidir no plano da fase OPER (Phase 31).
- **Base de coorte da conversão (KPI-02, "K4"):** coorte fechada por janela de inscrição **(default recomendado — não subconta candidatos ainda em andamento)** vs. taxa bruta. Decidir no plano da fase KPI (Phase 34).
- **Schema exato de `agendamentos_entrevista` (AGEND):** reconciliar as propostas de ARCHITECTURE.md (`observacoes_rh`, `status`, `agendado_por`) e FEATURES.md (`entrevistador`, `compareceu`) numa única definição autoritativa no plano da fase AGEND (Phase 33).
- **`historico_candidatura` re-scope (SEG-02):** fazer o endurecimento direto do `rh_le_historico` **e** o DEFINER RPC (belt-and-suspenders, recomendado) vs. só o RPC (Phase 32).
- **RPCs legadas mortas:** confirmar que nenhum caminho do M6 referencia os overloads M1-era `avancar_etapa(uuid,uuid)` / `rejeitar_candidato(uuid,text,uuid)` (sem migration backing); flag opcional de remoção (Phase 31).

## v2 Requirements

Reconhecidos, deferidos — não neste roadmap.

### OPER (v2)

- **OPER-v2-01**: Ações em lote — avançar/rejeitar múltiplos candidatos de uma vez com trilha por candidato (risco de auditoria; v1 é individual apenas).

### AGEND (v2)

- **AGEND-v2-01**: Auto-scheduling pelo candidato (self-service, estilo Calendly) — depende da camada COMM.

### KPI (v2)

- **KPI-v2-01**: Source-of-hire por vaga — requer captura por-vaga (hoje `como_conheceu` é auto-reportado, não por-vaga).

## Out of Scope

Exclusões explícitas (anti-features da pesquisa incluídas com o motivo).

| Feature | Reason |
|---------|--------|
| COMM — pipeline de notificação por e-mail, convites de entrevista por e-mail, `.ics`-por-e-mail | COMM é um milestone futuro (M7+); o M6 usa o painel como único canal. `.ics` entra apenas como download client-side (AGEND-05), nunca por e-mail. |
| Self-scheduling do candidato (Calendly), sync bidirecional de calendário, MS Bookings OAuth, salas de vídeo hospedadas | Complexidade + dependência externa; MS Bookings já deferido a "Future". |
| Suite completa de relatórios + export CSV/PDF | M6 entrega KPIs on-screen apenas; export é milestone futuro. |
| Source-of-hire por vaga | Dado não coletado hoje (`como_conheceu` é auto-reportado, não por-vaga). |
| Banco de talentos / re-candidatura (TALENT) + flag "manter no banco de talentos" no reject | TALENT é M7+; a flag apontaria para uma feature não construída. |
| Ações em lote (avançar/rejeitar vários) | Risco de integridade de auditoria; v1 é individual apenas (ver OPER-v2-01). |
| Dropdown genérico de motivo de rejeição sem free-text | Anti-pattern de compliance (disposição de candidato indefensável em auditoria); usamos enum **+** justificativa livre ≥50 (OPER-02). |
| Editar/re-authored o trigger `avancar_etapa()` | Alto risco (near-miss P27 quase dropou o guard ENTREV-03); o M6 reusa o trigger verbatim e enforce justificativa na camada RPC/serviço. |
| Remoção do legado `RelatoriosRHPage` (agregação client-side M1) | Cleanup P2, não bloqueia launch; substituído pelo dashboard de KPIs mas a remoção é opcional. |

## Traceability

Cada REQ-ID mapeia para exatamente 1 fase. Coverage validada 19/19 (0 unmapped) na criação do roadmap (2026-07-14).

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPER-01 | Phase 31 | Complete |
| OPER-02 | Phase 31 | Complete |
| OPER-03 | Phase 31 | Complete |
| OPER-04 | Phase 31 | Complete |
| AGEND-01 | Phase 33 | Pending |
| AGEND-02 | Phase 34 | Complete |
| AGEND-03 | Phase 34 | Complete |
| AGEND-04 | Phase 35 | Pending |
| AGEND-05 | Phase 35 | Pending |
| VISRH-01 | Phase 34 | Complete |
| VISRH-02 | Phase 34 | Complete |
| VISRH-03 | Phase 34 | Complete |
| KPI-01 | Phase 34 | Complete |
| KPI-02 | Phase 34 | Pending |
| KPI-03 | Phase 34 | Complete |
| KPI-04 | Phase 34 | Pending |
| SEG-01 | Phase 32 | Pending |
| SEG-02 | Phase 32 | Pending |
| SEG-03 | Phase 33 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19 ✓
- Unmapped: 0 ✓

**Por fase:**
- **Phase 31** (Avançar/Rejeitar em Todo o Funil + Reject-do-Comparativo): OPER-01, OPER-02, OPER-03, OPER-04 (4)
- **Phase 32** (Fechar os Dois Vazamentos Vivos — BLOCKING): SEG-01, SEG-02 (2)
- **Phase 33** (Camada de Dados do Agendamento): AGEND-01, SEG-03 (2)
- **Phase 34** (Superfícies do RH — CV/IA, Agendamento, Fila + KPIs): VISRH-01, VISRH-02, VISRH-03, KPI-01, KPI-02, KPI-03, KPI-04, AGEND-02, AGEND-03 (9)
- **Phase 35** (Painel do Candidato — Leitura do Agendamento): AGEND-04, AGEND-05 (2)

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 — Traceability preenchida na criação do roadmap (19/19 mapeados, 0 unmapped). Ordem de execução: 31 → 32 → 33 → 34 → 35.*
