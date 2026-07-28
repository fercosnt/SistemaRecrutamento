---
cargo: sdr_social_seller
formato: hibrido
bateria: "3 múltipla escolha + 1 work-sample de WhatsApp"
tempo_estimado_min: 15
peso_maximo_mc: 12
corte_revisao: "MC < 8/12 OU ≥1 atencao  |  work-sample < 13/25 OU red flag"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: "minerado de perguntas-vagas.md (Etapa 2 SDR/Social Seller) + valores Beauty Smile"
language: pt-BR
eixo_etico: "meta de agendamento × qualificação honesta"
---

# Banco SJT — SDR / Social Seller (híbrido)

> **MC:** `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0 **+ flag**. Threshold: `< 8/12` **OU** `≥1 atencao`.
> **Work-sample:** o candidato escreve a resposta real a um lead no WhatsApp; IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana. Threshold: `< 13/25` **OU** red flag.
> Primeiro contato digital (Instagram/WhatsApp). Eixo: persuasão **com** empatia + responsividade + honestidade na qualificação.

---

## Múltipla escolha

### SDR-1 — Lead que sumiu / follow-up
- **Dimensão / valor:** Atitude de Dono + Comunicação

> Um lead pediu informação no Instagram há 2 dias, você respondeu na hora com um áudio explicando, e ele sumiu (visualizou e não respondeu). Sua meta de agendamentos está apertada.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Follow-up com valor agregado (depoimento/conteúdo ligado ao que ele perguntou + pergunta aberta que reabre a conversa), com timing respeitoso; se não responder após alguns toques espaçados, registra no CRM pra nutrir depois | fortemente_pontua | 4 | Âncora. Persistência consultiva, não invasiva. |
| 2 | Manda "Oi, ainda tem interesse?" todo dia até ele responder | pontua | 2 | Persiste, mas sem valor agregado (cansa o lead). |
| 3 | Espera ele voltar — "se tiver interesse, ele responde" | neutro | 1 | Passivo demais pra função de SDR. |
| 4 | Insiste com pressão/escassez falsa ("últimas vagas hoje!") pra forçar resposta | atencao | 0 | Manipulação. Flag. |

### SDR-2 — Meta de agendamento × qualificação honesta
- **Dimensão / valor:** Ética + Atitude de Dono
- **Fonte:** minerado ("metas de conversão × melhor solução")

> Chega um lead empolgado, mas pelas respostas dele você percebe que o caso provavelmente não é elegível pro tratamento que ele quer (ou o orçamento está muito aquém). Agendar conta pra sua meta de agendamentos.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Qualifica com honestidade — faz as perguntas certas, alinha a expectativa e agenda só se fizer sentido (ou direciona pro caminho adequado), protegendo o tempo do paciente e do clínico | fortemente_pontua | 4 | Âncora. Qualificação honesta acima da meta-vaidade. |
| 2 | Agenda mesmo assim, mas registra a ressalva pro consultor/dentista saber | pontua | 2 | Transparente internamente, mas ocupa agenda sem critério. |
| 3 | Agenda sem ressalva — "deixa o dentista avaliar lá" | neutro | 1 | Empurra o filtro adiante. |
| 4 | Agenda e ainda infla a expectativa pra garantir o comparecimento e contar a meta | atencao | 0 | Infla expectativa pra meta. Flag. |

### SDR-3 — Reclamação pública no Instagram
- **Dimensão / valor:** Experiência UAU + Comunicação

> Um seguidor comenta publicamente num post: "Fui aí e me trataram mal, não recomendo." Outros começam a curtir. Você gerencia o social.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Responde publicamente com acolhimento breve e profissional (sem expor dados nem discutir o caso), chama pro privado pra entender/resolver e escala internamente pra apurar | fortemente_pontua | 4 | Âncora. Acolhimento público + resolução privada + apuração. |
| 2 | Resolve direto no privado, mas deixa o comentário público sem nenhuma resposta visível | pontua | 2 | Resolve, mas o público lê silêncio como confirmação. |
| 3 | Responde só um "Sentimos muito, entre em contato" genérico, sem chamar pro privado nem apurar | neutro | 1 | Resposta robótica, sem resolução. |
| 4 | Apaga/esconde o comentário ou rebate publicamente defendendo a clínica | atencao | 0 | Negação/defensividade pública. Flag. |

---

## Work-sample — "Responda esse lead no WhatsApp"
- **Tempo:** ~8min · resposta livre (pode usar quebra em várias mensagens)
- **Avaliação:** IA (template `07-work-sample-sjt`) + BARS 0-25 + revisão humana
- **Fonte:** CRIADO para Beauty Smile — teste mais preditivo pra SDR

> *Chega esta mensagem no WhatsApp da Beauty Smile, vinda de um anúncio:*
> *"Oi, vi o vídeo de vocês sobre o laser. Tenho um dente da frente meio escuro que me incomoda há anos e tenho vergonha de sorrir. Vocês fazem? Quanto custa?"*
>
> **Escreva a sua resposta de WhatsApp pra esse lead, como você realmente mandaria.**

**Rubric BARS (0-5 por dimensão):**

| Dimensão | Peso | Inclusion | Exclusion / Red flag |
|---|---|---|---|
| Acolhimento / empatia | 25% | Reconhece o incômodo/vergonha; tom humano, não robótico | Vai direto ao comercial ignorando o lado emocional |
| Descoberta / qualificação | 25% | Faz perguntas antes de orçar; entende o caso | Joga o preço "na lata" sem avaliar |
| Comunicação de valor | 20% | Conecta ao diferencial (laser/minimamente invasivo) sem prometer resultado sem avaliação | Promete resultado/preço fechado pelo chat |
| Condução pro próximo passo | 20% | Convida pra avaliação/agendamento de forma natural | Não conduz / encerra sem CTA |
| Tom, clareza e LGPD | 10% | Português claro, sem cara de copy-paste; não pede dado sensível no chat | Texto robótico ou pede dados sensíveis indevidos |

**Total 0-25 · ≥18 avança · 13-17 entrevista · <13 revisão humana.** Red flag (preço+promessa sem avaliação / ignora o emocional) → `recommendation: reject`, decisão humana.
