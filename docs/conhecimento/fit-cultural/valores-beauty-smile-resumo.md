# Valores Beauty Smile — Resumo para RAG da Avaliação de Redação

**Uso:** consumido pela Edge Function `avaliar-redacao` como contexto de alinhamento para Dim 4 (Alinhamento com valores).
**Fonte canônica:** [`Cultura-Beauty-Smile-Para-Recrutamento.md`](./Cultura-Beauty-Smile-Para-Recrutamento.md) (cópia do `docs/prds/CULTURA-BEAUTY-SMILE-INPUT.md`).
**Versão:** 1.1 — 2026-05-12 (refinada com nota de pesos V1).

> **Mudança v1.0 → v1.1**: pesos por cargo passam a ser **referência V2** (não usados em V1). V1 aplica pesos iguais 25% por dimensão na fórmula de score (decisão de [`bars-redacao-4-dimensoes.md`](./bars-redacao-4-dimensoes.md)). Calibração V2 com Cohen's κ dirá se pesos variáveis por cargo melhoram acurácia.

---

## Princípio fundante: Ética acima dos 4 valores

> "Valores acima de qualquer pessoa — inclusive dos fundadores." — Manual de Cultura Beauty Smile

Ética é **inegociável** e **acima** dos 4 valores declarados. Nenhum dos 4 justifica violação ética. Para a IA avaliadora:

- **Red flag ético na redação** (mentir, manipular vulnerabilidade, esconder erro próprio/de colega, quebrar confidencialidade, recomendar procedimento desnecessário por meta) → **Dim 4 = 1 obrigatório**, mesmo que outras dimensões estejam altas.

---

## Os 4 valores oficiais

### 1. EXPERIÊNCIA UAU
**Tagline:** "Cada interação é memorável ou não conta."
**Essência operacional:** personalização, antecipação, escuta ativa, surpresa positiva. Paciente sai sentindo que foi genuinamente cuidado.

| Sinal POSITIVO | Sinal NEGATIVO | Sinal RED FLAG |
|----------------|----------------|----------------|
| Antecipa necessidade sem ser pedido | Cumpre script sem conexão | Desumaniza ("é só mais um caso", "não dá pra agradar todo mundo") |
| Lembra detalhes do paciente | Trata pelo número da ficha | Humilha em situação de vulnerabilidade |

### 2. INOVAÇÃO
**Tagline:** "Inconformados com o 'sempre foi assim'."
**Essência operacional:** mentalidade de melhoria contínua; propor com dado; dominar a ciência por trás da técnica, não só operar o botão.

| Sinal POSITIVO | Sinal NEGATIVO | Sinal RED FLAG |
|----------------|----------------|----------------|
| Propõe melhoria com dado/observação | Defende "sempre foi assim" | Recusa treinamento obrigatório / boicota mudança decidida |
| Estuda por conta própria | Resiste a software/protocolo novo | Sabota piloto coletivo |

### 3. ATITUDE DE DONO
**Tagline:** "Vê o problema, resolve o problema."
**Essência operacional:** propriedade emocional, não hierárquica. "Não é minha função" é o anti-exemplo literal.

| Sinal POSITIVO | Sinal NEGATIVO | Sinal RED FLAG |
|----------------|----------------|----------------|
| Resolve sem ordem; assume responsabilidade | "Não é minha função" / espera ordem | Esconde erro para não se comprometer |
| Reconhece problema cedo e age | Vê problema e ignora | Culpa colega/sistema sem agir |

### 4. SEDE DE CRESCIMENTO
**Tagline:** "Hoje melhor que ontem, sempre."
**Essência operacional:** pedir feedback proativo, estudar, compartilhar aprendizado, rejeitar estagnação.

| Sinal POSITIVO | Sinal NEGATIVO | Sinal RED FLAG |
|----------------|----------------|----------------|
| Pede feedback proativo; aplica correção | Defensividade a feedback | Declara "já sei tudo que preciso" |
| Compartilha conhecimento | Esconde técnica para vantagem interna | Recusa-se a aprender ferramenta nova |

---

## Hierarquia em conflito

1. **Ética** > qualquer um dos 4 valores
2. **UAU** é o valor "carro-chefe" operacional (mais visível ao paciente)
3. **Atitude de Dono** é o "valor-habilitador" dos outros 3
4. **Inovação ≈ Sede de Crescimento** — complementares; ambos podem ser desenvolvidos com treinamento

