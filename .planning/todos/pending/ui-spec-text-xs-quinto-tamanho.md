---
id: ui-spec-text-xs-quinto-tamanho
created: 2026-07-29
source: Phase 42 (UI-SPEC revisões 1 e 2) — achado do gsd-ui-researcher, verificado contra globals.css e contra o código vivo
priority: low
resolves_phase: null
tags: [ui-spec, design-system, tipografia, debito-de-documentacao, m8-42]
---

# `text-xs` é um 5º tamanho — duas UI-SPECs arquivadas afirmam o contrário, e a convenção viva do código diverge da que a Phase 42 foi obrigada a adotar

## O fato do token

`src/styles/globals.css:79` declara `--text-xs: 0.75rem; /* 12px */`. Não há alias para
14px. Portanto `text-xs` **é** um quinto tamanho, distinto do `text-sm` (14px).

## A afirmação incorreta nas specs arquivadas

| Arquivo | Linha | Texto |
|---------|-------|-------|
| `.planning/milestones/v2.0-phases/14-…/14-UI-SPEC.md` | 85 | "…use `text-xs font-semibold uppercase tracking-wide` — a treatment of the 14px label role (small-caps eyebrow), **not a new size** (Phase 11/13 precedent)." |
| `.planning/milestones/v2.0-phases/15-…/15-UI-SPEC.md` | 89 | idem, com "(Phase 11/13/14 precedent)" |

A frase é autocontraditória: prescreve `text-xs` (12px) e afirma que isso é o papel de 14px.

## O precedente citado não existe (verificado)

As UI-SPECs das Phases 11, 13 e 34 **não contêm `text-xs`**, e não contêm nenhuma
prescrição de eyebrow / uppercase / micro-label — grep por `uppercase|eyebrow|micro-label|
tracking-wide` retorna vazio nas duas. A P14 citou um "Phase 11/13 precedent" que aquelas
specs nunca escreveram, e a P15 então citou a P14. Citação fantasma, auto-reforçada em uma
rodada.

> **Nota de correção:** durante a Phase 42 levantou-se a hipótese de que P11/P13 *praticavam*
> 14px uppercase mesmo sem prescrever, o que tornaria a citação "certa sobre a prática e
> errada sobre o token". **A medição não sustenta isso** — ver a contagem abaixo. A hipótese
> foi descartada; o que se sabe é que as specs citadas são silenciosas sobre eyebrows.

## A convenção viva do código (medida em 2026-07-29)

`grep -rn "uppercase tracking-wide" src/features/ src/components/`:

| Tamanho | Ocorrências |
|---------|-------------|
| `text-xs` (12px) | **17** |
| `text-sm` (14px) | 3 |

Ou seja: **12px é a convenção dominante de eyebrow no produto**, em 9+ arquivos
(`ScorecardAvaliacao`, `ConsolidacaoDashboard`, `GuiaEntrevistaPanel`, `RedacaoReviewPanel`,
`BiasAuditPage`, `AgendamentoBlock`, `DashboardCandidatoPage`, …). A prescrição de 12px das
P14/P15 reflete o que o produto realmente faz; o que está errado nelas é só a **frase** que
diz que 12px é 14px.

## O que a Phase 42 fez, e a que custo

O checker de UI aplica um critério numérico duro — no máximo 4 tamanhos declarados, **sem
cláusula de isenção**. A rev 1 tentou declarar `text-xs` como 5º tamanho deliberadamente
isento, com cerca vinculante; o checker rejeitou, corretamente: uma cerca sobre *onde* o 5º
tamanho aparece não muda *quantos* existem.

A rev 2 adotou a opção (a): **eyebrows a 14px** (`text-sm` + `uppercase` + `tracking-wide`),
datas e metadados dobrados no mesmo papel de 14px. Conjunto declarado: **14 / 16 / 20 / 28 —
4 tamanhos, 2 pesos.** Dimension 4 fechada.

**A consequência, registrada honestamente:** a nova fila `/rh/revisoes` usará eyebrow de 14px
enquanto as telas de RH ao lado dela (`ScorecardAvaliacao`, `ConsolidacaoDashboard`,
`GuiaEntrevistaPanel`, `RedacaoReviewPanel`) usam 12px. É uma divergência visual pequena e
deliberada — o preço de satisfazer a regra ≤4.

O bloco do candidato **não** tem esse problema: `src/features/explicacao/` não contém
`text-xs` em lugar nenhum, e `ExplicacaoCandidatoPage.tsx:141` já renderiza
`text-sm font-semibold uppercase tracking-wide`. Ali a P42 fica alinhada ao código vivo — a
prescrição de 12px da P15 nunca foi implementada naquela página.

## Ação futura sugerida

O conflito real não é a frase nas specs arquivadas — é que **a regra ≤4 do checker e a
convenção de 12px do produto são incompatíveis**, e cada fase de frontend vai reencontrar
isso. Três saídas, em ordem de preferência:

1. **Decidir o eyebrow de uma vez, no design system.** Ou o produto adota 14px uppercase como
   eyebrow canônico (e as 17 ocorrências de `text-xs` viram dívida de migração rastreada), ou
   adota 12px e o critério do checker ganha uma isenção explícita para chrome estrutural. Hoje
   o projeto tem as duas coisas ao mesmo tempo e resolve no grito a cada fase.
2. Tratar a seção de tipografia da `42-UI-SPEC.md` como fonte canônica a copiar, não as v2.0 —
   evita reimportar a frase errada.
3. Nota de errata no topo das duas specs arquivadas apontando para este todo, sem reescrever o
   conteúdo aprovado.

**Não** mudar `--text-xs` para 14px: alteraria o render de 17 pontos vivos para resolver um
problema de documentação.
