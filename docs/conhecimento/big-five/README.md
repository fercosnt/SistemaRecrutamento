# Big Five (IPIP-NEO-120 PT-BR) — Knowledge Base

Materiais para a IA avaliar Big Five no funil M2 (Etapa 3 — Avaliação Assíncrona) e gerar **devolutiva textual COM pontuação** ao candidato.

## Conteúdo atual

### Pesquisa consolidada
- **`PESQUISA-big-five-ipip-neo-120-ptbr.md`** — deep research que confirma instrumento + scoring + posicionamento legal + plan B

### Fontes (`fontes/`)
- **`ipip-neo-120-questions-pt-br.json`** ⭐ — **item bank PT-BR pronto** (120 perguntas validadas, formato JSON estruturado)
- **`ipip-neo-120-questions-en.json`** — versão original em inglês (referência)
- **`Andrade-2008-IGFP-5-tese-UnB.pdf`** — tese da validação brasileira do IGFP-5 (Big Five reduzido)
- **`Pires-2023-BFI-2-validacao-PT-BR.pdf`** — validação BFI-2 PT-BR (alternativa moderna validada)
- **`Roiz-2023-BFI-25-PT-BR.pdf`** — BFI-25 PT-BR (versão curta, ~10min)
- **`Laros-2018-escalas-reduzidas-Big-Five.pdf`** — comparação de escalas reduzidas
- **`CFP-Resolucao-31-2022-testes-psicologicos.pdf`** — regulação CFP/SATEPSI (define o que é "teste psicológico")
- **`CFP-NotaTecnica-SATEPSI-DISC-PAT-PI.pdf`** — nota técnica CFP sobre DISC/PAT/PI

## A criar / depositar

### Materiais do Fernando (PRIORIDADE — você vai depositar)
- [ ] **`materiais-fernando/curso-notebooklm.md`** — extração do curso Big Five no NotebookLM
  - Link do notebook: https://notebooklm.google.com/notebook/1bdaf389-9e7c-498b-81a6-e7aae7506ca5
- [ ] **`materiais-fernando/teste-validado-fernando.md`** — perguntas + resultado validado do teste que você fez
- [ ] **`materiais-fernando/resumo-resultados-bigfive.md`** — material de resumo de resultados

### Templates derivados (a criar pós-validação dos materiais acima)
- [ ] **`templates-devolutiva.md`** — texto pronto por dimensão (alta/média/baixa em cada um dos 5 OCEAN) + 30 facetas
- [ ] **`interpretacao-resultados.md`** — guia interpretativo pra IA contextualizar scores
- [ ] **`scoring-algorithm.md`** — algoritmo de scoring documentado (reverse-coded items + normalização)

## Decisões locked

- **Instrumento default:** IPIP-NEO-120 PT-BR (item bank JSON em `fontes/`)
- **Plan B:** BFI-2 PT-BR (60 itens, validação Pires 2023) se IPIP-NEO mostrar problema
- **Aplicação:** auto-aplicada online pelo candidato — Big Five tratado como "questionário de perfil comportamental" (não "teste psicológico"), fora do escopo CFP/SATEPSI conforme estratégia legal a confirmar via §13 do PRD-bigfive-revisado
- **Papel no funil:** **CONTEXTUAL, não eliminatório** (mostra perfil pro gestor; não filtra candidato)
- **Devolutiva:** **textual COM pontuação** enviada por email após Etapa 3 — gerada por IA usando este knowledge base

## Como será consumido

```
Edge Function avaliar-bigfive-devolutiva:
  Input:
    - scores_candidato (5 dimensões OCEAN, 0-100 percentil)
    - candidato_nome
  Context loaded:
    - PESQUISA-big-five-ipip-neo-120-ptbr.md (fundamentos científicos)
    - templates-devolutiva.md (templates por dimensão)
    - interpretacao-resultados.md (calibração)
    - prompts/templates/06-culture-fit-essay.md (estrutura do prompt — pode adaptar)
  Output (Zod-validated):
    - texto_devolutiva (markdown, ~400 palavras)
    - pontuacoes_por_dimensao (5x {dimensao, score, nivel: alto/médio/baixo})
    - destaques (top 2 forças + top 2 áreas de desenvolvimento)
```

## Próximos passos

1. **Você deposita os 3 materiais** em `materiais-fernando/`
2. Eu **leio + sintetizo** templates derivados
3. Eu **escrevo PRD-bigfive-revisado.md** em `docs/prds/m2-funil-rh/`
4. Quando M2 começar, Edge Function consome tudo
