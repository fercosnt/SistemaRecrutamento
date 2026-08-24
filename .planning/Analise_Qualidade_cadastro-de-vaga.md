# Análise de qualidade — skill `cadastro-de-vaga`

**Data:** 2026-08-23 · **Modo:** COMPLETO · **Caminho:** `plugins/cadastro-de-vaga/skills/cadastro-de-vaga`
**Score final: 8.63 / 10 — Profissional** (sem penalidades)

⚠ **Viés declarado:** esta análise foi feita pelo autor da skill, na mesma sessão em que ela foi
escrita. Os scores foram aplicados com a regra conservadora do scorecard (na dúvida entre dois
valores, o menor), mas uma revisão independente ainda vale.

---

## 1 · Mapa de estrutura

```
plugins/cadastro-de-vaga/
├── .claude-plugin/plugin.json                7 linhas
├── .claude-plugin/marketplace.json           7 linhas
├── README.md                               103 linhas   (do plugin, não da skill)
├── commands/cadastrar-vaga.md               26 linhas
└── skills/cadastro-de-vaga/
    ├── SKILL.md                            259 linhas
    ├── references/
    │   ├── mapa-de-visibilidade.md         129 linhas
    │   ├── perguntas-etapa1.md             129 linhas
    │   ├── rubrica-ia.md                   202 linhas
    │   ├── schema-e-migration.md           368 linhas   (com TOC)
    │   └── texto-rico.md                    88 linhas
    ├── scripts/validar-payload.mjs         367 linhas
    └── tests/
        ├── payload-gabarito.json            66 linhas
        └── provar-portao.mjs               162 linhas
```

Zero arquivos órfãos: os cinco references e o `provar-portao.mjs` são citados no `SKILL.md`; o
`payload-gabarito.json` é consumido pelo teste.

---

## 2 · Scores por dimensão

### Dimensão 1 — Arquitetura (25%) → **8.47**

| Sub-métrica | Peso | Score | Evidência |
|---|---|---|---|
| Estrutura de arquivos | 3× | **9** | SKILL.md em 259 linhas (mediana do benchmark: ~250), 5 references temáticos com nomes descritivos, script só para a operação determinística (CHECKs), teste separado. TOC presente no único reference acima de 300 linhas. |
| Metadata e trigger | 2.5× | **9** | 190/200 caracteres cobrindo 6 formas de pedir: *"Cria ou reescreve vaga… Use para nova vaga, abrir vaga, cadastrar vaga ou criar perguntas da Etapa 1"*. Não aciona para "publicar vaga" — correto, porque a skill deliberadamente não publica. |
| Tamanho e eficiência | 2× | **7** | Repetição real: a regra "a rubrica é tudo que o modelo vê" aparece no `SKILL.md`, no `mapa-de-visibilidade.md` **e** no `rubrica-ia.md`. O mapa de visibilidade também aparece duas vezes, resumido e completo. |

`(9×3 + 9×2.5 + 7×2) / 7.5 = 63.5 / 7.5 = 8.47`

### Dimensão 2 — Qualidade das instruções (30%) → **8.78**

| Sub-métrica | Peso | Score | Evidência |
|---|---|---|---|
| Clareza e naturalidade | 3× | **9** | Imperativo em todo o fluxo ("Leia o descritivo inteiro antes de perguntar qualquer coisa"). Tabelas para decisão (mapa de visibilidade, modos, portões). Parágrafos curtos, negrito nos termos-chave. |
| Contexto e justificativas | 2.5× | **9** | Praticamente toda regra carrega o porquê, e **medido**: o teto de 5 competências é justificado por `max_tokens: 2048`; o teto de 10 perguntas, pelo `publish_vaga`; a exigência de `created_by`, por "9 de 12 vagas ficaram nulas". Zero número arbitrário. |
| Especificidade vs liberdade | 2× | **8** | Calibrado na prática — script (baixa liberdade) para CHECKs, template (média) para SQL, instrução textual (alta) para a cópia do anúncio — mas os graus não são discutidos explicitamente. |
| Anti-patterns e guardas | 1.5× | **9** | Tríade completa. DON'T: *"Portões que não se negociam"* (8 itens), *"O que ele NÃO entende — não emita"*. VERIFY incomum e forte: validador + prova do portão + consultas pós-apply + conferência visual. |

`(9×3 + 9×2.5 + 8×2 + 9×1.5) / 9 = 79 / 9 = 8.78`

### Dimensão 3 — Cobertura funcional (25%) → **8.56**

| Sub-métrica | Peso | Score | Evidência |
|---|---|---|---|
| Workflow e modos | 3× | **9** | Nove passos, do "resolver o autor" à "conferência visual", cada um com ação e saída. Dois modos com tabela de seleção. O fluxo termina na tela, não no SQL. |
| Exemplos e demonstrações | 2.5× | **8** | Concretos e anotados: rubrica-gabarito completa de produção, corpo de anúncio real, par ruim/bom de opções de pergunta, par ruim/bom de âncora BARS. **Falta um exemplo fim-a-fim** (descritivo → payload → migration) num lugar só. |
| Edge cases e fallbacks | 2× | **9** | Cobre slug duplicado, vaga inexistente, perguntas soft-deletadas contando no teto, autor não resolvido, colisão de dollar-quote, `secoes_extras` invisível, anúncio pedindo o que o formulário não coleta, PDF que não abre. Seção *"Onde esta skill para"* define o escopo negativo. |
| Output e entrega | 1.5× | **8** | Formato do payload e template da migration definidos; checklist de pré-entrega forte. Falta um template do **relatório final ao operador**. |

