# Fit Cultural (Redação) — Knowledge Base

Materiais para a IA avaliar redação fit cultural Beauty Smile no funil M2 (Etapa 3 — Avaliação Assíncrona).

**Status:** ✅ Completo v1.1 — 2026-05-12. Todos os 4 arquivos prontos para uso pela Edge Function `avaliar-redacao`.

## Estratégia: reaproveitar materiais existentes

Diferente das outras pastas, fit-cultural **não recebeu deep research nova** — o material base já existe em `docs/prds/`:

- `../prds/CULTURA-BEAUTY-SMILE-INPUT.md` (383 linhas) — valores + manifesto + linguagem da Beauty Smile (cópia local: `Cultura-Beauty-Smile-Para-Recrutamento.md`)
- `../prds/fit-cultural-banco-itens-v1.md` (839 linhas) — banco de itens SJT (referência de cenários, não instrumento principal)
- `../prds/fit-cultural-prd.md` (DEPRECATED — ver `../prds/m2-funil-rh/PRD-redacao-fit-cultural.md` v1.1)

## Arquivos consolidados nesta pasta (v1.1)

| Arquivo | Conteúdo | Versão |
|---------|----------|--------|
| ✅ [`valores-beauty-smile-resumo.md`](./valores-beauty-smile-resumo.md) | 4 valores oficiais + Ética + sinais positivos/negativos/red flags por valor + pesos por cargo (referência V2 — V1 usa pesos iguais) | v1.1 |
| ✅ [`pergunta-padrao-redacao.md`](./pergunta-padrao-redacao.md) | Q1 padrão BS (Opção B — cuidar de pessoa em fragilidade) + 12 templates customizáveis 3-por-cargo com defaults ON/OFF + diretrizes V2 ad-hoc | v1.1 |
| ✅ [`bars-redacao-4-dimensoes.md`](./bars-redacao-4-dimensoes.md) | BARS 4D × 5 níveis com âncoras + pesos iguais 25% V1 + 3 caps especiais (red_flag_etico cap 30, D1≤2 cap 50, insufficient_evidence) + sistema 3 cores | v1.1 |
| ✅ [`exemplos-respostas-bars.md`](./exemplos-respostas-bars.md) | 3 redações exemplo completas (Nível 1 Camila / Nível 3 Rodrigo / Nível 5 Mariana) com scoring justificado por dimensão — **inline no system prompt** com `cache_control` | v1.1 |
| ✅ [`Cultura-Beauty-Smile-Para-Recrutamento.md`](./Cultura-Beauty-Smile-Para-Recrutamento.md) | Cópia local do CULTURA-BEAUTY-SMILE-INPUT (40.547 chars) | original |

## Como será consumido

```
Edge Function avaliar-redacao:
  Input:
    - texto_redacao (200-500 palavras hard min/max)
    - pergunta_id
    - template_cargo da vaga
  Context loaded (filesystem read em cold start, cache em memória):
    - valores-beauty-smile-resumo.md
    - bars-redacao-4-dimensoes.md
    - exemplos-respostas-bars.md  ← 3 exemplos few-shot inline cacheado
    - prompts/templates/06-culture-fit-essay-v1.0.md
  Output (Zod-validated EssayScoringV1):
    - dimension_scores: [4x {dimension D1-D4, cited_evidence, reasoning, score 1-5, level}]
    - overall_score: 0-100
    - red_flag_etico: boolean
    - bias_audit: {formality, regional, grammar checks}
    - recommendation: strong_fit / good_fit / neutral / weak_fit / misfit
  Computed server-side:
    - score_geral = (D1+D2+D3+D4)/4 × 20  (pesos iguais V1)
    - 3 caps aplicados: red_flag_etico→30, D1≤2→50, insufficient_evidence
    - classificacao_cor: verde ≥65 / amarelo 41-64 / vermelho ≤40 OR red_flag OR D1≤2
    - flags[] incluindo anti-plágio intercandidato (hash sha256)
```

## Decisões locked (sessão Onda 1-5 — 2026-05-12)

- **Formato:** redação 200-500 palavras (hard min/max, sem soft) + 1 pergunta padrão BS + 1-2 customizadas por template de cargo
- **Avaliação:** IA com BARS 4D (pesos iguais 25% V1) + revisão humana (eliminatório com revisão humana sempre obrigatória)
- **Detecção ChatGPT:** NÃO tentar — solução é follow-up na entrevista online (Etapa 4)
- **Devolutiva ao candidato:** SEM devolutiva (eliminatório expõe critério)
- **Few-shot:** 3 exemplos calibrados inline no prompt (cacheado) — Nível 1 Camila / Nível 3 Rodrigo / Nível 5 Mariana
- **Anti-plágio:** hash sha256 do texto normalizado, V1 só flag (sem bloqueio automático)
- **UI gestor:** 1 redação por vez V1 (comparativo lado-a-lado V2)
- **Sistema 3 cores:** verde ≥65 / amarelo 41-64 / vermelho ≤40 OR red_flag_etico OR D1≤2
- **3 caps especiais:** red_flag_etico→cap 30 + revisão obrigatória; D1≤2→cap 50; insufficient_evidence apenas para redação inválida

## Próximas revisões

- **V1.2** pós-piloto interno (50 redações): adicionar exemplos Nível 2 e 4 se κ < 0,60 em alguma dimensão
- **V2.0**: diversificar exemplos demográfica/regionalmente; ativar pesos por cargo modulando D4 se calibração V1 indicar; abrir ad-hoc questions RH