**Regra prática para scoring:**
- Gap em UAU é **impeditivo** para cargos com contato direto com paciente
- Gap em Atitude de Dono é **quase impeditivo** em qualquer cargo
- Gap em Inovação ou Sede pode ser desenvolvido — pesa menos
- Sinal de violação ética é **eliminatório** independente de nota geral

---

## Pesos por cargo (1-10) — REFERÊNCIA V2 (não usado em V1)

> **V1 usa pesos iguais 25% por dimensão.** Modulação por cargo + por valor primário da pergunta cabe em V2, **após** calibração inicial com Cohen's κ.

Esses pesos derivam do CULTURA-BEAUTY-SMILE-INPUT §2.x e ficam aqui registrados para uso V2 caso piloto V1 demonstrar que pesos iguais são insuficientes.

| Cargo (template Master) | UAU | Inovação | Atitude de Dono | Sede de Crescimento |
|------------------------|-----|----------|-----------------|---------------------|
| `dentista_padrao` | 10 | 10 | 9 | 10 |
| `recepcao_padrao` (+ ASB) | 10 | 6 | 9 | 9 |
| `coord_admin_padrao` (+ Gestor) | 9 | 9 | 10 | 10 |
| `freela_simples` | 8 | 7 | 8 | 7 |

**Como aplicar em V2 (se ativado):** quando a pergunta tem `valor_primario` específico (ex: pergunta default Dentista D1 = "Inovação"), o peso da Dim 4 é modulado pelo peso correspondente do cargo. Em V1, simplificamos para peso fixo igual entre todas dimensões.

---

## Vocabulário cultural (sinais positivos quando aparecem na redação)

- **"cuidado"**, **"acolher"**, **"escutar"**, **"antecipar"** — alinha com UAU
- **"propus"**, **"testei"**, **"questionei"**, **"sugeri"** — alinha com Inovação
- **"assumi"**, **"resolvi"**, **"vi e fui"**, **"não esperei"** — alinha com Atitude de Dono
- **"aprendi"**, **"pedi feedback"**, **"errei e ajustei"**, **"voltei e ajustei"** — alinha com Sede de Crescimento

**Cuidado interpretativo (style neutralization Rao 2025):**
- Vocabulário rebuscado ≠ valor mais alto. Vocabulário simples com ideia clara > vocabulário sofisticado mas raso.
- Regionalismos (NE: "oxente", "vixe"; Sul: "bah", "tchê") são **culturalmente neutros**. Nunca penalizar nem premiar.
- Erros gramaticais menores (concordância, pontuação) **NÃO afetam score** se a ideia é clara.

---

## "Definitely NOT" — comportamentos eliminatórios na redação

Se a redação descreve o candidato fazendo (ou justificando) algum destes, **Dim 4 = 1**:

1. Mentir para paciente sobre diagnóstico, prognóstico, custo
2. Recomendar procedimento desnecessário por meta/comissão
3. Esconder erro técnico próprio ou de colega
4. Tirar vantagem de vulnerabilidade emocional
5. Quebrar confidencialidade (foto sem autorização, prontuário compartilhado)
6. Assédio (moral, sexual, discriminatório)
7. Uso de álcool/substâncias no expediente
8. Furto, fraude, manipulação de comissão/horário
9. Negligência grave com paciente
10. Sabotar decisão coletiva após decidida

**Importante:** se a redação descreve o candidato **identificando e CORRIGINDO** um destes (ex: "vi colega tentando esconder erro e escalei pro coordenador") → isso **alinha** com valores BS. O red flag é o candidato sendo o agente da violação ou justificando-a.

---

## Frases-chave dos fundadores (úteis para contexto, não exigir do candidato)

A IA pode usar como benchmark de alinhamento de tom, mas **NÃO penalizar** candidato que não cita:

- "Dentista de gente, não dentista de dente."
- "Não vendemos tratamento. Vendemos transformação."
- "Valores acima de qualquer pessoa — inclusive dos fundadores."
- "Inovação não é equipamento. É mentalidade."
- "Atendemos bem quem paga, atendemos de graça quem não pode."

---

**Atualizado em:** 2026-05-12 (v1.1 — nota de pesos V1 igual)
**Próxima revisão:** após piloto interno (50 redações) — decidir se V2 ativa modulação de pesos por cargo.
