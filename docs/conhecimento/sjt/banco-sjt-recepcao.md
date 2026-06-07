---
cargo: recepcionista
formato: multipla_escolha
bateria: 5 cenários
tempo_estimado_min: 12
peso_maximo: 20
corte_revisao: "< 12 OU ≥1 atencao"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: PESQUISA-sjt-odontologia-beauty-smile.md §6.3 + criados Beauty Smile
language: pt-BR
---

# Banco SJT — Recepcionista

> **Escala (todos os itens):** `fortemente_pontua`=4 (âncora) · `pontua`=2 (defensável, incompleto) · `neutro`=1 (meio-termo fraco) · `atencao`=0 **+ flag** (erro/red flag).
> **Threshold:** `score < 12/20` **OU** `≥1 opção atencao marcada` → fila de revisão humana. Nunca auto-rejeita (RNF-07a).
> **Mapeamento DB:** cada SJT = 1 row em `perguntas` (`tipo='sjt'`, `cargo`, `dimensao_primaria`, `cenario`, `fonte`) + 4 rows em `pergunta_opcao_metadata` (`opcao_texto`, `tag`, `peso`, `nota_ia`, `ordem`).

---

## R1 — Paciente com dor, sem horário e sem dinheiro
- **Dimensão:** D4 Urgências (+D6 Humanização, +D5 Equipe)
- **Fonte:** Pearson VUE NHS Public Health SJT + CFO Art. 11-VII (ADAPTADO BR)

> Segunda-feira, 11h. Agenda 100% lotada até 18h. Uma mulher de 32 anos entra na recepção segurando o lado direito do rosto, visivelmente inchado, lacrimejando. Diz: "Estou com dor há 3 dias, não consigo dormir, não tenho convênio, não tenho dinheiro hoje, mas posso pagar amanhã. Por favor, me atendam." Outros 4 pacientes observam na sala de espera.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Conduz a paciente a um espaço reservado, comunica imediatamente o dentista responsável (suspeita de urgência), registra os dados e executa o protocolo de urgência sem pagamento imediato | fortemente_pontua | 4 | Âncora. Recepção tria, dentista decide. Respeita CFO 11-VII + humanização + estrutura operacional. |
| 2 | Aceita o encaixe por conta própria como "urgência" e a coloca na fila, sem avisar a equipe clínica | pontua | 2 | Atende a urgência mas quebra agenda e sobrecarrega o dentista sem aviso. |
| 3 | Educadamente orienta a paciente a ligar às 8h do dia seguinte para tentar encaixe | neutro | 1 | Recepção assume juízo clínico (agenda lotada) antes da avaliação — risco CFO 11-VII. |
| 4 | Pede que ela espere sentada, sem previsão e sem comunicar a equipe | atencao | 0 | Omissão. Flag para revisor. |

---

## R2 — Familiar pedindo informações da paciente (LGPD)
- **Dimensão:** D7 Sigilo/LGPD (+D1 Ética, +D2 Comunicação)
- **Fonte:** BlackStone Tutors Cenário 5 + LGPD Art. 7/11 + CFO Art. 9-VIII (ADAPTADO BR)

> Você atende o telefone. Voz masculina: "Sou o Sr. Carlos, pai da Marina, ela tem 22 anos e se atende aí. Estou preocupado, faz dias que não fala comigo. Pode confirmar se ela tem consulta hoje? E o que está sendo tratado? Sou eu que pago tudo dela."

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Informa com empatia que, por LGPD e sigilo profissional, não pode confirmar agenda nem dados de paciente maior de 18 anos a terceiros sem autorização documentada; sugere contato direto com a Marina e, se emergência, o SAMU (192) | fortemente_pontua | 4 | Âncora. Regra clara + alternativa segura. |
| 2 | "Vou checar com a paciente e retorno" — e em seguida liga para a Marina confirmando ao pai indiretamente que ela é paciente | neutro | 1 | Bem-intencionado, mas coercitivo e já vaza vínculo. |
| 3 | Confirma só o horário da consulta ("não revela diagnóstico") | atencao | 0 | Violação LGPD. Flag. |
| 4 | Pede o CPF do pai e libera as informações se ele constar como responsável financeiro | atencao | 0 | Confunde responsabilidade financeira com autorização de acesso a dados de saúde. Flag. |

---

