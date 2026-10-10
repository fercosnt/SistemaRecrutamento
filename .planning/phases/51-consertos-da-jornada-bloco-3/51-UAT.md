---
status: testing
phase: 51-consertos-da-jornada-bloco-3
source: [51-VERIFICATION.md]
started: 2026-10-10T06:44:47Z
updated: 2026-10-10T06:44:47Z
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
