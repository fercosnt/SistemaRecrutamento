---
id: 52-banco-sjt-marketing-comprimento-das-alternativas
created: 2026-10-10
source: Phase 52, D-34 (operador, 2026-10-10). Medição pela leitura do arquivo da migration `20260929000001_banco_sjt_marketing.sql`
priority: medium
resolves_phase: 52
decision_owner: operador
tags: [sjt, banco-de-itens, marketing, gabarito, prod, m8-52]
---

# Equalizar o comprimento das alternativas do banco SJT de marketing em PROD

**A decisão é do operador e foi tomada em 2026-10-10. Veja a seção §Decisão, no fim.** Esta pendência nasceu separada da
Phase 52, porque a D-34 aplicava a regra só ao banco novo de pré-vendas. A D-35 a trouxe para dentro do bloco C.

## O vício

No banco de marketing que está no ar (`20260929000001`, cargos `social-media` e os outros 2 de marketing),
a alternativa `fortemente_pontua` é a **mais longa em 16 dos 18 itens `mc`**. A razão sobre a média
das outras três vai de 0,96× a **2,85×**. A tela do candidato embaralha a ordem
(`SjtMultiplaEscolhaScreen.tsx:51-84`), então a posição não entrega a resposta. O comprimento entrega: quem
escolhe a mais longa acerta quase sempre, e a faixa achata.

| item (ordem na migration) | `fortemente_pontua` | outras três | razão |
|---|---|---|---|
| 1 (Social Media, situação 1) | 227 | 79 / 65 / 95 | 2,85× |
| 5 | 199 | 94 / 55 / 94 | 2,46× |
| 18 | 197 | 80 / 76 / 87 | 2,43× |
| 19 (a única abaixo de 1×) | 79 | 109 / 63 / 74 | 0,96× |

Para refazer a medição, rode um regex sobre os literais `$iNoM$…$iNoM$` da migration, com o comprimento em caracteres.

## O que já existe

`docs/specs/DRAFT-banco-sjt-marketing.md` tem uma reescrita **local, nunca commitada** (modificada em
2026-09-30 03:17, 45 linhas trocadas sobre o `7be693c1`) que encurta a `fortemente_pontua` e alonga as
outras. **Não commitar nem descartar** esse arquivo até a decisão. Hoje ele é a única cópia dessa
reescrita.

## O que a decisão tem de cobrir

1. **Se** o banco no ar é corrigido antes de abrir para candidatos reais, ou depois.
2. **Como** corrigir. A D-28 da 52 registra que um item de banco já respondido não se edita: entra uma
   versão nova do banco por migration (ledger + md5, `p46apply.cjs`). Antes de decidir, meça quantas
   respostas já apontam para esses itens em PROD (só leitura).
3. **Qual texto** entra: o rascunho de 30/09 como está, ou revisto. Ele tem de passar pela mesma
   tabela de caracteres por alternativa que a D-34 exige para pré-vendas.

## Decisão (operador, 2026-10-10): D-35 da Phase 52

1. Corrigir **antes** de abrir para candidatos reais.
2. **Versão nova** do banco por migration (D-28). Nenhum item é editado no lugar.
3. O rascunho de 30/09 entra **revisto**, pela tabela de caracteres da D-34. O operador aprova o texto no portão.

Entra na Phase 52 como **extensão do bloco C** (pré-vendas + versão nova dos 3 cargos de marketing, mesmo
portão de texto). O planejador propõe a ordem em relação à limpeza do bloco D e a retirada dos itens antigos.
Em PROD, só a candidatura `8101c56f` (+claude6) respondeu itens deste banco (6 `mc` de `social-media`,
medido em 2026-10-10). Ela está na população da D-30.
