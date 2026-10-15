# Vaga — Consultor(a) de Relacionamento e Pré-vendas (SDR) · rodada de outubro/2026

> **Aplicado em 15/10/2026**: a vaga em `20261014000101` (nasce `rascunho`) e o banco em `20261014000102`. Publicar é ato separado.
> Versão 1 · 2026-10-14 · autor da vaga: Fernando Costa Neto
> Fontes: `Descritivo_Cargo_SDR_Beauty_Smile_v3_brand.pdf` · `Onboarding_SDR_Beauty_Smile.pdf` ·
> a vaga anterior `consultor-relacionamento-pre-vendas` (lida do banco em 14/10) · metodologia
> Full Sales (`consultor-pre-vendas/Conhecimento/metodologia/full-sales-system`) · o anúncio da
> Beauty Smile na Catho (formato de referência).

> ⚠ **As seções marcadas «gerado» saem por script** do payload
> (`docs/vagas/proveniencia/sdr-relacionamento-pre-vendas.payload.json`) e do catálogo
> `supabase/functions/_shared/sjt-rubrica.ts`. Não edite à mão: mude a fonte e regere. Anotações
> ficam FORA delas.

## Decisões

| # | Assunto | Situação |
|---|---|---|
| D1 | Vaga nova ou reabrir a antiga | ✅ **Resolvida (14/10)** — vaga nova, slug `sdr-relacionamento-pre-vendas`. A antiga fica intacta com as 10 candidaturas da rodada anterior |
| D2 | Ampliar ou repor | ✅ **Resolvida (14/10)** — reposição. O anúncio fala da função, sem citar o time atual |
| D3 | Onboarding e valores no anúncio | ✅ **Resolvida (14/10)** — sem seção de onboarding e sem valores em reais. O modelo de remuneração fica; os números vão para a entrevista |
| D4 | Redação e pesos | ✅ **Resolvida (14/10)** — a redação sai; o que ela tentava medir entra no caso aberto. Pesos 25/40/0/35 (ver «Onde o peso cai») |
| D5 | Rubrica da IA (§6) | ✅ **Aprovada (15/10)** — a mesma da rodada anterior, sem mudança de texto |
| D6 | Knockout em «apenas remoto» (§2) | ✅ **Aprovado (14/10)** |
| D7 | Banco do teste situacional revisado (§3) | ✅ **Aprovado (15/10)**, aplicado em `20261014000102` — saem o item de indicação de tratamento e o de reclamação pública; entram a objeção «preciso ver com meu marido» e a reativação de orçamento parado; «lente» vira «clareamento»; o caso aberto ganha (b) follow-up de 7 dias e (c) objeção de preço |
| D8 | Critérios do caso aberto (§15) | ✅ **Aprovados (15/10)** — ⚠ só valem depois do deploy da EF `avaliar-redacao` |

### ⚠ Uma tensão que vale vocês saberem: preço

A Full Sales manda **não** passar valor no primeiro contato («varia por caso, o especialista
detalha») e só abrir o preço para quem parece fora do perfil. O teste aprovado da Beauty Smile
(MC4, §3) **premia o contrário**: dar a faixa de preço, dizer que o valor exato sai na avaliação e
perguntar o que a pessoa quer mudar. Os critérios do caso aberto (§15) seguem o teste aprovado,
porque um catálogo que contradiz o próprio teste cobra duas coisas opostas do mesmo candidato.
Se a política da clínica passou a ser a da Full Sales, mudam **os dois juntos**: o MC4 e o
critério `comunicacao_de_valor`.

## O fluxo, de ponta a ponta

**1 · Inscrição** — pública. Dados, currículo em PDF e as **5 perguntas da Etapa 1** (§2), todas
de escolha, nenhuma aberta. **Uma opção elimina:** quem marcar «apenas para trabalho remoto»
tem a candidatura encerrada aqui. É a única rejeição automática do funil (D6).

**2 · Triagem** — a IA lê o currículo, as respostas da Etapa 1 e a rubrica (§6), e nada mais.
Devolve score, pontos fortes e lacunas com trecho citado. **O sistema nunca rejeita sozinho.**
Não há avanço automático: o RH aprova pessoa a pessoa.

**3 · Avaliação assíncrona** — liberada a quem o RH aprovou:

