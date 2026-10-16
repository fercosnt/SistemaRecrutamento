# Vaga — Líder de Recepção

> **Aprovado pelo operador em 16/10/2026 («aprovado pode publicar») e aplicado**: o banco
> `lider-recepcao` em `20261016000101`, a vaga em `20261016000102` (nasce `rascunho`); EF
> `avaliar-redacao` publicada com os critérios do caso no mesmo dia. **Publicar** exige o JWT de um
> usuário RH — `publish_vaga` recusa a via de apply —, então é o botão da tela `/rh/vagas`, logado.
> Versão 1 · 2026-10-16 · autor da vaga: Fernando Costa Neto
> Fontes: o descritivo antigo de Recepcionista e o formulário antigo, colados pelo operador em 16/10 ·
> as decisões dele na rodada de perguntas · `docs/conhecimento/fit-cultural/Cultura-Beauty-Smile-Para-Recrutamento.md`.

> ⚠ **As seções marcadas «gerado» saem por script** do payload
> (`docs/vagas/proveniencia/lider-recepcao.payload.json`), do texto do banco
> (`docs/specs/BANCO-SJT-LIDER-RECEPCAO-V1.md`) e do catálogo `supabase/functions/_shared/sjt-rubrica.ts`.
> Não edite à mão: mude a fonte e regere.

## Decisões

| # | Assunto | Situação |
|---|---|---|
| D1 | Liderança | ✅ **Resolvida (16/10)** — começa sozinha na recepção e monta a equipe. O banco mede responsabilidade pelo processo e o começo da liderança (dar feedback, treinar) |
| D2 | Papel comercial | ✅ **Resolvida (16/10)** — fidelização sem vender: retorno, indicação, satisfação. Orçamento e valores ficam com o Dr. Fernando e o pré-vendas |
| D3 | Experiência eliminatória | ✅ **Resolvida (16/10)** — 2 anos ou mais em recepção ou atendimento. Liderança formal conta ponto, não elimina |
| D4 | Redação | ✅ **Resolvida (16/10)** — só `C1` (melhoria de processo), ~25 min |
| D5 | Banco do teste situacional (§3) | ✅ **Aprovado (16/10)** — 6 de uma lista de 12, e o caso, escolhidos pelo operador; o texto das alternativas aprovado junto |
| D6 | Horário | ✅ **Aprovado (16/10)** como proposto — o descritivo dizia «horário comercial»; ficou o do SDR: segunda a sexta, 9h às 19h, 1h12 de intervalo, 44h com compensação do sábado. Se for outro, muda `sobre_cargo`, `jornada_trabalho`, a pergunta 1 e os textos de divulgação |
| D7 | Salário no anúncio | ✅ **Aprovado (16/10)** — como no SDR, o anúncio diz «valores apresentados na entrevista». A faixa R$ 3.000–4.000 fica gravada no banco, que não a exibe a ninguém |
| D8 | Benefícios | ✅ **Aprovado (16/10)** como proposto — a lista do SDR (vale-transporte, plano de saúde, Wellhub, tratamentos e desconto para familiares, cursos; após 3 meses), **sem vale-refeição**. Se o VR entrar depois, muda `beneficios` e os textos de divulgação |
| D9 | Knockout (§2) | ✅ **Aprovado (16/10)** — «Tenho disponibilidade apenas para trabalho remoto» encerra a candidatura na inscrição, como no SDR. Disponibilidade parcial NÃO elimina na inscrição: vira lacuna crítica na triagem |
| D10 | Perguntas da Etapa 1 (§2) | ✅ **Aprovadas (16/10)** — 9 perguntas, 1 aberta e opcional, a partir do formulário antigo |
| D11 | Rubrica da IA (§6) | ✅ **Aprovada (16/10)** |
| D12 | Critérios do caso escrito (§15) | ✅ **Aprovados (16/10)** — EF `avaliar-redacao` publicada no mesmo dia; o bundle baixado de volta é idêntico ao disco |

## O fluxo, de ponta a ponta

**1 · Inscrição** — pública. Dados, currículo em PDF e as **9 perguntas da Etapa 1** (§2), uma delas
aberta e opcional. **Uma opção elimina** (D9): só trabalho remoto. É a única rejeição automática do
funil.

**2 · Triagem** — a IA lê o currículo, as respostas da Etapa 1 e a rubrica (§6), e nada mais. **O
sistema nunca rejeita sozinho.** Não há avanço automático: o RH aprova pessoa a pessoa.

**3 · Avaliação assíncrona** — liberada a quem o RH aprovou:

| | o que é | tempo | pesa? |
|---|---|---|---|
| Teste situacional, múltipla escolha (§3) | 6 situações do dia a dia da recepção, 4 alternativas embaralhadas | ~24 min | sim |
| Caso escrito (§3, §15) | passo a passo, a jornada de uma paciente nova com medo de dentista, da marcação ao dia seguinte — 200 a 500 palavras | ~20 min | sim |
| Redação `C1` (§4) | uma melhoria de processo que a pessoa propôs e implementou — 200 a 500 palavras | ~25 min | sim |
| Big Five | 116 itens | ~15 min | **não** — contexto, com devolutiva ao candidato |

**4 · Entrevista** — o roteiro sai do perfil ideal (§11).

**5 · Decisão final** — humana.

**Total pedido ao candidato antes de falar com alguém: ~1h25.**

