---
milestone: M5 (draft — não aberto)
name: Operação & Comunicação
date: 2026-07-05
status: ESBOÇO — deriva da avaliação de produto; formalizar via /gsd-new-milestone após M4
source: .planning/M4-PRODUCT-EVALUATION.md (net-new que o M4 não cobre)
---

# M5 (esboço) — Operação & Comunicação

> **Missão:** construir a *esteira* que liga as estações de avaliação — a tese central da avaliação de produto. O M4 blinda e corrige o que existe; o M5 adiciona o que falta para o funil **andar sozinho** e o candidato **não sumir na espera**. Feature-work, não hardening. Só faz sentido depois do M4-B/A/C.

## Grupos de capacidade (net-new)

### COMM — Comunicação transacional *(a dor original do PRD)*
- **Pipeline de notificação ao candidato** (EF `notificar-candidato` via Resend/SMTP, disparada por trigger em `historico_candidatura` com pg_net): avanço p/ avaliação · convite de entrevista · decisão/rejeição ≤24h. Tabela `notificacoes_enviadas` p/ auditoria. **Aposenta o n8n pessoal** (substitui, não patcheia, o A11 técnico). Destrava RNF-SLA-03/05/06 do PRD.
- **Estimativa de prazo + timeline** em cada estado de espera do candidato (dashboard).

### OPER — Operação do funil pelo RH
- **Avançar/rejeitar etapa individual** em todo o funil (hoje só existe na etapa 5) — com trilha auditável, respeitando RNF-07a.
- **Agendamento de entrevista** dentro do sistema (hoje o RH sai pra WhatsApp/Gmail).
- **CV + análise da IA visíveis** no hub do candidato (o RH não consegue ver o currículo hoje).
- **Dashboard/lista como fila de trabalho real** (não o modelo M1 morto) + **relatórios M2 + KPIs oficiais** sobre `historico_candidatura` (os dados já estão gravados — é o argumento de existência perante o sponsor).
- **Pós-aprovação/onboarding** do candidato aprovado.

### TALENT — Aproveitamento
- **Banco de talentos + re-candidatura** (maior ROI ausente segundo a lente estratégica).

### LGPD-OPS — Compliance operacional
- **Retenção/exclusão de dados** (passivo que cresce a cada candidatura — agendar ANTES de qualquer campanha de volume).
- **Fila de revisão por pessoa natural** (LGPD Art. 20) do lado RH.

### PSICO — Substância psicométrica *(rigor de método, não só de processo)*
- **Banco SJT ≥6-8 itens/cargo + Camada-1 SME + opções balanceadas** (condição p/ o peso 25-35% ser honesto; até lá, rebaixar o peso via config — esforço S).
- **Normas reais** (Johnson/IPIP) no lugar da norma sintética do Big Five; **rubricas BARS fixas**; **seed CC0 do cognitivo** (com o fix do gabarito C1 ANTES); **auditoria de viés por etapa** (não só idade).

### FEATURE-DEBT — herdado do M4 (diferido)
- **A14** gestão de usuários RH real (hoje 100% mock) · **A37** página de perfil RH real (stubs). No M4 são *gateados/ocultados*; no M5 viram implementação real.

## Apostas estratégicas (da síntese)

### Apostas estratégicas (esforço L, alto valor)

1. **Pipeline de comunicação transacional (A1-fase2)** — a dor original do PRD; destrava SLAs 03/05/06, agendamento (B7), retenção LGPD (D3) e banco de talentos (D5), e aposenta o n8n pessoal. É a fundação de metade do plano — priorizar como primeira aposta.
2. **Caminho de escrita completo de vagas (B1)** — sem ele o produto não opera sem SQL; casa 1:1 com A13/A29 do M4-C, fazer na mesma fase.
3. **SJT: banco ≥6-8 itens/cargo + Camada 1 SME + opções balanceadas (C4)** — condição para o peso 25-35% ser honesto; enquanto não sai, rebaixar o peso (config, esforço S).
4. **Relatórios M2 sobre `historico_candidatura` + KPIs oficiais (D1+F1)** — o argumento de existência do build perante o sponsor; os dados já estão gravados.
5. **Banco de talentos + re-candidatura (D5)** — maior ROI ausente; naturalmente M5, depois do pipeline de comunicação e do fix M12.
6. **LGPD retenção/exclusão (D3)** — passivo que cresce com cada candidatura; agendar antes de qualquer campanha de volume.

## Contexto

**O que este plano adiciona que nenhum achado técnico cobre** (candidatos a um M5 de "Operação & Comunicação" ou a fases extra no próprio M4): pipeline de notificações (A1), agendamento de entrevista (B7), fila de revisão LGPD (B3b), CV/análise visível ao RH (B5), relatórios M2 + KPIs (D1/F1), pós-aprovação (D4), banco de talentos (D5), retenção/exclusão LGPD (D3), e toda a agenda psicométrica substantiva (C3, C4, C6, C7, C8 — normas, calibração SME, BARS fixas, bias por etapa). A recomendação de sequência global: **M4-B → M4-A → M4-C+Onda 2 de produto → Onda 3 (comunicação) → M4-D/E em paralelo → M5 (método, medição e completude)** — com os 12 quick wins rodando como varredura imediata, antes ou junto da primeira fase.

---
*Detalhe tela-a-tela da jornada do candidato: `.planning/M4-CANDIDATE-JOURNEY.md` (gerado em paralelo).*