| | o que é | tempo | pesa? |
|---|---|---|---|
| Teste situacional, múltipla escolha (§3) | 6 situações do pré-vendas, 4 alternativas embaralhadas | ~24 min | sim |
| Caso aberto (§3, §15) | (a) responder por escrito a um lead real de WhatsApp; (b) planejar o follow-up de 7 dias de quem não respondeu; (c) contornar a objeção «achei caro» — 200 a 500 palavras no total | ~20 min | sim |
| Big Five | 116 itens | ~15 min | **não** — contexto, com devolutiva ao candidato |

Aqui a IA **vê a peça inteira** do caso aberto: a entrega é o próprio texto, não um link.

**4 · Entrevista** — o roteiro é gerado a partir do perfil ideal (§11). Ele pede role-play de
WhatsApp, e é a etapa que mais pesa junto com o teste situacional.

**5 · Decisão final** — humana, com o painel de tudo, inclusive o texto do caso aberto.

**Total pedido ao candidato antes de falar com alguém: ~1h.**

{{PESOS}}

{{ANUNCIO}}

{{PERGUNTAS}}

{{SJT}}

## 4 · Redação cultural — não entra

A rodada anterior usava a `PADRAO_BS` («cuidar de alguém em momento de fragilidade»), com peso 25.
Ela não media o cargo: é uma redação genérica sobre cuidado, e não há redação de pré-vendas no
banco. O que ela tentava captar — escrever para alguém inseguro — o caso aberto mede de forma
direta, na própria mensagem ao lead. Por isso a redação sai de `testes_aplicaveis` e o peso dela
vai para o teste situacional (decisão do operador, 14/10).

## 5 · Quais avaliações entram

| Instrumento | Obrigatório | Peso |
|---|---|---|
| Triagem | sim | 25 |
| Teste situacional (`sdr-social-seller`: 6 mc + 1 caso aberto em três partes) | sim | 40 |
| Redação | **não entra** (§4) | 0 |
| Big Five | não | — |
| Cognitivo | não, e `aplica_cognitivo = false` (a prova textual tem banco vazio) | — |
| Entrevista | sim | 35 |

{{RUBRICA}}

{{PERFIL}}

## 12 · Textos de divulgação

### 12.1 · Catho

*Texto puro, no formato do anúncio da Beauty Smile já publicado na Catho. Título de busca:
«Analista de Relacionamento Comercial», que é como o descritivo diz que a vaga também é
divulgada. Campo de salário: «A combinar» — sem valores (D3).*

````
Analista de Relacionamento Comercial (SDR / Pré-vendas)

A função é a porta de entrada comercial da Beauty Smile, clínica de odontologia estética 100%
laser no Paraíso, em São Paulo: responder rápido quem chega pelo WhatsApp, Instagram, campanhas,
telefone e indicação, entender o que a pessoa procura, construir confiança e levá-la até a
avaliação — com ela comparecendo. O foco não é vender: é relacionamento. Quem conduz o
fechamento é o dentista.

Captação e primeiro contato:
Responder todos os leads novos com prioridade máxima, seguindo roteiro de atendimento consultivo

Qualificação consultiva:
Entender queixa, desejo estético, urgência e contexto de decisão antes de ocupar a agenda clínica

Nutrição e follow-up:
Sustentar cadências de follow-up até uma resposta clara — agenda, adia com data ou descarta

Agendamento e comparecimento:
Agendar avaliações, confirmar, lembrar e reduzir ativamente o no-show
Registrar 100% das interações no CRM (GoHighLevel) em tempo real e enviar o relatório diário

Base:
Reativar contatos parados e orçamentos em aberto, e pedir indicações

Metas:
Primeira resposta em até 5 minutos, 100% dos leads contatados no mesmo dia, taxa de agendamento
de 15% e comparecimento acima de 70%

Remuneração:
Salário fixo (CLT) + prêmio por comparecimento qualificado e por venda originada, sem teto e sem
percentual sobre vendas

Benefícios:
Vale-transporte
Plano de saúde
Gympass
Tratamentos Beauty Smile e desconto em procedimentos para familiares, conforme política interna
Formação em vendas com uma das principais consultorias comerciais do país, com aula semanal ao vivo
Benefícios válidos após o período de experiência (3 meses)

