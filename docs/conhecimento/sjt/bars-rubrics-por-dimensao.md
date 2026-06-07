---
tipo: bars-rubrics
versao: v1.0
status: active
language: pt-BR
uso: "Templates BARS reutilizáveis consumidos pela Edge Function avaliar-redacao / template 07-work-sample-sjt para scoring de cases abertos, work-samples e in-baskets do SJT. Inclui as 10 dimensões clínicas (CFO/DCN) + os rubrics dos cases por cargo."
fonte_base: "PESQUISA-sjt-odontologia-beauty-smile.md §4-§5 (dimensões clínicas) + rubrics criados por cargo Beauty Smile"
---

# BARS Rubrics por Dimensão

> Escala única **1-5** com âncoras comportamentais. Para o scoring de cases abertos, cada dimensão é convertida em **inclusion/exclusion criteria por nível** (paper SJT 2025 / arXiv 2507.13881, +0.08–0.21 kappa) e consumida pelo template `07-work-sample-sjt`. Os cases abertos por cargo (Mariana, Renata, WhatsApp, in-basket) têm rubrics próprios nos respectivos `banco-sjt-*.md`; este arquivo consolida os **templates reutilizáveis** e o **catálogo de 10 dimensões clínicas**.

---

## Parte A — Catálogo de 10 dimensões clínicas (âncora oficial BR)

Cada dimensão tem âncora CFO/DCN — defensável em auditoria/audiência. Usadas nos SJTs clínicos (dentista, ASB/TSB).

| # | Dimensão | Âncora primária BR | Cargos críticos |
|---|----------|--------------------|-----------------|
| D1 | Ética e Integridade Profissional | CFO Art. 9 + Art. 11 | Todos |
| D2 | Comunicação com o Paciente | CFO Art. 11-IV/XII; DCN III | Dentista, TSB, Recepção |
| D3 | Consentimento Informado | CFO Art. 11-X | Dentista, TSB |
| D4 | Resposta a Urgências/Emergências | CFO Art. 11-VII | Dentista, Recepção |
| D5 | Trabalho em Equipe Interprofissional | CFO Art. 12; ABENO 2022 | Todos |
| D6 | Humanização e Dignidade | CFO Art. 9-VII / 11-VIII | Todos |
| D7 | Sigilo e Privacidade (LGPD) | CFO Art. 5-II / 9-VIII; LGPD | Recepção, Admin, Todos |
| D8 | Proteção de Vulneráveis (ECA/Idoso) | ECA + CFO Lei Maria da Penha | Dentista, TSB |
| D9 | Reconhecimento de Limites / Educação Permanente | CFO Art. 9-VI; DCN VI | Todos |
| D10 | Decisão Baseada em Evidências | DCN II | Dentista, Consultor |

### Exemplo de âncoras 1-5 (D1 — Ética e Integridade)

| Score | Âncora comportamental |
|---|---|
| 5 — Modelar | Identifica conflito de interesse proativamente, comunica ao paciente, documenta, busca segunda opinião quando apropriado. |
| 4 — Sólido | Reconhece o dilema, age conforme CEO mesmo sob pressão financeira/produtiva. Documenta. |
| 3 — Aceitável | Age corretamente em situações claras; hesita/consulta em zonas cinzentas. |
| 2 — Abaixo | Prioriza conveniência operacional ou pressão da liderança sobre o interesse do paciente. |
| 1 — Inaceitável | Pratica/tolera condutas vedadas (CFO Art. 11): tratamento desnecessário, omissão de riscos, conivência com erro. |

> As âncoras 1-5 das demais dimensões (D2-D10) estão na PESQUISA §5 e devem ser portadas para este arquivo conforme cada uma for usada num case. Para o MVP, os cases por cargo já carregam inclusion/exclusion específicos.

---

## Parte B — Templates reutilizáveis de rubric para cases abertos

Padrão de cada dimensão de rubric (formato consumido pelo template `07-work-sample-sjt`):

```yaml
dimensao: "<nome>"
peso: <0..1>          # soma dos pesos do case = 1.0
niveis:
  "5": { inclusion: ["...", "..."], exclusion: ["...", "..."] }
  "4": { inclusion: [...], exclusion: [...] }
  "3": { inclusion: [...], exclusion: [...] }
  "2": { inclusion: [...], exclusion: [...] }
  "1": { inclusion: [...], exclusion: [...] }
red_flag_forca_reject: true|false
```

Regra de scoring (igual ao template 07): Score 5 = todos inclusion + nenhum exclusion; 4 = maioria inclusion + nenhum exclusion crítico; 3 = ~metade + 1 exclusion menor; 2 = poucos inclusion + 2+ exclusion; 1 = inclusion ausente OU 1+ exclusion crítico. `insufficient_evidence` se a resposta não aborda a dimensão.

### Template B1 — Comunicação / Expectativa (reuso: Mariana, Renata, WhatsApp)
- **Score 5 inclusion:** alinha expectativa à realidade; usa recurso de apoio (mock-up/registro); honestidade financeira/de prazo.
- **Score 5 exclusion:** promessa de resultado irreal; uso de gatilho emocional (casamento/formatura) como pressão de venda.

### Template B2 — Honestidade / Ética comercial (reuso: Renata, SDR work-sample, CV-*)
- **Score 5 inclusion:** respeita a sequência clínica antes da estética; não promete o que não entrega; transparência de preço.
- **Score 5 exclusion:** promete prazo/resultado ignorando indicação clínica; desqualifica concorrente; oversell.

### Template B3 — Priorização / In-basket (reuso: Assistente Financeiro)
- **Score 5 inclusion:** classifica por urgência×importância; identifica o item de maior risco operacional/legal como #1; delega/escala o delegável.
- **Score 5 exclusion:** trata tudo como igual; começa pelo menos urgente; decide o que deveria escalar.

### Template B4 — Raciocínio clínico-estético (reuso: Mariana, cases clínicos)
- **Score 5 inclusion:** identifica condições subjacentes a tratar antes da estética; opções minimamente invasivas; integra evidência.
- **Score 5 exclusion:** parte pra intervenção estética ignorando condições de base; desgaste agressivo sem indicação.

### Template B5 — Acolhimento / Empatia (reuso: WhatsApp, atendimento)
- **Score 5 inclusion:** reconhece a dimensão emocional; tom humano; descoberta antes de orçar.
- **Score 5 exclusion:** vai direto ao comercial; texto robótico/copy-paste; ignora o emocional.

---

## Parte C — Anti-bias (obrigatório em todo scoring de case)

Herdado do template `07-work-sample-sjt` e do guia LGPD:
- Avaliar **exclusivamente**: precisão técnica, raciocínio, segurança, conformidade ética/legal.
- **Ignorar**: estilo de escrita, vocabulário regional, formalidade, sofisticação lexical, erros leves de português.
- `bias_audit.used_inclusion_exclusion_criteria = true` e `no_demographic_proxies_used = true` obrigatórios no output.
- Red flag ético/legal/segurança força `recommendation: reject` — mas a **decisão final é sempre humana** (RNF-07a).
