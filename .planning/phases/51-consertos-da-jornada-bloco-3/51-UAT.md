---
status: testing
phase: 51-consertos-da-jornada-bloco-3
source: [51-VERIFICATION.md]
started: 2026-10-10T06:44:47Z
updated: 2026-10-10T15:50:15Z
---

## Current Test

number: 1
name: JORN-44 — «Ir ao painel» na lista de avaliações
expected: |
  Em `/candidato/avaliacao/<id>` de uma candidatura em avaliação assíncrona: «Ir ao painel» no cabeçalho ao lado de «Sair»;
  no estado «você concluiu todas as avaliações», o botão «Ir ao painel» abaixo da frase; os dois levam ao painel.
awaiting: user response

## Tests

### 1. JORN-44 — «Ir ao painel» na lista de avaliações
expected: «Ir ao painel» no cabeçalho ao lado de «Sair»; no tudo-concluído, «Ir ao painel» abaixo da frase; os dois levam ao painel
result: [pending]

### 2. JORN-46 + G2 — navegação dentro das provas e a lista depois de concluir
expected: Dentro da redação, SJT, caso prático, Big Five, devolutiva e prova cognitiva, o botão diz «Voltar às avaliações» e leva à lista; com a etapa já avançada, «Ir ao painel» leva ao painel. Depois de concluir uma prova, a lista mostra o card dela como concluído (não «Começar avaliação»), sem esperar 5 minutos
result: [pending]

### 3. JORN-45 — «Ver respostas» no hub do RH
expected: «N avaliações respondidas» + «Ver respostas» abre o detalhe no lugar; Big Five diz «Concluído» ou «Não fez», sem número; no caso prático, o texto do candidato ao lado das citações
result: [pending]

### 4. JORN-48 — nomes distintos dos instrumentos cognitivos
expected: No hub, «Prova cognitiva» (ou «Não se aplica a esta vaga») logo acima de «Raciocínio lógico (Matrizes)»; no container, o card «Prova cognitiva»; na tela do Raven, o título «Raciocínio lógico (Matrizes)». As 15 vagas têm aplica_cognitivo=false: «Prova cognitiva» mostra «Não se aplica» para todas sem faixa
result: [pending]

### 5. JORN-47 — notas de entrevista obrigatórias
expected: No workspace de entrevista com as notas vazias, «Salvar avaliação» desabilitado e a mensagem «Escreva as notas do gestor para salvar a avaliação.»
result: [pending]

### 6. JORN-49 — recibo de exclusão no ar
expected: Em `/candidato/privacidade` (e no e-mail de recibo, EF v15): não lista «endereço» inteiro como apagado; a faixa etária fica «para relatório agregado»; a sigla do estado (UF) fica «porque o cadastro exige uma UF válida»; a disponibilidade foi / vai ser apagada
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

<!-- G-51-OP1 é DECISÃO DO OPERADOR para uma FASE NOVA depois deste UAT — não é gap de
     fechamento da 51. Não tem `test:` de propósito: não entra no diagnóstico/plan --gaps da 51
     e não muda o resultado de nenhum teste abaixo. Os defeitos do item 7 (teste 3) continuam a
     ser registrados no próprio teste 3 quando ele for respondido. -->
- gap_id: G-51-OP1
  kind: operator_decision
  target: nova fase (hub do RH), depois do UAT da 51
  status: deferred_to_new_phase
  decided_at: 2026-10-10
  severity: major
  reason: "DECISÃO DO OPERADOR (2026-10-10): «Eu quero o resultado do Big Five e quero ver todos os dados preenchidos no cadastro e inscrição da vaga. Preciso também ter o e-mail e telefone para entrar em contato fácil, com um botão de enviar e-mail e, no telefone, um botão do lado de chamar no WhatsApp.»"
  scope: |
    Escopo da fase nova (hub do RH):
    1. Contato: e-mail com «Enviar e-mail» (mailto) e celular com «Chamar no WhatsApp» (wa.me, número normalizado).
    2. Dados completos do cadastro (candidatos: nome, e-mail, CPF, celular, nascimento, gênero, endereço completo, LinkedIn, Instagram, como conheceu).
    3. Todas as respostas da inscrição (respostas_formulario + perguntas da vaga, em ordem, eliminatória destacada).
    4. Big Five: resultado por dimensão + texto da devolutiva que o candidato viu. REVOGA a D-31 da 49 e a D-32 da 51 por decisão do operador; a RNF-07a (nunca rejeitar automaticamente por score) continua.
    5. SJT múltipla escolha: pergunta, alternativas e escolhida.
    6. Caso aberto: melhorar a apresentação do texto.
    7. Defeitos do teste 3: (a) painel do candidato desatualizado depois de concluir tudo; (b) «modelo modelo não registrado»; (c) «3 avaliações respondidas» duplicado.
    Ponto de desenho: registrar o acesso do RH aos dados pessoais, como no currículo.
    Juntar à fase os gaps já anotados: botão de saída dentro das provas, rótulo «Tempo sugerido», devolutiva sem caminho de reabertura, Select branco sobre branco, LoginCandidatoPage que ignora a sessão aberta, botão «voltar ao dashboard» na área do candidato, cor do «Agradecemos seu interesse», motivo/justificativa no diálogo de revisão humana, nomes RH2/RH3 trocados no cadastro.
  revokes: ["49-CONTEXT D-31", "51-CONTEXT D-32"]
  keeps: ["RNF-07a"]
