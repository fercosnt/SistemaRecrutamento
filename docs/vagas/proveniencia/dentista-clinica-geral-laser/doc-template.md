# Vaga — Cirurgião(ã)-Dentista, Clínica Geral

> **Aprovado pelo operador em 16/10/2026 e aplicado**: a vaga e a redação `DENT_UAU` em `20261015000101` (a vaga nasce `rascunho`), o banco em `20261015000102`. Publicar é ato separado.
> Versão 1 · 2026-10-15 · autor da vaga: Fernando Costa Neto
> Fontes: o texto de uma vaga antiga de dentista, colado pelo operador em 15/10 · as decisões dele
> na rodada de perguntas · os materiais de tratamento da clínica (`consultor-pre-vendas/Conhecimento`)
> · o banco de conhecimento `docs/conhecimento/sjt/banco-sjt-dentista.md`.

> ⚠ **As seções marcadas «gerado» saem por script** do payload
> (`docs/vagas/proveniencia/dentista-clinica-geral-laser.payload.json`), do texto do banco
> (`docs/specs/BANCO-SJT-DENTISTA-V2.md`) e do catálogo `supabase/functions/_shared/sjt-rubrica.ts`.
> Não edite à mão: mude a fonte e regere.

## Decisões

| # | Assunto | Situação |
|---|---|---|
| D1 | Papel do dentista | ✅ **Resolvida (15/10)** — executa as sessões; a avaliação, o plano e o orçamento são do Dr. Fernando |
| D2 | Experiência mínima | ✅ **Resolvida (15/10)** — sem tempo mínimo de clínica; CRO-SP obrigatório |
| D3 | Contrato | ✅ **Resolvida (15/10)** — PJ, fixo mensal, sem valores no anúncio |
| D4 | Perguntas da Etapa 1 | ✅ **Revistas (15/10)** — a partir do formulário antigo do operador (§2). A pergunta de protocolos ficou; se sair depois, a tela da vaga basta |
| D5 | Redação | ✅ **Resolvida (16/10)** — redação nova `DENT_UAU`, com o texto do formulário antigo do operador: a situação em que a pessoa superou as expectativas de um paciente (§4) |
| D6 | Rubrica da IA (§6) | ✅ **Aprovada (16/10)** |
| D7 | Knockouts (§2) | ✅ **Aprovados (16/10)** — encerram a candidatura: no CRO, «de outro estado e não pretendo me inscrever no CRO-SP» e «ainda não tenho registro ativo»; e «não, eu procurava uma vaga com harmonização orofacial ou estética facial». Quem tem CRO de outro estado e vai pedir o CRO-SP **passa** |
| D8 | Disponibilidade parcial (§2, §6) | ✅ **Aprovada (16/10)** — «apenas alguns dias ou turnos» NÃO elimina na inscrição, mas vira lacuna crítica na triagem, como no SDR |
| D9 | Banco do teste situacional (§3) | ✅ **Aprovado (16/10)** — os 6 itens e o caso foram escolhidos pelo operador (16/10), no sentido do formulário antigo: postura e comportamento; a conduta marcada como certa precisa ser conferida por um dentista |
| D10 | Critérios do caso escrito (§15) | ✅ **Aprovados (16/10)** — ⚠ só valem depois do deploy da EF `avaliar-redacao` |

## O fluxo, de ponta a ponta

**1 · Inscrição** — pública. Dados, currículo em PDF e as **10 perguntas da Etapa 1** (§2), uma
delas aberta e opcional (experiência com laser). **Três opções eliminam** (D7): duas na pergunta do
CRO e uma na de harmonização orofacial. É a única rejeição automática do funil.

**2 · Triagem** — a IA lê o currículo, as respostas da Etapa 1 e a rubrica (§6), e nada mais. **O
sistema nunca rejeita sozinho.** Não há avanço automático: o RH aprova pessoa a pessoa.

**3 · Avaliação assíncrona** — liberada a quem o RH aprovou:

| | o que é | tempo | pesa? |
|---|---|---|---|
| Teste situacional, múltipla escolha (§3) | 6 situações de postura no dia a dia, 4 alternativas embaralhadas | ~24 min | sim |
| Caso escrito (§3, §15) | passo a passo, a primeira sessão de um paciente novo: antes de ele chegar, recepção, condução, encerramento e o dia seguinte — 200 a 500 palavras | ~20 min | sim |
| Redação `DENT_UAU` (§4) | uma situação real em que superou as expectativas de um paciente — 200 a 500 palavras | ~25 min | sim |
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
| Triagem | sim | 20 (contexto — não entra no score final) |
| Teste situacional (`dentista`: 6 mc + 1 caso escrito) | sim | 35 |
| Redação `DENT_UAU` | sim | 15 |
| Big Five | não | — |
| Cognitivo | não, e `aplica_cognitivo = false` | — |
| Entrevista | sim | 30 |

{{RUBRICA}}

{{PERFIL}}

## 12 · Textos de divulgação

### 12.1 · Catho

