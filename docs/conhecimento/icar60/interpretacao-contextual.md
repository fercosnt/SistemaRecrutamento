# Interpretação Contextual — Templates para o Gestor

> Suporte de implementação para [`PRD-cognitivo-raciocinio.md`](../../prds/m2-funil-rh/PRD-cognitivo-raciocinio.md) RF-26d/RF-26g.
> **Regra-mãe:** o resultado é **CONTEXTUAL, nunca filtro**. Linguagem 100% não-psicológica (RNF-12) — proibido "QI", "inteligência", "cognição", "aptidão", "teste psicológico".

## 1. O que o gestor vê (painel + comparativo Etapa 6)

```
┌─ Raciocínio lógico ──────────────────────────────┐
│  ▓▓▓▓▓░  Acima da média dos candidatos           │
│  🛈 Contextual — use como informação adicional,   │
│     não como filtro. Não rejeite por este sinal   │
│     isoladamente.                                 │
│  Seções: padrões visuais (matriz) · sequências    │
│          lógicas (letra-número)                   │
└──────────────────────────────────────────────────┘
```

- **Banda + badge contextual**, sempre juntos. Sem número, sem percentil, sem barra de "0–60".
- Badge `🛈 Contextual` é obrigatório (RF-26d) e não removível pela UI.

## 2. Texto interpretativo por banda (template estático, sem IA em V1)

Foco em **descrição de comportamento de raciocínio + sugestão de verificação na entrevista** — nunca rótulo de pessoa.

| Banda | Texto para o gestor |
|-------|---------------------|
| `bem_acima` | "Resolveu padrões novos e sequências lógicas com folga acima do grupo. Pode lidar bem com situações inéditas e procedimentos complexos. *Na entrevista, explore como aplica esse raciocínio no dia a dia da clínica.*" |
| `acima` | "Lidou bem com padrões e sequências, acima da média do grupo. *Confirme na entrevista a aplicação prática (resolver imprevistos, aprender protocolos novos).*" |
| `na_media` | "Desempenho em linha com a média dos candidatos. Sinal neutro — **decida pelo conjunto** (entrevista, redação, SJT, experiência)." |
| `abaixo` | "Abaixo da média do grupo nesta tarefa específica de padrões/sequências. **Não é veto** — pessoas com este resultado podem ter excelente desempenho prático. *Pondere com experiência real e referências; este sinal isolado não decide.*" |
| `bem_abaixo` | "Bem abaixo da média nesta tarefa. **Atenção ao contexto:** ansiedade de prova, baixa familiaridade com testes online ou escolaridade influenciam fortemente este resultado. **Proibido rejeitar só por isto** (RF-27) — exige justificativa expandida e outras evidências." |

## 3. Devolutiva ao candidato (RF-26g — Could, opcional V1)

Se ativada: narrativa qualitativa **sem número**, não-ansiogênica, sem comparação entre candidatos. Proibido diagnóstico. Exemplo (banda `na_media`): *"Você completou o exercício de raciocínio lógico. Seu desempenho ficou em linha com o conjunto de candidatos. Este é só um dos vários sinais considerados no processo."*

## 4. No comparativo (Etapa 6) — não virar critério único

- A coluna "Raciocínio" mostra a banda + badge contextual.
- **Não** ordena o ranking sozinha; **não** entra com peso fixo no score consolidado como eliminatório.
- Se o gestor tentar rejeitar citando o cognitivo → `consolidar-decisao-final` dispara a justificativa expandida (RF-27) e grava em `bias_audit_log`.

## 5. Strings proibidas (grep de CI — RNF-12)
`teste psicológico`, `QI`, `quociente`, `inteligência`, `cognição`, `aptidão`, `superdotad`, `deficiente`, `percentil` (no contexto de resultado exibido).
