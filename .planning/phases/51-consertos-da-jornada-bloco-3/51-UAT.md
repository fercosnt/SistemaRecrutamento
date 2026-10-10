---
status: complete
phase: 51-consertos-da-jornada-bloco-3
source: [51-VERIFICATION.md]
started: 2026-10-10T06:44:47Z
updated: 2026-10-10T17:07:18.532Z
---

## Current Test

[testing complete]

## Tests

### 1. JORN-44 — «Ir ao painel» na lista de avaliações
expected: «Ir ao painel» no cabeçalho ao lado de «Sair»; no tudo-concluído, «Ir ao painel» abaixo da frase; os dois levam ao painel
result: pass
evidence: "Candidatura 8101c56f (+claude6): «Ir ao painel» no cabeçalho ao lado de «Sair»; depois de concluir SJT, redação e caso, o estado «Tudo concluído! Você concluiu todas as avaliações desta etapa. Acompanhe o andamento pelo seu painel.» com «Ir ao painel» abaixo; os dois levam ao painel."

### 2. JORN-46 + G2 — navegação dentro das provas e a lista depois de concluir
expected: Dentro da redação, SJT, caso prático, Big Five, devolutiva e prova cognitiva, o botão diz «Voltar às avaliações» e leva à lista; com a etapa já avançada, «Ir ao painel» leva ao painel. Depois de concluir uma prova, a lista mostra o card dela como concluído (não «Começar avaliação»), sem esperar 5 minutos
result: skipped
reason: "Deferred follow-up: issue — ADIAR para a fase nova (G-51-OP1), não consertar na 51."
reported: |
  issue — ADIAR para a fase nova (G-51-OP1), não consertar na 51.
  O que passou: «Voltar às avaliações» nos estados em que existe (inclusive a devolutiva, aberta pela URL direta) leva à lista; G2: depois de enviar cada prova, o card na LISTA de avaliações aparecia concluído na hora.
  O que falta: (d) nenhuma tela de prova tem botão de saída DURANTE o fluxo; o botão só existe nos estados de borda (SJT MC, caso, redação, Big Five, devolutiva, cognitiva). No SJT MC as respostas ficam só na memória da tela, então o botão precisa de confirmação de perda, que é decisão de produto. (e) «Tempo sugerido: 00:04» é cronômetro progressivo (SjtMultiplaEscolhaScreen.tsx:147-151). (f) A devolutiva do Big Five só abre no redirecionamento após o envio (BigFiveQuestionnaireScreen.tsx:394), sem caminho para reabrir.
  Correção: o 7(a) NÃO é deste teste. O G2 é o card na lista de avaliações e passou; o 7(a) é o card do PAINEL do candidato.
severity: major

### 3. JORN-45 — «Ver respostas» no hub do RH
expected: «N avaliações respondidas» + «Ver respostas» abre o detalhe no lugar; Big Five diz «Concluído» ou «Não fez», sem número; no caso prático, o texto do candidato ao lado das citações
result: pass
note: "pass no que o teste pede (Ver respostas no lugar; Big Five «Concluído» sem número; texto do candidato no caso). Os defeitos 7(a), (b) e (c) e os pedidos de produto ficam na fase nova, já registrados no G-51-OP1, não como falha da 51."

### 4. JORN-48 — nomes distintos dos instrumentos cognitivos
expected: No hub, «Prova cognitiva» (ou «Não se aplica a esta vaga») logo acima de «Raciocínio lógico (Matrizes)»; no container, o card «Prova cognitiva»; na tela do Raven, o título «Raciocínio lógico (Matrizes)». As 15 vagas têm aplica_cognitivo=false: «Prova cognitiva» mostra «Não se aplica» para todas sem faixa
result: pass
evidence: |
  Teste 4: pass, com uma parte não observável.
  - Hub (8101c56f): «Prova cognitiva — Não se aplica a esta vaga / Esta vaga não inclui este instrumento.» logo acima de «Raciocínio lógico (Matrizes)».
  - Tela do Raven (8e4bb7a0, +claude7, /candidato/avaliacao-raciocinio/8e4bb7a0…): título «Raciocínio lógico (Matrizes)», com «Item 1 de 60 · Série A».
  - Card «Prova cognitiva» no container: NÃO OBSERVÁVEL em PROD. Só aparece com vagas.aplica_cognitivo = true, e as 15 vagas estão false (conferido no banco). Rótulo conferido no código (AvaliacaoContainer.tsx:124).

### 5. JORN-47 — notas de entrevista obrigatórias
expected: No workspace de entrevista com as notas vazias, «Salvar avaliação» desabilitado e a mensagem «Escreva as notas do gestor para salvar a avaliação.»
result: pass
evidence: "Workspace de entrevista da d31c78bb (cand1, entrevista_online), aba «Avaliação da entrevista»: com as notas vazias, «Salvar avaliação» desabilitado e a mensagem «Escreva as notas do gestor para salvar a avaliação.»; ao digitar a mensagem some, ao apagar volta. O botão segue desabilitado com texto por causa da trava independente «Nenhuma análise vigente: analise a transcrição antes de registrar a avaliação.», que é anterior ao JORN-47; por isso a habilitação total não é observável nesta candidatura. Não salvei."