{{PESOS}}

{{ANUNCIO}}

{{PERGUNTAS}}

{{SJT}}

{{REDACAO}}

## 5 · Quais avaliações entram

| Instrumento | Obrigatório | Peso |
|---|---|---|
| Triagem | sim | 25 (contexto — não entra no score final) |
| Teste situacional (`lider-recepcao`: 6 mc + 1 caso escrito) | sim | 30 |
| Redação `C1` | sim | 20 |
| Big Five | não | — |
| Cognitivo | não, e `aplica_cognitivo = false` | — |
| Entrevista | sim | 25 |

{{RUBRICA}}

{{PERFIL}}

## 12 · Textos de divulgação

### 12.1 · Catho

*Texto puro. Título de busca: «Recepcionista Líder» ou «Líder de Recepção». Campo de salário: «A
combinar» — sem valores.*

````
Líder de Recepção (CLT, presencial)

A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com o laser Fotona
LightWalker: odontologia sem dor, sem trauma e minimamente invasiva, no Paraíso, em São Paulo.
Buscamos alguém que já seja referência em recepção para responder pela recepção da clínica.

O papel:
Cuidar de cada paciente da chegada à saída, organizar a agenda e o padrão de atendimento, e treinar
e liderar as próximas recepcionistas conforme a clínica cresce. Não é vaga de vendas: orçamento e
valores ficam com o Dr. Fernando e a equipe de pré-vendas.

Atividades:
Recepção de pacientes, telefone, WhatsApp e e-mail
Agenda: marcação, confirmação, encaixes e redução de faltas
Cadastro, termos e exames dos pacientes, com cuidado de LGPD
Recebimento de pagamentos, fechamento de caixa e estoque da recepção
Retorno dos pacientes, satisfação, reclamações e programa de indicação
Checklists e padrão de atendimento da recepção

Obrigatórios:
Ensino médio completo
Pelo menos 2 anos em recepção ou atendimento ao cliente
Disponibilidade presencial, de segunda a sexta

Desejáveis (contam pontos):
Recepção de clínica odontológica ou da área da saúde
Clinicorp ou outro sistema de agenda de clínica
Ter treinado colegas ou organizado a rotina de uma equipe

Contrato e benefícios:
CLT, salário fixo
Vale-transporte, plano de saúde, Wellhub, tratamentos Beauty Smile e desconto para familiares,
cursos internos

Processo seletivo: perguntas objetivas na inscrição, avaliação online com situações do dia a dia,
um caso escrito, redação e entrevista.

Candidatura: rh.beautysmile.com.br/vagas/lider-recepcao
````

Tipo de contrato: CLT · Horário: segunda a sexta, das 9h às 19h · Local: Rua Desembargador Eliseu
Guilherme, 53 — Paraíso.

### 12.2 · LinkedIn

*Gancho nas duas primeiras linhas, antes do «ver mais». Sem negrito.*

````
A primeira e a última impressão de uma clínica acontecem na recepção.

Na Beauty Smile, muitos pacientes chegam com medo de dentista — e quem os recebe faz diferença. Estamos
procurando alguém que já seja referência em recepção para responder pela nossa.

A vaga:
— Líder de Recepção, presencial no Paraíso, São Paulo
— CLT, segunda a sexta
— Você cuida da agenda, do padrão de atendimento e do retorno dos pacientes
— Começa como a pessoa da recepção e treina quem vier depois
— Não é vaga de vendas

Procuro quem avisa o atraso antes de o paciente perguntar, assume o erro quando é seu e muda o
processo que não funciona.

Pelo menos 2 anos em recepção ou atendimento. Clínica conta pontos; cargo de líder, não precisa ter
tido.

Se for você, ou se conhece alguém: rh.beautysmile.com.br/vagas/lider-recepcao

#recepcao #recepcionista #atendimento #clinica #vagasp
````

### 12.3 · Grupos de WhatsApp

*Sintaxe nativa do WhatsApp: asterisco simples é negrito, underscore é itálico, link como URL crua.*

````
*VAGA — Líder de Recepção (CLT, presencial SP)*

Clínica de odontologia 100% laser no Paraíso procura quem já é referência em recepção.

*O trabalho*
- Receber os pacientes, agenda, confirmações e WhatsApp
- Caixa, documentos e estoque da recepção
- Retorno e satisfação dos pacientes (não é vaga de vendas)
- Treinar as próximas recepcionistas

*Precisa ter*
- Ensino médio completo
- 2 anos ou mais em recepção ou atendimento
- Disponibilidade presencial, seg a sex, 9h às 19h

*Oferecemos*
- CLT, salário fixo
- Plano de saúde, VT, Wellhub, tratamentos com desconto

Candidatura: https://rh.beautysmile.com.br/vagas/lider-recepcao
````

> ⚠ O link só funciona depois que a vaga for **publicada**. Não divulgue antes. Se D6 ou D8 mudarem,
> estes três textos mudam junto.

{{CHECKLIST}}

## 14 · Teste prático

Não há teste prático separado. O caso escrito é o work-sample: a IA lê o texto inteiro, e o RH abre
a resposta no scorecard. O jeito de receber um paciente e de falar ao telefone não se mede por
escrito — se a clínica quiser avaliá-lo, o lugar é a entrevista presencial (por exemplo, uma
simulação de chegada de paciente ou de ligação).

{{CRITERIOS}}
