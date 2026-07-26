# Phase 39: Rewire dos Triggers & Aposentadoria do n8n (SEC-03) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 39-rewire-dos-triggers-aposentadoria-do-n8n-sec-03
**Areas discussed:** Avanço (quais transições notificam), Knockout (auto-reprovado recebe e-mail?), E-mail de decisão (único vs distinto)

> **Nota de método:** a maioria das "gray areas" técnicas desta fase foi resolvida por **inspeção
> empírica de PROD** (topologia de triggers viva, corpo do `avancar_etapa()`, `registrar_decisao()`,
> contrato de eventos da EF P38), não por pergunta ao usuário. Só as 3 decisões genuinamente de
> **produto** abaixo foram levadas ao Fernando.

---

## Avanço — quais transições disparam o e-mail `avanco`

| Option | Description | Selected |
|--------|-------------|----------|
| Só avaliação assíncrona | E-mail só ao entrar em `avaliacao_assincrona` (CTA da avaliação); casa com COMM-03 | ✓ |
| Todo avanço para frente | Notifica em cada avanço (triagem, avaliação, entrevistas, decisão) | |
| Avaliação + triagem | Notifica em triagem E avaliação assíncrona | |

**User's choice:** Só avaliação assíncrona
**Notes:** Triagem e decisão-final são estados internos do RH; entrevistas têm o e-mail de convite próprio. → D-01.

---

## Knockout — candidato auto-reprovado no cadastro recebe e-mail?

| Option | Description | Selected |
|--------|-------------|----------|
| Não recebe nada | Confirmação suprimida (survivor-guard) E decisão suprimida (`auto_rejeitado=false`); alinha RNF-07a/D-15 | ✓ |
| Recebe decisão neutra | Recebe o e-mail neutro de decisão mesmo sendo knockout | |

**User's choice:** Não recebe nada
**Notes:** Knockout é filtro automático; o e-mail de decisão fica só para decisões registradas por humano. → D-05.

---

## E-mail de decisão — único e neutro vs aprovação distinta

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, único e neutro | Um só e-mail neutro para aprovado e rejeitado; veredito só no painel; já é o que a P38 construiu | ✓ |
| Quero aprovação distinta | Aprovado recebe e-mail próprio (reabre a P38 com 5º template) | |

**User's choice:** Sim, único e neutro
**Notes:** Zero re-trabalho na P38; D-15 por construção. E-mail de aprovação distinto → deferido a P38-v2/backlog. → D-06.

---

## Claude's Discretion

- Nomes dos 3 triggers/funções novos, estrutura do `CASE`, e como o survivor-guard lê `auto_rejeitado`.

## Deferred Ideas

- E-mail de aprovação comemorativo distinto → P38-v2/backlog (reabriria a P38).
- 4 todos revisados e não-dobrados (25-review-deferred, 36-resend-chave-divergencia, cc0-cognitive-item-bank-sourcing, processo-origem-do-drift-desconhecida) — nenhum é escopo de rewire de triggers.
