---
cargo: consultor_vendas_premium
formato: hibrido
bateria: "3 múltipla escolha + 1 case aberto"
tempo_estimado_min: 24
peso_maximo_mc: 12
corte_revisao: "MC < 8/12 OU ≥1 atencao  |  case < 13/25 OU red flag"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: "minerado de perguntas-vagas.md (Etapa 2 Consultor) + valores Beauty Smile"
language: pt-BR
eixo_etico: "meta comercial × bem-estar do paciente"
---

# Banco SJT — Consultor de Vendas Premium (híbrido)

> **MC:** `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0 **+ flag**. Threshold: `< 8/12` **OU** `≥1 atencao`.
> **Case:** IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana. Threshold: `< 13/25` **OU** red flag.
> Cargo central da cultura Beauty Smile: venda consultiva premium com **honestidade** (eixo: meta × bem-estar). Valores: Atitude de Dono, Experiência UAU, Inovação.

---

## Múltipla escolha

### CV-1 — Meta do mês × indicação clínica
- **Dimensão / valor:** Atitude de Dono + Ética
- **Fonte:** minerado ("equilíbrio resultado comercial × bem-estar")

> Um paciente está decidido a fechar um tratamento caro com laser, mas no diagnóstico o dentista aponta que parte do que ele quer não tem indicação clínica agora (poderia ser mais simples). Bater sua meta do mês depende desse fechamento.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Mostra o que tem indicação agora e o que pode esperar, fecha o que faz sentido clínico e registra o resto pra follow-up estruturado | fortemente_pontua | 4 | Âncora. Ético E consultivo — não perde o lead, nutre. |
| 2 | Fecha só o que tem indicação e abre mão do resto, sem estruturar follow-up | pontua | 2 | Ético, mas deixa valor na mesa sem nutrir. |
| 3 | Apresenta tudo e deixa 100% a decisão com o paciente, sem orientar | neutro | 1 | Abdica da consultoria. |
| 4 | Fecha o pacote completo "porque ele quer e tem dinheiro" e bate a meta | atencao | 0 | Oversell sem indicação. Flag. |

### CV-2 — Objeção de preço em venda de alto valor
- **Dimensão / valor:** Inovação/UAU + Comunicação
- **Fonte:** minerado ("como lida com objeção de preço")

> Lead qualificado, encantado com o resultado do laser Fotona, mas trava no preço: "Achei caro, vi mais barato em outra clínica."

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Investiga a objeção real (orçamento? valor percebido?), reforça o diferenciado (Fotona, minimamente invasivo, experiência UAU), oferece condições e respeita se não for o momento — porta aberta | fortemente_pontua | 4 | Âncora. Valor antes de preço. |
| 2 | Dá um desconto na hora pra fechar | pontua | 2 | Resolve curto prazo, corrói margem/posicionamento premium. |
| 3 | Aceita a objeção e encerra ("qualquer coisa estamos aqui") sem explorar valor | neutro | 1 | Passivo, não conduz. |
| 4 | Desqualifica a concorrência ("lá é barato porque é ruim/perigoso") pra forçar o fechamento | atencao | 0 | Antiético + risco reputacional. Flag. |

### CV-3 — Expectativa de resultado acima do realista
- **Dimensão / valor:** Atitude de Dono + Ética
- **Fonte:** minerado + case Mariana

> A lead quer um resultado que, pela avaliação do dentista, o plano que ela pode pagar não entrega 100%. Ela pergunta: "Vai ficar igual à foto que te mandei?"

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Alinha a expectativa com honestidade (o que dá pra alcançar no plano viável, com mock-up/registro do dentista), sem prometer o que não entrega, e mostra o caminho em etapas | fortemente_pontua | 4 | Âncora. Honestidade protege a relação e a clínica. |
| 2 | Diz "vai ficar lindo, confia" e foca em fechar, deixando o ajuste de expectativa pro dentista depois | pontua | 2 | Empurra o problema adiante. |
| 3 | Repassa a pergunta pro dentista sem se posicionar | neutro | 1 | Não assume a consultoria. |
| 4 | Garante que vai ficar igual à foto pra fechar a venda | atencao | 0 | Promessa irreal. Flag. |

---

## Case aberto — "A Renata e a formatura"
- **Tempo:** ~15min · resposta livre, máx 300 palavras
- **Avaliação:** IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana
- **Fonte:** CRIADO para Beauty Smile

> **Caso:** Renata, 41 anos, chega super interessada após ver os vídeos do Dr. Fernando no Instagram. Quer "resolver tudo de uma vez": clareamento + tratar dentes escurecidos + "o sorriso perfeito". No diagnóstico, o dentista aponta retração gengival e um canal antigo a reavaliar ANTES de qualquer estética — o "tudo de uma vez" teria que ser faseado. O tratamento completo ideal é caro; Renata tem orçamento limitado, está comparando com uma clínica mais barata e tem uma formatura em 3 meses. Ela pergunta direto: *"Vale a pena? Dá pra fazer no meu orçamento e ficar pronto a tempo?"*
>
> **Escreva como você conduziria essa conversa** (descoberta da necessidade, apresentação do plano, comunicação de valor, objeção de preço e expectativa de prazo).

**Rubric BARS (0-5 por dimensão):**

| Dimensão | Peso | Inclusion | Exclusion / Red flag |
|---|---|---|---|
| Descoberta de necessidade | 20% | Entende orçamento real, motivação (formatura), expectativa antes de propor | Parte pro pitch sem entender a pessoa |
| Comunicação de valor (UAU/Fotona) | 20% | Conecta o diferencial laser/minimamente invasivo ao que importa pra ela | Promessa genérica sem ancorar em valor real |
| Honestidade / ética | 25% | Respeita a sequência clínica (gengiva/canal antes da estética); não promete prazo irreal | Promete "tudo pronto pra formatura" ignorando a sequência clínica |
| Manejo de objeção de preço | 20% | Faseamento/condições; não desqualifica concorrente | Desconto reflexo ou ataque à concorrência |
| Fechamento consultivo | 15% | Próximo passo claro; nutre a relação mesmo sem fechar tudo | "Fecha hoje ou perde" / pressão |

**Total 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.** Red flag (promessa irreal / sequência clínica ignorada) → `recommendation: reject`, decisão humana.