`(9×3 + 8×2.5 + 9×2 + 8×1.5) / 9 = 77 / 9 = 8.56`

### Dimensão 4 — Ecossistema e manutenção (20%) → **8.67**

| Sub-métrica | Peso | Score | Evidência |
|---|---|---|---|
| References e recursos | 3× | **8** | Cinco temáticos, propósitos distintos, todos citados, zero órfãos, TOC no maior. Desconto pela sobreposição citada em 1.3. |
| Integração com a plataforma | 2.5× | **9** | Read com `pages` para PDF (com fallback `pdftotext`), `AskUserQuestion` na rodada de perguntas, lista de tarefas para os 9 passos, Bash para `p46apply.cjs` e `npm run dev`. Reaproveita `cargoTemplates.ts` em vez de inventar pesos. |
| Consistência interna | 2× | **9** | Pratica o que prega: exige "prove o portão por execução" e entrega `provar-portao.mjs`; exige "varra pela forma" e entrega os comandos de varredura. Cross-references verificados. Terminologia estável (payload, portão, rubrica, gabarito, modo). |
| Evolução | 1.5× | **9** | Modular. A convenção "regra nova → mutação nova em `provar-portao.mjs`" torna a evolução segura por construção. |

`(8×3 + 9×2.5 + 9×2 + 9×1.5) / 9 = 78 / 9 = 8.67`

---

## 3 · Cálculo do score final

```
raw = (8.47 × 0.25) + (8.78 × 0.30) + (8.56 × 0.25) + (8.67 × 0.20)
    =  2.1175       +  2.6340       +  2.1400       +  1.7340
    =  8.6255
```

**Penalidades avaliadas — nenhuma se aplica:**

| Condição | Multiplicador | Aplica? |
|---|---|---|
| Sub-métrica crítica < 5.0 | ×0.85 | ❌ menor crítica é Metadata = 9.0 |
| Reference ausente para funcionalidade core | ×0.90 | ❌ os 5 domínios core têm reference |
| Description não aciona corretamente | ×0.90 | ❌ 190 caracteres, 6 formas de pedir |
| SKILL.md > 800 linhas sem references | ×0.95 | ❌ 259 linhas com 5 references |

**`score_final = 8.6255 × 1.0 = 8.63` → Profissional**

Threshold de ação: `score >= 8.5` **e** todas as sub-métricas `>= 7.0` (a menor é 7.0, em
Tamanho e Eficiência) → **Aprovação: skill pronta para uso.**

---

## 4 · Melhorias já aplicadas nesta rodada

Quatro tasks de ROI alto foram implementadas durante a própria análise, elevando o score de
**8.19** para **8.63**:

| Task | Sub-métrica | Antes → depois | Ganho |
|---|---|---|---|
| Reescrever a `description` com sinônimos de trigger | Metadata | 7 → 9 | +0.167 |
| Instruir `AskUserQuestion` e rastreio dos 9 passos | Plataforma | 7 → 9 | +0.111 |
| TOC no `schema-e-migration.md` (368 linhas) | Estrutura | 8 → 9 | +0.100 |
| Seção *"Onde esta skill para"* + fallback de descritivo fino | Edge cases | 8 → 9 | +0.056 |

Após cada mudança o portão foi re-provado: **44 mutações, 0 falhas.**

---

## 5 · Tasklist de implementação — o que sobrou

### Fase 1 — ROI alto, independente

- [ ] **T1 · Deduplicar a regra "a rubrica é tudo que o modelo vê"** (Tamanho 7→8, +0.067)
      Ela aparece em três arquivos. Manter a versão completa em `mapa-de-visibilidade.md` (que
      traz o trecho do `index.ts:288-292`), reduzir no `SKILL.md` a uma linha com ponteiro, e
      no `rubrica-ia.md` a uma referência cruzada. Esforço: baixo.

- [ ] **T2 · Exemplo fim-a-fim em `references/`** (Exemplos 8→9, +0.069)
      Um `exemplo-completo.md` mostrando o mesmo cargo atravessando as quatro etapas:
      trecho do descritivo → payload → saída do validador → migration emitida. Hoje as peças
      existem separadas e o leitor precisa montar a ligação. Esforço: médio.

### Fase 2 — ROI médio

- [ ] **T3 · Template do relatório final ao operador** (Output 8→9, +0.042)
      O que a skill imprime quando termina: slug criado, autor, contagem de perguntas, avisos
      não resolvidos e o link da página para conferir. Hoje o formato é implícito. Esforço: baixo.

- [ ] **T4 · Tornar explícitos os graus de liberdade** (Especificidade 8→9, +0.067)
      Uma tabela curta no `SKILL.md`: onde a skill é script (CHECKs), onde é template (SQL),
      onde é julgamento (a cópia do anúncio e a escolha das competências) — e por quê.
      Esforço: baixo.

### Fase 3 — Excelência

- [ ] **T5 · Exercitar o passo 8 (conferência visual) de ponta a ponta**
      Único passo do fluxo que ainda não rodou de verdade, porque aplicar a migration de teste
      criaria vaga duplicada em produção. Fazer junto com o primeiro cadastro real. Esforço: baixo.

**Projeção:** Fase 1 completa → ~8.76. Fases 1+2 → ~8.87.

---

## 6 · O que esta análise não cobre

- Não avalia se o **domínio** está certo — se a rubrica gerada de fato discrimina bem
  candidato. Isso só se mede com dados reais de teste (item 4 da fila do `RETOMAR-AQUI.md`).
- Não executou a skill em runtime sobre um cadastro real de ponta a ponta; validou o payload
  gerado a partir de um dos dois PDFs contra o gabarito do banco, e o portão por mutação.
