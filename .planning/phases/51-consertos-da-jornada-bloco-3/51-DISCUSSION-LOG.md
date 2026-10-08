# Phase 51: Consertos da Jornada — Bloco 3 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-07
**Phase:** 51-consertos-da-jornada-bloco-3
**Areas discussed:** Revisão sempre disponível, Os dois instrumentos cognitivos, Caminho do hub do RH, Notas de entrevista e recibo, Navegação do candidato, Ordem de entrega, Prova de aceite

---

## Revisão sempre disponível (JORN-42)

| Pergunta | Opções | Escolha |
|---|---|---|
| Alcance | Todas, knockout incluído · Só rejeições humanas | **Todas, knockout incluído** |
| Procedente de triagem/knockout | Volta à etapa da rejeição · Sempre para decisao_final · RH escolhe | **Volta à etapa da rejeição** |
| Rejeitadas antes do conserto | Botão sem e-mail · Só novas · Botão + e-mail | **Botão, sem e-mail** |
| E-mail de rejeição menciona o direito | Sim, com link · Não | **Sim, com link** |
| Quem responde | Mesma fila e regra · Só admin | **Mesma fila, mesma regra** |
| Prazo para pedir | Sem prazo · Prazo fixo | **Sem prazo** |
| Knockout revertido | Não reaplica · Reaplica se resposta igual | **Não reaplica** |
| Vaga inativa/arquivada | Reabre mesmo assim · Não reabre | **Reabre mesmo assim** |
| Repetição | Uma por rejeição · Sem limite | **Uma por rejeição** |
| Encerramentos não-rejeição | Só rejeitado · Incluir finalizado | **Só rejeitado** |
| Contexto do RH no knockout | Pergunta, resposta e regra · Só link | **Pergunta, resposta e regra** |
| SLA e selo | Mesmo SLA com selo · Sem selo | **Mesmo SLA, com selo de origem** |

**Notes:** revoga a D-20 da 48 (decisão do operador de 29/09).

---

## Os dois instrumentos cognitivos (JORN-43, JORN-48)

| Pergunta | Opções | Escolha |
|---|---|---|
| Entrada do Raven | Card no painel · Card na lista · Os dois | **Card no painel** |
| Aviso ao liberar | Não (presencial) · E-mail | **Não** |
| Nomes | «Prova cognitiva» × «Raciocínio (Matrizes)» · «Cognitiva — questões/matrizes» · Você decide | **«Prova cognitiva» × «Raciocínio lógico (Matrizes)»** |
| Seção de instrumento que a vaga não aplica | «Não se aplica a esta vaga» · Some · Só renomeia | **«Não se aplica a esta vaga»** |

---

## Caminho do hub do RH (JORN-45)

| Pergunta | Opções | Escolha |
|---|---|---|
| Destino | Expande no hub · Workspace de entrevista · Consolidação | **Expande no hub** |
| Texto integral do caso prático | Só caso prático · Caso + portfólio · Não | **Só caso prático** |
| Alcance do texto | Onde houver citações · Só hub | **Onde houver citações** |
| Acesso | Restrito a sjt_caso_aberto com review · RPC DEFINER · Você decide | **Restrito, com review bloqueante** |
| Big Five no detalhe | Concluído/Não fez · Fatores | **Concluído/Não fez** |
| Texto «para revisão» | Reescrever · Manter | **Reescrever** |

---

## Notas de entrevista e recibo (JORN-47, JORN-49)

| Pergunta | Opções | Escolha |
|---|---|---|
| Notas | Obrigatórias nos dois · Opcionais nos dois | **Obrigatórias nos dois** |
| Mínimo | Igual ao servidor (não vazio) · 50 caracteres | **Igual ao servidor** |
| Recibo | Diz o que sai e o que fica · Só tira «endereço» | **Diz o que sai e o que fica** |
| Recibos já emitidos | Ficam · Reemitir | **Ficam como emitidos** |

---

## Navegação do candidato (JORN-44, JORN-46)

| Pergunta | Opções | Escolha |
|---|---|---|
| Rótulos | «Voltar às avaliações» × «Ir ao painel» · Manter | **«Voltar às avaliações» × «Ir ao painel»** |
| Saída para o painel na lista | Cabeçalho sempre + destaque ao concluir · Só cabeçalho · Só concluído | **Cabeçalho sempre + destaque ao concluir** |

**Notes:** `RedacaoEditorScreen.tsx:189` já navega para a lista — registrado como fato a remedir (D-24).

---

## Ordem de entrega e prova de aceite

| Pergunta | Opções | Escolha |
|---|---|---|
| Ordem | Telas primeiro, JORN-42 depois · JORN-42 primeiro · Tudo junto | **Telas primeiro, JORN-42 depois** |
| Prova | Banco + sessão real no JORN-42 · Nova UAT · Só banco | **Banco + sessão real no JORN-42** |
| Knockout revertido | Inscrição real de teste · Só smoke | **Inscrição real de teste** |

## Claude's Discretion

- Mecanismo do JORN-42 (gravar toda rejeição em `decisao_final` × pedido sem linha em `decisao_final`)
- Onde guardar a etapa da rejeição para a reabertura
- Redação final dos rótulos e textos; divisão em planos e ondas

## Deferred Ideas

- Portfólio visível ao RH; Parte B do todo `49-producoes-do-candidato-sem-leitor-de-rh`
- Aviso por e-mail ao liberar o Raven
- Prazo para pedir revisão; revisão para «finalizado sem contratação»
- JORN-50..52
