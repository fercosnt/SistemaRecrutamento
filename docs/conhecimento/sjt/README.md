# SJT / Work Sample — Knowledge Base

Materiais para construir e a IA avaliar Work Sample/SJT customizados por cargo no funil M2 (Etapa 3 — Avaliação Assíncrona).

## Conteúdo atual

- **`PESQUISA-sjt-odontologia-beauty-smile.md`** — deep research com modelos + exemplos + boas práticas + BARS templates
- **`fontes/sjt-plataformas-comerciais-exemplos-publicos.md`** — exemplos de TestGorilla/Vervoe/Canditech aproveitáveis

## Bancos criados ✅ (2026-06-05 — ver `../../prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md`)

> **Taxonomia reescrita** a partir dos formulários reais (`../perguntas-vagas.md`): cargos reais Beauty Smile, não os genéricos da PESQUISA. "Higienista" → ASB/TSB; coordenador/admin genéricos aposentados; +Consultor, +SDR, +Assistente Financeiro.

- [x] `banco-sjt-dentista.md` — 3 MC (CFO: odontofobia, estético sem indicação, erro de colega) + case aberto "Mariana" (estético/reabilitação)
- [x] `banco-sjt-recepcao.md` — 5 MC (urgência, LGPD, cobrança, overbooking, WhatsApp acumulado)
- [x] `banco-sjt-consultor-vendas.md` — 3 MC (meta×indicação, objeção de preço, expectativa) + case "Renata"
- [x] `banco-sjt-sdr-social-seller.md` — 3 MC (follow-up, qualificação honesta, reclamação pública) + work-sample WhatsApp
- [x] `banco-sjt-assistente-financeiro.md` — 3 MC (conciliação, sigilo, boleto) + in-basket curto
- [x] `banco-sjt-asb-tsb.md` — 2 MC compartilhado (biossegurança + equipe chairside)
- [x] `banco-sjt-vaga-generica.md` — 3 MC nos 4 valores (Atitude de Dono, UAU, Sede de Crescimento)
- [x] `bars-rubrics-por-dimensao.md` — 10 dimensões clínicas (CFO/DCN) + templates BARS reutilizáveis (comunicação, ética comercial, priorização, raciocínio clínico, acolhimento) + anti-bias

**Escala graduada 4/2/1/0** (fortemente_pontua=4 · pontua=2 · neutro=1 · atencao=0+flag). **Storage Híbrido git→DB.**

- [x] `protocolo-calibracao-sme.md` — protocolo de calibração SME (3 camadas: face-validity de painel → known-groups com o time → preditiva; SMEs por cargo; guardrail anti-oversell pro comercial; workflow git-PR + log de calibração)

## Decisões locked

- **Formato:**
  - Recepção/Higienista: 100% múltipla escolha (scoring via tags+pesos automático)
  - Coordenador/Dentista: híbrido (múltipla escolha + 1 case aberto avaliado por IA com BARS)
- **Tempo:** 15-30min por cargo (cabe no bloco de 60min total da Etapa 3)
- **Avaliação:** múltipla escolha = soma automática dos pesos das tags; case aberto = IA com BARS + revisão humana
- **Eliminatório com revisão humana** (não auto-rejeita)
