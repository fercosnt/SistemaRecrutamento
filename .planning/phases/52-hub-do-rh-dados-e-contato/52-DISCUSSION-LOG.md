# Phase 52: Hub do RH — Dados, Contato e Avaliações do Candidato - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-10
**Phase:** 52-hub-do-rh-dados-e-contato
**Areas discussed:** Big Five no hub, Dados pessoais e registro, Contato e-mail/WhatsApp, Decisões das pendências, Organização do hub, Respostas da inscrição, «Modelo não registrado», Caso aberto e SJT MC

---

## Big Five no hub

| Option | Description | Selected |
|--------|-------------|----------|
| As 5 faixas | O que o candidato viu; não fere a UX-07 | ✓ |
| Faixa + percentil | Revoga a UX-07 para o RH; falsa precisão (normas internacionais) | |
| Só o percentil | Revoga a UX-07; vira ranking | |

| Option | Description | Selected |
|--------|-------------|----------|
| Texto integral, recolhível | «Ver devolutiva», padrão do «Ver respostas» da 51 | ✓ |
| Texto integral sempre aberto | Ocupa espaço | |

| Option | Description | Selected |
|--------|-------------|----------|
| Uma linha fixa | «descreve, não classifica; não é critério de aprovação» | ✓ |
| Sem aviso | Só o resultado | |

| Option | Description | Selected |
|--------|-------------|----------|
| Só o hub muda | Lista segue «Concluído / Não fez» | ✓ |
| Lista também mostra | D-31 cai inteira | |

---

## Dados pessoais e registro

| Option | Description | Selected |
|--------|-------------|----------|
| Atrás de «Mostrar dados pessoais» | O clique gera o registro | |
| Tudo visível direto | Mais simples | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Data + idade | «12/03/1994 (32 anos)» | ✓ |
| Só a data | | |
| Só a idade | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela de auditoria | Consultável, entra no motor de exclusão | |
| Linha de log, como no currículo | Barato, some com a retenção do log | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Recrutador ativo e admin | Recorte da Phase 50 | ✓ |
| Só admin | | |

**Notes:** registrado no CONTEXT (D-11) que uma leitura direta liberada por RLS não gera log; o dado
pessoal precisa vir por caminho de servidor que escreva a linha.

---

## Contato e-mail/WhatsApp

| Option | Description | Selected |
|--------|-------------|----------|
| Saudação curta com a vaga | Editável antes de enviar | ✓ |
| Conversa em branco | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Assunto com a vaga | Corpo em branco | ✓ |
| Em branco | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Não registra | Clique não prova contato | ✓ |
| Entra no histórico | Escrita nova no histórico | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sempre que houver o dado | Anonimizado não tem botão | ✓ |
| Esconder para rejeitados | | |

---

## Decisões das pendências

| Option | Description | Selected |
|--------|-------------|----------|
| Rascunho automático nos dois | SJT MC e Raven salvam rascunho | |
| Confirmar a perda | Diálogo Sair/Continuar | ✓ |
| Sem botão nesses dois | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Vazios, obrigatórios | Tira o viés de ancoragem | ✓ |
| Seguem em 3 | | |

| Option | Description | Selected |
|--------|-------------|----------|
| «Tempo decorrido: mm:ss» | Só o rótulo muda | ✓ |
| Tempo sugerido de verdade | Exige número por item | |
| Tirar o tempo da tela | | |

| Option | Description | Selected |
|--------|-------------|----------|
| «Avaliações concluídas — aguardando a equipe» | Sem botão; não muda status no banco | ✓ |
| Você redige o texto | | |

**Notes:** medido antes da pergunta — redação, caso aberto, Big Five e prova cognitiva já têm
rascunho; SJT MC e Raven guardam as respostas só na tela.

---

## Organização do hub

| Option | Description | Selected |
|--------|-------------|----------|
| Contato → Cadastro → Inscrição → Avaliações → IA → Histórico | Página única | |
| Contato no topo, resto como hoje | | |
| Abas | Resumo / Cadastro e inscrição / Avaliações / Histórico | ✓ |

**Recolher:** resposta livre do operador — «como vai ser em abas acredito que tudo aberto fique bom».

| Option | Description | Selected |
|--------|-------------|----------|
| Contato no cabeçalho, fora das abas | Visível em qualquer aba | ✓ |
| Na aba Cadastro | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Resumo abre primeiro | Ações de decisão ficam no Resumo | ✓ |
| Cadastro e inscrição abre primeiro | | |
| Avaliações abre primeiro | | |

---

## Respostas da inscrição

| Option | Description | Selected |
|--------|-------------|----------|
| Selo «Eliminatória» + a resposta | Sem «passou/não passou» | ✓ |
| Selo + certo/errado | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Link clicável, nova aba | Só http/https | ✓ |
| Texto puro | | |

---

## «Modelo não registrado»

| Option | Description | Selected |
|--------|-------------|----------|
| Só consertar a frase | Não preenche as 22 antigas | ✓ |
| Consertar e reanalisar | Custo de IA; substitui a análise | |

**Notes:** medido em PROD antes da pergunta (só leitura) — 22 análises sem modelo, todas de
2026-06-22 a 2026-09-22; as 4 posteriores (2026-09-27 a 2026-10-09) têm modelo. Não há regressão.

---

## Caso aberto e SJT MC

| Option | Description | Selected |
|--------|-------------|----------|
| A etiqueta que já aparece (só na escolhida) | Nada novo exposto | ✓ |
| Etiqueta de todas as alternativas | Expõe o gabarito | |
| Sem etiqueta | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Texto corrido, parágrafos preservados | Citações marcadas no texto | ✓ |
| Só trocar a cor da caixa | | |

---

## Claude's Discretion

Texto final do aviso do Big Five; forma do caminho de servidor que escreve o log; caminho de
reabertura da devolutiva; correções sem decisão de produto aberta (Raven, `SelectItem`,
«Agradecemos», login, volta ao dashboard, menu ativo, duplicação (c), motivo na revisão humana);
como corrigir os nomes RH2/RH3 (dado, não código).

## Deferred Ideas

Rascunho automático no SJT MC e no Raven; registro do contato; tabela de auditoria de acesso;
reanálise das 22 análises sem modelo.
