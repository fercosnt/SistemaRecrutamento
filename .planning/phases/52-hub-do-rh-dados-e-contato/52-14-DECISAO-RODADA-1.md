# 52-14 — decisões do operador sobre o 52-REVIEW-PORTAO-1 (rodada de conserto 1)

Data: 2026-10-11. Respondido pelo operador no /gsd-execute-phase 52 (AskUserQuestion), depois que o
orquestrador conferiu o CR-01 no código vivo (`BigFiveQuestionnaireScreen.tsx:351` nasce `useState({})`,
`SjtCasoAbertoScreen.tsx:128` nasce `useState('')`; o único chamador de `loadResposta` em
`src/features/avaliacao` é `RedacaoEditorScreen.tsx:186`).

Revisão: `52-REVIEW-PORTAO-1.md` (commit 26a74d93) — 1 critical, 3 warning, 11 info; portão RECUSADO.

## Pergunta 1 — como consertar o CR-01 (dono 52-02)

Opções: (a) confirmar como as telas de memória; (b) fazer as duas telas relerem o rascunho; (c) tirar o botão.

**Resposta (verbatim): «Confirm like memory screens (Recommended)»**

Leitura: Big Five e Caso prático passam a seguir o ramo «memória → confirma» da D-24/D-36 — diálogo
«Sair da avaliação?» quando houver ao menos uma resposta (Big Five) ou qualquer texto (Caso prático).
A releitura do rascunho fica fora do escopo. Emenda à D-36: a lista «com rascunho» passa a ser só a Redação.

## Pergunta 2 — quais warnings entram nesta mesma rodada, antes do review -2

**Resposta (verbatim): «WR-01 Redação {} overwrite, WR-02 rehearsal snapshot, WR-03 answer key in option ids»**

- WR-01 (dono 52-02): sair da Redação antes de o rascunho terminar de carregar não pode gravar `{}` por cima.
- WR-02 (dono 52-01/52-08): a impressão digital antes/depois do `p52_ensaio.cjs` passa a cobrir `usuarios_rh`.
- WR-03 (anterior à fase): os `opcao_id` artesanais que codificam o gabarito em 9 itens SJT ativos de 7 cargos.
  Entra nesta rodada como migration ESCRITA e provada no ensaio que aborta — nenhuma escrita em PROD aqui.
  Ela atualiza resposta gravada de candidato (`scores_candidato.metadata.respostas[].opcao_id`), então o
  apply é escrita destrutiva sobre dado vivo: volta como checkpoint do operador antes de rodar, onde quer
  que entre na ordem de apply.

Os INFO do review seguem para a disposição no 52-14-SUMMARY (quem decidiu cada um).
