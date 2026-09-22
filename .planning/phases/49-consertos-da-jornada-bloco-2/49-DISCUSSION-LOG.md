# Phase 49: Consertos da Jornada — Bloco 2 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-22
**Phase:** 49-consertos-da-jornada-bloco-2
**Areas discussed:**
- Rubrica da redação (7)
- Modelo e fallback (28)
- Card e comparativo (13, 25)
- Transcrição e análises (12)
- Trilha (17, 3b)
- Achados fora da fila

**Antes das perguntas:**
- Cinco agentes só leitura mediram as premissas da fila em código e em PROD
  (`set transaction read only`), e o orquestrador conferiu as afirmações de sustentação.
- As correções foram levadas ao operador antes de qualquer pergunta, a pedido dele («leve as
  correções a mim antes de planejar»). Estão em 49-CONTEXT.md §Correções.
- `tsc` medido: 90. Varredura de portões: 282 linhas.

---

## Rubrica da redação (7)

| Pergunta | Opções | Escolhida |
|---|---|---|
| Rubrica canônica | BARS do PRD v1.1 · os 4 valores como D1–D4 | **BARS do PRD v1.1** |
| O que a tela de revisão mostra | rótulo fixo + raciocínio · só corrigir o rótulo · nome devolvido pela IA | **Rótulo fixo + raciocínio** |
| As 2 redações antigas (teste) | manter, distinguir pela versão · reavaliar · manter sem distinção | **Manter, distinguir pela versão** |

**Contexto:** a medição mostrou que a fila («travar os 4 valores») cravaria uma rubrica que
contraria o PRD binding. A rubrica «4 valores como D1–D4» nasceu na Phase 13.

---

## Modelo e fallback (28)

| Pergunta | Opções | Escolhida |
|---|---|---|
| Quando o Sonnet falha | fallback visível · sem fallback no que decide · nova tentativa, depois falha | **Fallback visível** |
| Proveniência | coluna em cada resultado · só o elo para o log | **Coluna em cada resultado** |
| Alavanca de tamanho (8000 tok ≈ 135–178 s > 110 s) | encurtar a saída · baixar o teto de candidatos · aumentar o tempo | **Baixar o teto de candidatos** |
| Resultados antigos de fallback (teste) | deixar · marcar como gpt-4o-mini · regenerar | **Deixar como estão** |
| Onde a troca aparece (multi) | tela do resultado · log de IA do admin · aviso ao admin | **Tela do resultado + log do admin** |
| Qual teto | medir e propor · 6 · 5 | **Medir e propor (volta antes do plano)** |

---

## Card e comparativo (13, 25)

| Pergunta | Opções | Escolhida |
|---|---|---|
| Célula Big Five | concluído / não fez · faixas neutras · remover | **Concluído / não fez** |
| Célula Cultura | só a nota revisada · revisada ou sugestão da IA · só o estado | **Só a nota revisada** |
| DISC e Inteligência | tirar DISC, Intel = faixa · tirar as duas · manter | **Tirar DISC; Intel = faixa** |
| Encerrada na seleção do comparativo | visível, não selecionável · oculta · selecionável sem ações | **Visível, não selecionável** |
| Onde fechar o avanço de knockout | no banco e no e-mail · só na tela | **No banco e no e-mail** |
| Destino do «Avançar» | próxima etapa real · só na triagem · tirar o botão | **Próxima etapa real** |
| População do comparativo da decisão | etapa decisao_final não encerrada · manter e excluir encerradas · manter e corrigir texto | **Etapa decisao_final, não encerrada** |

---

## Transcrição e análises (12)

| Pergunta | Opções | Escolhida |
|---|---|---|
| O que guardar (LGPD) | hash + vínculo com o log · texto na análise · só o hash | **Hash + vínculo com o log** |
| Vigente na mesma etapa | mais recente bem-sucedida · o RH escolhe · a revisada prevalece | **Mais recente bem-sucedida** |
| Cache hit cria linha? | não cria · cria marcada | **Não cria** |
| Alcance da D4 | só a entrevista · entrevista e triagem | **Só a entrevista** |
| Origem da etapa | o RH escolhe o tipo · a etapa atual no momento | **O RH escolhe o tipo** |
| Análise nova após revisão | volta a aguardar revisão · a revisada vale até nova revisão | **Volta a aguardar revisão** |
| As 6 análises existentes (teste) | marcar vigente/superadas · não tocar | **Marcar** |

**Contexto:** fato novo apresentado junto com a pergunta. O texto mascarado já fica em
`ai_call_logs` por 180 dias, com nomes e fala literais. O motor de exclusão não apaga esse log nem
as citações.

---

## Trilha (17, 3b)

| Pergunta | Opções | Escolhida |
|---|---|---|
| O que gera snapshot | tudo menos leitura e telemetria · qualquer mudança real · só decisão e ciclo | **Tudo menos leitura e telemetria** |
| 5 snapshots sem mudança (teste) | manter · marcar · apagar | **Manter** |
| 9 justificativas grudadas (8 teste, 1 real) | limpar as 9 · só as de teste · não tocar | **Limpar as 9** |

---

## Achados fora da fila

| Pergunta | Opções | Escolhidas |
|---|---|---|
| Classe 25/7 (multi) | IDOR comparativo · Kanban finalizado · UpdateStatusModal sem trilha · SJT sem rubrica | **Todas** |
| LGPD (multi) | recibo × motor · BD-9 · `candidatos(*)` na lista | **Todas** |
| Classe 28/13 (multi) | auditoria de IA perdida · percentil cru do Raven | **Todas** |
| BD-9: o titular vê a justificativa da decisão? | não, a trilha deixa de copiar · sim, rever o BD-9 · levar ao Encarregado | **Não: a trilha deixa de copiar** |
| Conserto do recibo | o motor passa a apagar · o recibo diz a verdade · as duas | **O motor passa a apagar** |
| As 4 cópias BD-9 no histórico (3 teste, 1 real) | limpar as 4 com checkpoint · só teste · não tocar | **Limpar as 4 com checkpoint** |

**Contexto:** o escopo passou de 8 para 17 itens. O operador foi avisado antes de confirmar
«pode escrever o CONTEXT».

---

## Claude's Discretion

Onde a rubrica mora (EF × versão de prompt), few-shot, enforcement de `dimension_name`,
taxonomia do `error_code` e detecção de truncamento, significado de `success` no fallback, forma
da consulta da lista, desenho da exceção da trava D-35, cálculo do hash, mecanismo do snapshot,
ponto de limpeza da justificativa, forma de cada achado 32–39, granularidade dos planos.
Obrigatórios dentro de cada um: listados em 49-CONTEXT.md.

## Deferred Ideas

Blocos 3 e 4; P1; D4 na análise da triagem; Defeito 15b; `getGuia` sem filtro de tipo; guia
presencial lendo as notas da IA; policies de candidato nas tabelas de score; `score_geral` morta;
tabelas de entrevista sem escritor; escrituração da JORNADA (32–40) e do número da varredura no
`CLAUDE.md`.

**Não perguntados ao operador e levados ao §Portão antes do plano:** `revisao_resultado` no motor
de exclusão e a reclassificação de `ai_call_logs.user_prompt_template` no inventário.
