---
cargo: dentista
formato: hibrido
bateria: "3 múltipla escolha + 1 case aberto"
tempo_estimado_min: 30
peso_maximo_mc: 12
corte_revisao: "MC < 10/12 OU ≥1 atencao  |  case < 13/25 OU red flag"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: PESQUISA-sjt-odontologia-beauty-smile.md §6.1 + case criado Beauty Smile
language: pt-BR
nota_knockout: "A pergunta 'Está ciente que não realizamos atendimentos de harmonização orofacial?' é KNOCKOUT da Etapa 1 (inscrição, RF-02), não SJT."
---

# Banco SJT — Dentista (híbrido)

> **Múltipla escolha:** `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0 **+ flag**. Threshold MC: `< 10/12` **OU** `≥1 atencao`.
> **Case aberto:** avaliado por IA (template `07-work-sample-sjt`, inclusion/exclusion + Cite Before You Speak) com BARS 0-25 + **revisão humana sempre obrigatória**. Threshold case: `< 13/25` **OU** red flag.
> **Nunca auto-rejeita** (RNF-07a). Red flag ético/clínico força `recommendation: reject` no output da IA, mas a decisão final é humana.

---

## Múltipla escolha

### D1 — Odontofobia no meio do procedimento
- **Dimensão:** D6 Humanização + D3 Consentimento (+D9 Limites)
- **Fonte:** BlackStone Tutors + CFO Art. 11-X/VIII (ADAPTADO BR)

> Você realiza uma extração de terceiro molar inferior quando, após a anestesia surtir efeito e iniciar a luxação, a paciente (28a) começa a chorar, agarra seu antebraço e diz, em pânico, que não consegue continuar. O alvéolo está parcialmente luxado mas o dente ainda não saiu. A auxiliar espera sua decisão.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Interrompe, protege o alvéolo provisoriamente, acolhe, oferece opções (retomar com técnica de redução de ansiedade / reagendar com sedação consciente) e documenta tudo | fortemente_pontua | 4 | Âncora. Autonomia + segurança clínica + relação. |
| 2 | Para o procedimento e pede que a paciente saia, registrando a recusa, sem proteger o alvéolo nem oferecer caminho | pontua | 2 | Respeita a recusa, mas abandona sem proteção (risco clínico). |
| 3 | Continua rápido — "calma, já está quase acabando" — pra minimizar o trauma de interromper | atencao | 0 | Procedimento sem consentimento ativo (CFO 11-X). Flag. |
| 4 | Pede à auxiliar que segure as mãos da paciente pra terminar rápido | atencao | 0 | Coerção física. Flag. |

### D2 — Pedido estético sem indicação clínica
- **Dimensão:** D1 Ética + D10 EBM (+D2 Comunicação)
- **Fonte:** American College of Dentists + CFO Art. 11-V/IV (ADAPTADO BR)

> Paciente de 25 anos, primeira consulta, quer extrair um pré-molar superior saudável "para afinar o rosto", influenciada por vídeos. Exame: dente íntegro, sem indicação. Ela diz: "Outras clínicas fazem. Meu dinheiro, minha decisão. Você só executa."

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Recusa explicando os riscos funcionais/estéticos, oferece alternativas baseadas em evidência, entrega plano por escrito, encaminha a especialista e documenta | fortemente_pontua | 4 | Âncora. Autonomia ≠ obrigação de executar. |
| 2 | Encaminha para outro dentista da clínica sem dar parecer | pontua | 2 | Não executa o desnecessário, mas terceiriza o juízo. |
| 3 | Realiza a extração, "respeitando a autonomia da paciente adulta" | atencao | 0 | Tratamento desnecessário (CFO 11-V). Flag. |
| 4 | Aceita realizar mediante TCLE robusto + pagamento à vista | atencao | 0 | TCLE não legitima tratamento sem indicação. Flag. |

### D3 — Erro de colega descoberto na radiografia
- **Dimensão:** D1 Ética + D2 Comunicação + D5 Equipe
- **Fonte:** Caso TDA Perks (real) + CFO Art. 11/13 (ADAPTADO BR)

> Paciente de 47 anos chega com dor persistente no dente 36 após "endodontia bem feita" pelo colega anterior. Na radiografia você vê nitidamente uma lima endodôntica fraturada no terço apical + lesão periapical de ~4mm. A paciente nunca foi informada disso.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Mostra a radiografia, explica clinicamente sem julgar o colega, apresenta as opções de retratamento, documenta, entrega cópia do exame e sugere que ela converse com o dentista anterior | fortemente_pontua | 4 | Âncora. Transparência + autonomia, sem julgamento moral. |
| 2 | Encaminha para endodontista sem explicar à paciente o que viu | pontua | 2 | Encaminhamento clínico correto, mas omite o achado à paciente. |
| 3 | Trata o dente sem mencionar o achado; comunica o colega depois | neutro | 1 | Resolve o clínico, mas deixa de esclarecer (CFO 11-IV). |
| 4 | Liga pro dentista anterior antes de falar com a paciente, pra "alinhar narrativa" | atencao | 0 | Conivência com omissão (CFO 13-IV). Flag. |

---

## Case aberto — "O sorriso dos sonhos da Mariana"
- **Tempo:** ~18min · resposta livre, máx 400 palavras
- **Avaliação:** IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana obrigatória
- **Fonte:** CRIADO para Beauty Smile (perfil estético/reabilitação, sem urgência)

> **Caso:** Mariana, 29 anos, paciente nova na Beauty Smile, chega querendo "fazer o sorriso dos sonhos". Mostra fotos de influenciadoras e diz que quer lentes de contato dental em todos os dentes da frente, "bem branquinhos e maiores". Ao exame: dentes hígidos, sem cárie, mas com gengivite generalizada (placa e sangramento), apinhamento leve ântero-inferior, facetas de desgaste sugestivas de bruxismo e exposição gengival assimétrica no sorriso. Ela tem um casamento em 2 meses, já pesquisou preço numa clínica que "faz rapidinho", quer começar hoje, tem orçamento limitado e pergunta se dá pra "fazer só os 6 da frente pra economizar".
>
> **Descreva detalhadamente:**
> 1. Sua avaliação diagnóstica (estética + funcional + periodontal)
> 2. Conduta na consulta de hoje
> 3. Plano de tratamento de curto/médio prazo (sequência e opções)
> 4. Como você comunica isso à Mariana, considerando expectativa, prazo do casamento e orçamento
> 5. Riscos, consentimento e acompanhamento

**Rubric BARS (0-5 por dimensão):**

| Dimensão | Peso | Inclusion (presente) | Exclusion / Red flag (ausente) |
|---|---|---|---|
| Raciocínio clínico-estético (D10) | 25% | Identifica gengivite (tratar antes), bruxismo (proteção/contenção), exposição gengival e apinhamento como fatores que mudam o plano | Parte direto pro preparo de lentes ignorando gengivite/bruxismo |
| Planejamento / decisão (D10) | 20% | Sequência correta (placa/periodonto → planejamento → execução); oferece opções minimamente invasivas (clareamento + alinhador + facetas com mínimo/sem desgaste) | Desgaste agressivo de dentes hígidos sem indicação; "começar hoje" |
| Comunicação / expectativa (D2/D6) | 25% | Alinha expectativa do Instagram com a realidade; usa mock-up/ensaio; honestidade financeira (por que "só 6 da frente" pode desarmonizar cor) | Promete resultado irreal pra fechar; usa o casamento como gatilho de venda |
| Ética / minimamente invasivo (D1/D9) | 15% | Autonomia ≠ obrigação de executar; recusa desgaste desnecessário; documenta | Aceita destruir estrutura hígida "porque é o dinheiro dela" |
| Consentimento / continuidade (D3/D5) | 15% | TCLE sobre irreversibilidade; manutenção das lentes + contenção pro bruxismo; follow-up; planejamento digital | Sem consentimento informado sobre irreversibilidade |

**Total 0-25 · ≥18 = avança · 13-17 = entrevista · <13 = revisão humana.** Red flag (promessa irreal / sequência clínica ignorada / desgaste sem indicação) → `recommendation: reject`, decisão final humana.
