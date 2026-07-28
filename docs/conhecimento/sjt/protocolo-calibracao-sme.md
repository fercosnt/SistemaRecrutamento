---
tipo: protocolo-calibracao
versao: v1.0
status: active
language: pt-BR
relacionado: PRD-sjt-work-sample-odontologia.md (RF-SJT-12, §10 Q2)
fonte_base: PESQUISA-sjt-odontologia-beauty-smile.md §8 (roadmap de calibração)
---

# Protocolo de Calibração SME — Banco de SJT

Como validar e calibrar os itens de SJT/Work Sample por cargo. Adaptado ao porte da Beauty Smile (clínica única, N de incumbentes pequeno) — prioriza **face-validity + known-groups** antes da validação preditiva estatística.

---

## 1. Princípio por tipo de cargo

| Tipo | Âncora da "resposta certa" | Esforço de calibração |
|------|----------------------------|------------------------|
| **Clínico** (Dentista, ASB, TSB) | Externa: CFO / DCN / ECA / Lei 11.889 | Leve — checagem de face-validity |
| **Comercial / Admin** (Consultor, SDR, Assistente Financeiro) | Interna: o que os **top performers** fazem **E** que respeita os 4 valores + eixo meta×bem-estar | Pesado — é o trabalho real |
| **Genérica / valores** | 4 valores Beauty Smile | Leve — dono da cultura define |

> **Guardrail comercial:** a âncora nunca é só "o que o melhor closer faz". É "o que o melhor closer faz **e que respeita os valores**". O dono da cultura tem **veto** sobre qualquer âncora que premie comportamento que converte mas fere os valores (oversell, inflar expectativa). Isso impede o SJT de virar teste de agressividade comercial.

---

## 2. SMEs por cargo

| Cargo | SME primário | SME secundário |
|-------|--------------|----------------|
| Dentista / ASB / TSB | Fernando + 1-2 dentistas sênior da rede | Psi CRP (responsável técnico, já contratado) |
| Consultor de Vendas Premium / SDR | 1-2 melhores closers/SDRs atuais | Gestor comercial |
| Assistente Financeiro | Controller / líder financeiro atual | Fernando |
| Vaga genérica | Fernando (dono da cultura) | — |

Mínimo recomendado: **3 SMEs por item** (concordância calculável). Aceitável no MVP: 2 + tie-break do dono da cultura.

---

## 3. As 3 camadas de calibração

### Camada 1 — Face-validity + consenso de painel (pré go-live, ~2 semanas)
1. Cada SME responde cada SJT **"como o candidato ideal responderia"** + 1 linha de justificativa.
2. Calcular concordância na âncora por item:
   - **≥ 80%** → item **validado** (`status: active`)
   - **60-80%** → **revisar** enunciado/opções (`status: piloting`)
   - **< 60%** → **reescrever** (item ambíguo; volta a `status: draft`)
3. Divergências: workshop de ~1h pra alinhar a âncora ou aposentar o item.
4. Para cases abertos: SMEs validam o **rubric** (as inclusion/exclusion fazem sentido? red flags certos?), não respondem o case.

### Camada 2 — Known-groups com a equipe atual (1º mês, resolve o N pequeno)
1. O **time atual** faz o SJT do próprio cargo (incumbentes).
2. Check direcional: os reconhecidamente **fortes** pontuam mais que os **fracos**?
   - Sim → validade direcional, segue.
   - Um forte "bomba" um item → o **item/chave está errado**, não a pessoa → conserta o item.
3. É o atalho mais valioso pro comercial: a âncora emerge **dos dados de quem performa**, não de opinião isolada.

### Camada 3 — Validação preditiva (pós n≥20-30 contratações)
1. Correlacionar `score_sjt` × desempenho real / decisão final do gestor (métrica primária r≥.30 do PRD).
2. **Recalibrar pesos** com base no que de fato prevê bom funcionário.
3. Análise psicométrica básica (PESQUISA §8.2): RIT por item (>0.20; <0.10 = retirar), dificuldade (0.30-0.80), α da bateria (>0.65 — SJT é heterogêneo).

---

## 4. Caminho mínimo viável

```
Pré go-live:  Camada 1 (painel SME) → sobe banco com confiança
1º mês:       Camada 2 (known-groups com o time) → conserta itens com chave errada
Pós ~20-30 hires: Camada 3 (preditiva) → recalibra pesos
```

---

## 5. Workflow contínuo (V2) — git-PR com ciclo de vida

```
SME propõe/edita item em banco-sjt-<cargo>.md
   → Pull Request
   → revisão (psi CRP p/ clínico; gestor comercial p/ comercial; dono da cultura sempre)
   → merge → CI sync-sjt.ts hidrata DB com status='piloting'
   → roda no piloto (Camadas 1-2)
   → status='active' quando passa
```

Ciclo de vida do item (campo `status` em `perguntas`): `draft` → `piloting` → `active` → `retired`.

### Log de calibração (frontmatter do item / metadata)
```yaml
psychometric:
  pilot_n: null          # nº de respostas no piloto
  consenso_sme_pct: null # % de SMEs que concordaram na âncora (Camada 1)
  rit: null              # item-total correlation (Camada 3)
  dificuldade: null      # % acertando (Camada 3)
  calibrado_em: null
  calibrado_por: null
```

---

## 6. Template — planilha de respostas SME (Camada 1)

| item_id | SME | resposta_escolhida | justificativa (1 linha) |
|---------|-----|--------------------|--------------------------|
| R1 | SME-A | opção 1 (âncora) | "recepção tria, dentista decide" |
| R1 | SME-B | opção 1 (âncora) | "protocolo de urgência" |
| R1 | SME-C | opção 2 | "encaixar é mais rápido" |
| ... | | | |

Cálculo: `consenso_sme_pct = nº SMEs na âncora / total SMEs`. R1 acima = 2/3 = 67% → **revisar**.

> Armazenar a planilha junto ao item (Supabase Storage ou anexo no PR). Resultado final entra no `psychometric` do item.