## R3 — Reclamação agressiva de cobrança na sala de espera
- **Dimensão:** D2 Comunicação (+D6 Humanização, +D5 Equipe)
- **Fonte:** Prontuário Verde (glosas) + Allstar Dental Academy (ADAPTADO BR)

> Paciente ~55 anos entra alterado às 14h30, na frente de 6 pacientes: "Vocês me cobraram R$ 480 que o convênio DEVERIA ter coberto! Isso é roubo! Vou no Procon, vou postar no Reclame Aqui!" Agita o boleto. Você sabe que provavelmente houve glosa do convênio que o financeiro ainda não comunicou.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Mantém tom calmo, conduz a uma sala reservada, ouve sem interromper, verifica a glosa no sistema, explica de forma objetiva, escala ao financeiro/coordenação e oferece prazo claro de retorno | fortemente_pontua | 4 | Âncora. Privacidade + escuta ativa + escalação + compromisso de prazo. |
| 2 | Mantém a calma e resolve ali no balcão, verificando a glosa na hora, sem levar a um lugar reservado | pontua | 2 | Conteúdo correto, mas falha na privacidade/de-escalation em frente a testemunhas. |
| 3 | "Recepção não trata de financeiro" + fornece o telefone do SAC do convênio | neutro | 1 | Evasivo, empurra o problema, mas dá um caminho real. |
| 4 | Oferece 50% de desconto na hora pra acalmá-lo, sem consultar a coordenação | atencao | 0 | Sem autoridade orçamentária; cria precedente; não resolve a causa. Flag. |

---

## R4 — Overbooking: dois pacientes no mesmo horário (erro do sistema)
- **Dimensão:** Priorização/Agenda (+D5 Equipe, +D2 Comunicação)
- **Fonte:** CRIADO para Beauty Smile

> 14h, chegam simultaneamente Sr. Antônio e Dna. Célia, ambos com confirmação às 14h com a mesma dentista. O sistema duplicou o slot. A dentista está finalizando o paciente anterior e tem outro às 14h40. Os dois já perceberam e estão incomodados.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Assume o erro com transparência, comunica a dentista e oferece opções concretas (encaixe com outro profissional / espera curta com previsão / reagendar com prioridade e cortesia), deixando o paciente escolher | fortemente_pontua | 4 | Âncora. Transparência + opções + decisão do paciente. |
| 2 | Atende por ordem de chegada e pede ao outro que aguarde, sem explicar o erro | pontua | 2 | Resolve operacionalmente, mas sem transparência. |
| 3 | Diz que "o sistema confirmou errado, não foi a gente" e tenta encaixar | neutro | 1 | Terceiriza a culpa, mas ainda tenta resolver. |
| 4 | Manda os dois aguardarem e vai resolver outra tarefa | atencao | 0 | Omissão/abandono. Flag. |

---

## R5 — WhatsApp acumulado, mensagem de dor não respondida
- **Dimensão:** D2 Comunicação + Priorização
- **Fonte:** CRIADO para Beauty Smile

> Tarde corrida. Ao abrir o WhatsApp da clínica, você vê 12 mensagens não lidas acumuladas nas últimas 2h. Entre elas: alguém confirmando consulta de amanhã, alguém perguntando preço, vários "Bom dia", e uma paciente que há 90 min escreveu que está com dor e pergunta se tem encaixe hoje — ainda sem resposta.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Triagem por urgência: responde a dor primeiro (acolhe + verifica encaixe com a dentista), depois as sensíveis a tempo, agrupa o resto, e sinaliza à coordenação uma rotina com responsável + janelas de checagem | fortemente_pontua | 4 | Âncora. Triagem + acolhimento + melhoria de processo (Atitude de Dono). |
| 2 | Responde tudo rápido na ordem de chegada (da mais antiga à mais nova), sem priorizar, mas zera a fila e a dor acaba respondida | pontua | 2 | Responsivo, sem triagem por urgência. |
| 3 | Responde só as rápidas pra baixar o número de não lidas e deixa a da dor pra depois "porque precisa ver com a dentista" | neutro | 1 | Posterga justamente a mais urgente. |
| 4 | Assume que alguém já respondeu / deixa pra quando "der uma folga"; as mensagens seguem acumulando | atencao | 0 | Omissão; dor sem resposta. Flag. |
