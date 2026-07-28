---
cargo: assistente_financeiro
formato: hibrido
bateria: "3 múltipla escolha + 1 in-basket curto"
tempo_estimado_min: 23
peso_maximo_mc: 12
corte_revisao: "MC < 8/12 OU ≥1 atencao  |  in-basket < 13/25 OU red flag"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: "minerado de perguntas-vagas.md (Etapa 2 Assistente Financeiro) + metodologia HiPeople in-basket"
language: pt-BR
eixos: "priorização sob prazo · conformidade · integridade/sigilo financeiro · atenção a processo"
---

# Banco SJT — Assistente Financeiro (híbrido)

> **MC:** `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0 **+ flag**. Threshold: `< 8/12` **OU** `≥1 atencao`.
> **In-basket:** resposta estruturada; IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana. Threshold: `< 13/25` **OU** red flag.
> Escopo real: Omie/ERP, conciliação, contas a pagar/receber, fluxo de caixa, fechamento, glosas, NF.

---

## Múltipla escolha

### AF-1 — Discrepância na conciliação no dia do fechamento
- **Dimensão / valor:** Atitude de Dono + Integridade
- **Fonte:** minerado ("prazos apertados e pressão")

> No fechamento mensal (prazo hoje 18h), você encontra uma discrepância de R$ 2.300 entre o extrato bancário e o sistema. Investigar a fundo vai atrasar o fechamento que a diretoria espera.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Comunica a pendência ao gestor com transparência, isola/documenta a discrepância, investiga a origem e propõe prazo realista — fechamento correto acima de fechamento no prazo com erro | fortemente_pontua | 4 | Âncora. Integridade do dado acima do prazo. |
| 2 | Lança um ajuste pra bater o número e marca pra revisar depois, avisando o gestor | pontua | 2 | Mantém transparência, mas mascara o número no curto prazo. |
| 3 | Fecha no prazo e deixa a discrepância pra resolver "quando der" | neutro | 1 | Posterga sem garantia de retomada. |
| 4 | Força o batimento com um lançamento de ajuste sem registrar nem avisar ninguém | atencao | 0 | Adulteração silenciosa. Flag. |

### AF-2 — Sigilo de informação financeira
- **Dimensão / valor:** Ética / Confidencialidade
- **Fonte:** minerado ("conforto com confidencialidade financeira")

> Um colega de outra área pergunta casualmente quanto um dentista da rede faturou/recebeu (ou quanto custou um equipamento) — info que você acessa no sistema.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Não compartilha; explica que dados financeiros são confidenciais e só acessíveis a quem tem necessidade/autorização; direciona pro canal correto se for demanda legítima | fortemente_pontua | 4 | Âncora. Sigilo + caminho legítimo. |
| 2 | Não diz o valor exato, mas dá "uma ideia geral" pra não parecer rude | pontua | 2 | Vaza parcialmente por gentileza. |
| 3 | Diz só que "não pode falar", de forma ambígua | neutro | 1 | Cumpre, mas sem clareza nem orientação. |
| 4 | Compartilha — "é só entre nós" / "ele é meu amigo" | atencao | 0 | Quebra de sigilo. Flag. |

### AF-3 — Boleto urgente fora do processo de aprovação
- **Dimensão / valor:** Conformidade + Atitude de Dono

> Um fornecedor liga dizendo que o boleto vence hoje e ameaça suspender a entrega de material clínico (anestésico/luvas) amanhã. O pagamento não passou pela aprovação normal e o gestor que aprova está em reunião inacessível.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Confere a legitimidade do boleto (pedido/nota), busca aprovação por canal alternativo definido e, se for genuinamente crítico, documenta a decisão + comunica o gestor assim que possível | fortemente_pontua | 4 | Âncora. Equilibra continuidade e conformidade. |
| 2 | Paga na hora pra não faltar material e avisa o gestor depois | pontua | 2 | Resolve a operação, fura o processo de aprovação. |
| 3 | Não paga e espera o gestor sair da reunião, mesmo com risco de faltar material amanhã | neutro | 1 | Conforme, mas inerte diante do risco operacional. |
| 4 | Paga sem conferir a legitimidade, só pela pressão do fornecedor | atencao | 0 | Risco de boleto fraudado. Flag. |

---

## In-basket curto — "A segunda-feira do financeiro"
- **Tempo:** ~15min · resposta estruturada
- **Avaliação:** IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana
- **Fonte:** adaptado da metodologia HiPeople (PESQUISA §6.5) ao escopo financeiro Beauty Smile

> São 8h30 de segunda. O gestor financeiro está em reunião com a diretoria até 10h (não pode ser interrompido). Você tem até 11h pra classificar, decidir o que faz/delega/adia e iniciar a resolução. Chegaram 6 itens:
>
> 1. **Fornecedor:** boleto R$ 4.200 (material clínico) vence hoje 18h; sem pagamento, suspende entrega de anestésico+luvas amanhã.
> 2. **Odontoprev:** procedimento glosado por falta de autorização — prazo de recurso 5 dias úteis.
> 3. **Sistema:** 3 NFs de sexta não emitidas — convênio bloqueia repasse se não receber hoje.
> 4. **WhatsApp paciente:** "cobraram R$ 320 que o convênio deveria cobrir, resolvam hoje ou vou no Procon."
> 5. **RH:** colaboradora pede adiantamento de R$ 800 (emergência familiar).
> 6. **Diretoria:** relatório de produção do mês até quarta.
>
> Descreva como você classifica (urgência/importância), o que faz pessoalmente, o que delega/escala e em que ordem.

**Rubric BARS (0-5 por dimensão):**

| Dimensão | Peso | Inclusion | Exclusion / Red flag |
|---|---|---|---|
| Priorização (Eisenhower) | 25% | Itens 1 e 3 (prazo hoje + impacto operacional/repasse) primeiro; item 6 pode esperar | Começa pelo relatório (6) ou trata tudo como igual |
| Reconhecimento de risco | 20% | Trata o boleto como risco operacional E confere legitimidade antes de pagar | Paga o boleto sem conferir / ignora a suspensão de material |
| Conformidade / prazos | 20% | Identifica prazos legais (glosa, repasse de NF) e age dentro deles | Perde prazo de recurso ou repasse |
| Delegação / escalação | 20% | Adiantamento (5) → gestor; paciente Procon (4) → resposta empática + escala financeiro | Decide o adiantamento sozinho / ignora o paciente |
| Comunicação proativa | 15% | Gerencia expectativa de quem espera; deixa lista pronta pro gestor às 10h | Silêncio com stakeholders; nada pronto pro gestor |

**Total 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.** Red flag (pagar boleto sem conferir / quebra de sigilo) → `recommendation: reject`, decisão humana.