### 6. JORN-49 — recibo de exclusão no ar
expected: Em `/candidato/privacidade` (e no e-mail de recibo, EF v15): não lista «endereço» inteiro como apagado; a faixa etária fica «para relatório agregado»; a sigla do estado (UF) fica «porque o cadastro exige uma UF válida»; a disponibilidade foi / vai ser apagada
result: pass
evidence: |
  Teste 6: pass na prévia da tela, com o e-mail não observado.
  Em /candidato/privacidade (conta +claude7), a prévia «O que sai e o que fica», visível antes do botão:
  - «Os seus dados de cadastro: Nome, e-mail, telefone, CPF, data de nascimento, gênero, CEP, rua, número, complemento, bairro, cidade, redes sociais e disponibilidade vão ser apagados do seu cadastro.» Não lista «endereço» inteiro nem a UF. Os outros «endereço» da página são «Endereço de IP» (registros de acesso) e «O seu endereço de e-mail nos registros de envio», ambos corretos.
  - Item «Estado e faixa etária» (LGPD, Art. 16, IV): «Fica guardada a sua faixa etária, sem vínculo com o seu nome, para relatório agregado. Fica guardada também a sigla do seu estado (UF), sem vínculo com o seu nome, porque o cadastro exige uma UF válida.»
  E-mail do recibo (EF v15, tempo passado): NÃO OBSERVADO. Exige executar uma exclusão real, que é irreversível, e não fiz. O texto no passado sai do mesmo reciboExclusao.generated.ts (linhas 120 e 365).
cross_check: "Conferido no repositório em 2026-10-10: o e-mail lê supabase/functions/_shared/reciboExclusao.ts (import em executar-direito-titular/helpers.ts:32), não o .generated.ts do front; as 46 linhas texto_futuro/texto_passado dos dois arquivos são idênticas, e as linhas 120 e 365 do arquivo da EF trazem os textos no passado. Que a v15 publicada carregue este arquivo é afirmação do 51-24-SUMMARY, não reconferida aqui."

## Summary

total: 6
passed: 5
issues: 0
pending: 0
skipped: 1
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
  detail: ".planning/DECISAO-2026-10-10-hub-rh-dados-e-contato.md — decisão verbatim, alertas considerados pelo operador, fonte de cada dado (tabelas/colunas), pontos de desenho e os defeitos a–f com linha de código; achados do 51-17 referenciados ao 51-17-SUMMARY.md"
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

## Deferred Follow-Ups

- test: 2
  idea: "issue — ADIAR para a fase nova (G-51-OP1), não consertar na 51. (d) botão de saída DURANTE o fluxo das provas (SJT MC precisa de confirmação de perda — decisão de produto); (e) «Tempo sugerido» é cronômetro progressivo (SjtMultiplaEscolhaScreen.tsx:147-151); (f) devolutiva do Big Five sem caminho para reabrir (BigFiveQuestionnaireScreen.tsx:394). Texto integral no teste 2."
  deferred_at: 2026-10-10
  joins: G-51-OP1
- test: 4
  idea: "Observações para a G-51-OP1 (não são falha deste teste): a tela do Raven não tem botão de saída (mesma família do achado (d) do teste 2) e usa fundo branco liso, diferente do vidro do resto da área do candidato. Confirmar se o fundo neutro é deliberado."
  finding: "NÃO é deliberado: 51-UI-REVIEW.md (pilar Visuals 2/4 e WARNING na linha 72) registra AvaliacaoRavenScreen.tsx:204 como div solto, sem BackgroundImage/ScreenShell/navbar; os Glass variant=white (bg-white/15) somem no body branco. Mesmo relatório (linha 62): o subtitulo de instruções do Raven (AvaliacaoRavenScreen.tsx:41) é definido e nunca renderizado."
  deferred_at: 2026-10-10
  joins: G-51-OP1
- test: 5
  idea: |
    Observações para a G-51-OP1 (não são falha deste teste):
    - Copy com jargão interno: subtítulo «BARS sliders 1–5 — notas_humanas. A decisão é sempre humana.»
    - Sliders BARS vêm pré-marcados em 3/5: dá para salvar notas que o entrevistador não escolheu (viés de ancoragem). Decidir se começam vazios.
    - Menu lateral marca «Dashboard» como ativo dentro de /rh/candidato/<id>/entrevista.
    - «Gerado pelo modelo modelo não registrado» também na candidatura d31c78bb: o defeito (b) não é isolado.
  deferred_at: 2026-10-10
  joins: G-51-OP1
