# Bias Mitigation — Prova de Raciocínio Lógico

> Suporte de implementação para [`PRD-cognitivo-raciocinio.md`](../../prds/m2-funil-rh/PRD-cognitivo-raciocinio.md) RF-26f/RF-27 + guardrails §2.3.
> **Premissa:** mesmo itens não-verbais reproduzem desigualdade estrutural (no Brasil, escolaridade é proxy de raça/classe — [PESQUISA §4.4]: brancos de escola privada tiram 21% a mais no ENEM). Score de raciocínio **pode mascarar discriminação** → auditoria obrigatória.

## 1. Camadas de mitigação (defesa em profundidade)

| # | Camada | Como |
|---|--------|------|
| 1 | **Só não-verbal** | Matriz + letra-número (menor d que verbal) — verbal/3D fora do escopo |
| 2 | **Papel contextual** | Nunca eliminatório (RNF-07a) — o score não dispara decisão automatizada adversa |
| 3 | **Banding largo** | Banda qualitativa de 5 faixas em vez de cut score rígido — mitigador comprovado [PESQUISA §3.4] |
| 4 | **RF-27 override** | Rejeição que cite o cognitivo isolado exige justificativa expandida + log |
| 5 | **Auditoria 4/5 trimestral** | Regra dos 4/5 (EEOC) adaptada à Lei 9.029 BR |
| 6 | **Flag demográfico** | Toda rejeição que cite o cognitivo grava demografia em `bias_audit_log` |

## 2. Auditoria de adverse impact (regra 4/5 adaptada)

> O Brasil não tem "4/5ths rule" normativa [PESQUISA §4.3], mas Lei 9.029/95 + Súmula 443 TST (inverte ônus da prova) tornam a auditoria proativa a melhor defesa.

**Cálculo trimestral** (por gênero, raça/cor autodeclarada, faixa de escolaridade):

```
selection_rate(grupo) = aprovados_para_proxima_etapa(grupo) / avaliados(grupo)
impact_ratio = selection_rate(grupo_minoritário) / selection_rate(grupo_majoritário)
```

- **impact_ratio ≥ 0,80** → OK.
- **impact_ratio < 0,80** → violação → ação:
  1. Marcar o uso do cognitivo na vaga como `quarentena=true` (revisar antes de seguir usando).
  2. Revisar itens com DIF (Differential Item Functioning) elevado — candidatos a remoção.
  3. Alargar o banding ou reduzir o peso contextual.
  4. Documentar no RIPD + relatório ao DPO.

> Como o papel é contextual, o "selection_rate" relevante é o do **funil inteiro** condicionado a quem passou pelo cognitivo — não o do cognitivo isolado (que não filtra). Cruzar `scores_candidato (tipo=raciocinio_logico)` × `decisao_final`.

## 3. `bias_audit_log` — o que gravar

Reusa a tabela existente do Master (§3.1 LGPD). Para o cognitivo, cada rejeição que cite o sinal grava:
`{ candidatura_id, banda, motivo_textual, citou_cognitivo: bool, justificativa_expandida, demografia: {genero, raca_cor, escolaridade}, timestamp, por_usuario }`.

## 4. DIF — itens a vigiar (v2)
Quando houver N≥200, rodar análise de DIF por grupo (Mantel-Haenszel ou logistic regression). Itens com DIF consistente entram em revisão/remoção. Itens de matriz tendem a ter menor DIF que letra-número.

## 5. Checklist mínimo antes do go-live
- [ ] Auditoria 4/5 implementada e agendada (trimestral).
- [ ] `bias_audit_log` recebe rows do fluxo de rejeição que cita cognitivo.
- [ ] RF-27 (justificativa expandida) testado e2e.
- [ ] Grep de CI por strings proibidas (RNF-12) = 0.
- [ ] Banding largo configurado (não cut score rígido).
- [ ] Disclaimer contextual não-removível no painel e no comparativo.