*Texto puro. Título de busca: «Cirurgião-Dentista Clínico Geral». Campo de salário: «A combinar» —
sem valores.*

````
Cirurgião(ã)-Dentista — Clínica Geral (PJ, presencial)

A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com o laser Fotona
LightWalker: odontologia sem dor, sem trauma e minimamente invasiva, no Paraíso, em São Paulo.
Buscamos um(a) cirurgião(ã)-dentista para a clínica geral de adultos.

O papel:
Executar os tratamentos e os protocolos de laser da clínica. A avaliação do paciente e a
apresentação do plano ficam com o Dr. Fernando; você conduz as sessões, acompanha a evolução e
orienta o paciente.

Atividades:
Consultas e tratamentos preventivos e corretivos em adultos, seguindo o protocolo da clínica
Protocolos com laser Fotona, após treinamento no Centro de Excelência Beauty Smile
Acompanhamento da evolução dos tratamentos, com qualidade e segurança
Orientação ao paciente sobre cuidados preventivos e higiene
Biossegurança e prontuário completo
Trabalho integrado com a equipe multidisciplinar

Obrigatórios:
Graduação em Odontologia
Inscrição ativa no CRO-SP
Experiência em clínica geral com adultos (sem tempo mínimo)
Disponibilidade presencial, de segunda a sexta
Experiência com laser NÃO é exigida: a clínica treina

Desejáveis (contam pontos):
Especialização em odontologia
Clínicas multidisciplinares de alto padrão
Laser, escaneamento 3D ou radiologia digital
Cursos em laser, odontologia digital ou minimamente invasiva

Contrato e benefícios:
PJ, com valor fixo mensal e CNPJ ativo
Capacitação nos protocolos de laser no Centro de Excelência Beauty Smile
Plano de saúde, Wellhub, tratamentos Beauty Smile e desconto para familiares, cursos internos

A clínica não faz harmonização orofacial nem estética facial.

Processo seletivo: perguntas objetivas na inscrição, avaliação online com situações clínicas e
um caso clínico escrito, redação e entrevista.

Candidatura: rh.beautysmile.com.br/vagas/dentista-clinica-geral-laser
````

Tipo de contrato: PJ · Horário: segunda a sexta, das 9h às 19h · Local: Rua Desembargador Eliseu
Guilherme, 53 — Paraíso.

### 12.2 · LinkedIn

*Gancho nas duas primeiras linhas, antes do «ver mais». Sem negrito.*

````
Você já atendeu um paciente que dormiu na cadeira durante o tratamento periodontal?

Aqui isso é rotina. A Beauty Smile é a única clínica do Brasil que trabalha exclusivamente com o
laser Fotona LightWalker — e estamos procurando um(a) dentista para a clínica geral de adultos.

A vaga:
— Cirurgião(ã)-Dentista, clínica geral, presencial no Paraíso, São Paulo
— PJ, com valor fixo mensal
— Você executa os planos e os protocolos de laser; a avaliação é do Dr. Fernando
— Não precisa saber laser: você aprende no nosso Centro de Excelência

Procuro quem segue protocolo com rigor, explica ao paciente sem prometer o que não pode garantir,
e cuida da pessoa — não só do dente — em cada sessão.

CRO-SP ativo é obrigatório. Tempo de formado, não.

Se for você, ou se conhece alguém: rh.beautysmile.com.br/vagas/dentista-clinica-geral-laser

#odontologia #dentista #cirurgiaodentista #laser #vagasp
````

### 12.3 · Grupos de WhatsApp

*Sintaxe nativa do WhatsApp: asterisco simples é negrito, underscore é itálico, link como URL crua.*

````
*VAGA — Cirurgião(ã)-Dentista, Clínica Geral (PJ, presencial SP)*

Clínica de odontologia 100% laser no Paraíso procura dentista para clínica geral de adultos.

*O trabalho*
- Executar os tratamentos e protocolos de laser da clínica
- Avaliação e plano ficam com o Dr. Fernando
- Treinamento em laser no Centro de Excelência Beauty Smile

*Precisa ter*
- CRO-SP ativo
- Experiência em clínica geral com adultos (sem tempo mínimo)
- Disponibilidade presencial, seg a sex, 9h às 19h

*Oferecemos*
- PJ com valor fixo mensal
- Plano de saúde, Wellhub, tratamentos com desconto

_Não fazemos harmonização orofacial nem estética facial._

Candidatura: https://rh.beautysmile.com.br/vagas/dentista-clinica-geral-laser
````

> ⚠ O link só funciona depois que a vaga for **publicada**. Não divulgue antes.

{{CHECKLIST}}

## 14 · Teste prático

Não há teste prático separado. O caso escrito é o work-sample: a IA lê o texto inteiro, e o
RH abre a resposta no scorecard. Habilidade manual não se mede por escrito — se a clínica quiser
avaliá-la, o lugar é a entrevista presencial (por exemplo, acompanhando uma sessão).

{{CRITERIOS}}