Obrigatórios:
Ensino médio completo
Mínimo de 1 ano em atendimento, vendas, recepção ou relacionamento com cliente
Excelente comunicação escrita — a função vende por WhatsApp
Facilidade com tecnologia e uso de CRM
Disponibilidade integral e presencial, de segunda a sexta
Rotina organizada e histórico de cumprir prazos

Desejáveis (contam pontos na avaliação):
Experiência em clínica odontológica, estética ou saúde
Venda de ticket médio ou alto
GoHighLevel, Clinicorp ou CRMs similares
Experiência como SDR, pré-vendas, social seller ou inside sales
Instagram como canal de relacionamento
Superior cursando ou completo

Carreira:
Trilha definida antes da contratação: SDR → Jornada do paciente → Expansão comercial →
Coordenação Comercial ou Closer

Processo seletivo:
Perguntas objetivas na inscrição, avaliação online com situações do dia a dia e um caso prático
de atendimento por WhatsApp, e entrevista.

Candidatura: rh.beautysmile.com.br/vagas/sdr-relacionamento-pre-vendas
````

Tipo de contrato: CLT (Efetivo) · Horário: segunda a sexta, das 9h às 19h, com 1h12 de intervalo
(44h semanais), com compensação do sábado · Local: Rua Desembargador Eliseu Guilherme, 53 — Paraíso.

### 12.2 · LinkedIn

*Gancho nas duas primeiras linhas, antes do «ver mais». Sem negrito.*

````
A pessoa que manda "quanto custa?" no WhatsApp carrega aquele incômodo há anos.

Ela não quer uma tabela. Quer ser respondida rápido, por alguém que entenda o que está por trás
da pergunta — e que a ajude a dar o próximo passo sem pressão.

A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com laser Fotona
LightWalker. Estamos contratando a pessoa que cuida desse primeiro contato.

A vaga:
— Consultor(a) de Relacionamento e Pré-vendas (SDR), presencial no Paraíso, São Paulo
— CLT, fixo + prêmio por comparecimento e venda originada, sem teto
— Leads de WhatsApp, Instagram, campanhas e indicação, com GoHighLevel e Clinicorp
— Você agenda; o fechamento é do dentista

Você trabalha ao lado do dentista que conduz o fechamento, com formação comercial semanal ao vivo
e trilha de carreira definida antes da contratação: até Coordenação Comercial ou Closer.

Procuro quem já atendeu ou vendeu por escrito, com volume, e sabe sustentar follow-up sem
constrangimento e sem empurrar ninguém.

Se for você, ou se conhece alguém: rh.beautysmile.com.br/vagas/sdr-relacionamento-pre-vendas

#sdr #prevendas #insidesales #vagasp #relacionamentocomcliente
````

### 12.3 · Grupos de WhatsApp

*Sintaxe nativa do WhatsApp: asterisco simples é negrito, underscore é itálico, link como URL crua.*

````
*VAGA — SDR / Pré-vendas (CLT, presencial SP)*

Clínica de odontologia estética no Paraíso procura quem cuide do primeiro contato com os
pacientes: responder rápido, entender o que a pessoa procura e levá-la até a avaliação.

*O trabalho*
- Atender leads de WhatsApp, Instagram e campanhas
- Qualificar, fazer follow-up e agendar avaliações
- Confirmar e reduzir faltas na agenda
- Registrar tudo no CRM

*Precisa ter*
- 1 ano em atendimento, vendas, recepção ou relacionamento
- Escrita excelente no WhatsApp
- Disponibilidade presencial, seg a sex, 9h às 19h

*Oferecemos*
- CLT: fixo + prêmio por resultado, sem teto
- VT, plano de saúde, Gympass, tratamentos com desconto
- Formação semanal em vendas com consultoria

_Trilha de carreira até Coordenação Comercial ou Closer._

Candidatura: https://rh.beautysmile.com.br/vagas/sdr-relacionamento-pre-vendas
````

> ⚠ O link só funciona depois que a vaga for **publicada**. Não divulgue antes.

{{CHECKLIST}}

## 14 · Teste prático

Não há teste prático separado. O **caso aberto é o próprio work-sample** desta função: a entrega
são as três partes escritas no campo — a mensagem ao lead, o follow-up e a resposta à objeção —, que a IA lê inteira e o RH consegue abrir no
scorecard. Por isso o caso aberto não precisa da ressalva «a IA não abre link» que as vagas de
marketing têm.

{{CRITERIOS}}

{{DIFERENCAS}}
