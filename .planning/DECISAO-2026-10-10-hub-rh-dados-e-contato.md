---
tipo: decisao-do-operador + achados de UAT
criado: 2026-10-10
origem: UAT da Phase 51 (testes 1–3) e sessão de aceite do 51-17, conferidos no banco/código pela janela verificadora
estado: aguardando virar fase (depois do UAT da 51)
---

# Hub do RH: dados do candidato, contato e Big Five — decisão do operador

> Este arquivo existe porque, em 2026-10-10, os achados do UAT da Phase 51 estavam só em conversa:
> o `51-UAT.md` não tinha sido atualizado desde 03:44 e a seção «Gaps» estava vazia. Os achados da
> sessão de aceite (51-17) estão no `51-17-SUMMARY.md` e **não** são repetidos aqui, só referenciados.

## A decisão (verbatim, operador, 2026-10-10)

> «Eu quero o resultado do Big Five e quero ver todos os dados preenchidos no cadastro e inscrição
> da vaga. Preciso também ter o e-mail e telefone para entrar em contato fácil, com um botão de
> enviar e-mail e, no telefone, um botão do lado de chamar no WhatsApp.»

**Revoga, por decisão do operador:** D-31 da Phase 49 (Big Five «concluído/não fez», sem número)
e D-32 da Phase 51 (no hub, Big Five só «Concluído»/«Não fez»; as faixas revogadas para o hub).
Os testes que travam o «sem número» mudam junto.

**Continua valendo:** RNF-07a — o sistema nunca rejeita candidato automaticamente por score. A
revogação é sobre o RH **ver** o resultado, não sobre decisão automática.

Alertas apresentados ao operador antes da decisão, e por ele considerados: (1) o Big Five é não
avaliativo (UX-07/RNF-07a) e mostrá-lo a quem decide abre caminho a usá-lo como critério;
(2) exibir idade/data de nascimento expõe a prática discriminatória por idade (Lei 9.029/95).
Decisão mantida: **todos** os dados preenchidos.

## Escopo da fase nova (hub do RH, `HubCandidatoRH.tsx`)

Medido em 2026-10-10:

| # | Item | Estado hoje | Fonte dos dados |
|---|---|---|---|
| 1 | Contato: e-mail com botão «Enviar e-mail» (`mailto:`) e celular com botão «Chamar no WhatsApp» (`https://wa.me/55…`, número normalizado) | hub não mostra e-mail nem celular | `candidatos.email`, `candidatos.celular` |
| 2 | Todos os dados do cadastro | ausente do hub | `candidatos`: nome_completo, email, cpf, celular, data_nascimento, genero, cep, logradouro, numero, complemento, bairro, cidade, estado, linkedin_url/linkedin, instagram_url/instagram, como_conheceu, como_conheceu_detalhes |
| 3 | Todas as respostas da inscrição, na ordem do formulário, eliminatória destacada | só na exportação LGPD (`exportacaoService.ts`) | `respostas_formulario` (resposta_texto / resposta_opcoes / resposta_numerica) × `perguntas_formulario` (texto_pergunta) × `pergunta_opcao_metadata` |
| 4 | Big Five: resultado por dimensão + o texto da devolutiva que o candidato viu | só «Concluído» (por decisão, agora revogada) | `scores_candidato` (metadata.dimensoes), `devolutivas_candidato` |
| 5 | SJT múltipla escolha: pergunta, alternativas e a escolhida | só etiqueta (`fortemente_pontua`, `atencao`…) e peso | `respostas_avaliacao` / itens do SJT |
| 6 | Caso aberto (BARS): melhorar a apresentação do texto do candidato | caixa amarela | — |

Pontos de desenho para o discuss-phase:
- As tabelas de devolutiva e de respostas provavelmente são de leitura só do titular hoje: o RH vai
  precisar de RPC de leitura própria (migration + smoke), como o `ContextoKnockoutRevisao`.
- Registrar o acesso do RH aos dados pessoais (CPF, endereço, nascimento), como já se faz com o
  currículo (URL assinada).
- `wa.me` exige o número em formato internacional só com dígitos; o `celular` do cadastro precisa
  ser normalizado (e o botão escondido se o número for inválido).

## Defeitos achados no UAT da 51 (testes 1–3), candidatura `8101c56f` (conta +claude6)

| # | Sev. | Defeito | Onde |
|---|---|---|---|
| a | major | Painel do candidato com todas as avaliações concluídas segue «Aguardando Resposta» + CTA «Continuar para Avaliação Assíncrona», que leva ao «Tudo concluído». `candidaturas.status = aguardando_resposta` desde 2026-09-29. Deveria indicar «avaliações concluídas, aguardando a equipe» | painel do candidato |
| b | minor | «Gerado pelo modelo modelo não registrado» — palavra duplicada e o modelo da IA não foi gravado (rastreabilidade) | hub, «Análise da IA» |
| c | cosmetic | «3 avaliações respondidas» repetido no cabeçalho da seção e na linha do «Ver respostas» | hub |
| d | minor | Nenhuma tela de prova tem botão de saída durante o fluxo; «Voltar às avaliações» só existe nos estados de borda (sem pergunta / tudo enviado / indisponível / erro) em SjtMultiplaEscolha, SjtCasoAberto, Redacao, BigFive, Devolutiva e ProvaCognitiva. No SJT MC as respostas ficam só na memória da tela: um botão no meio precisa de confirmação de perda | telas de prova |
| e | cosmetic | «Tempo sugerido: 00:04 (sem limite rígido)» é um cronômetro progressivo (`SjtMultiplaEscolhaScreen.tsx:147-151`), não um tempo sugerido | SJT MC |
| f | minor | A devolutiva do Big Five só abre no redirecionamento logo após o envio (`BigFiveQuestionnaireScreen.tsx:394`); não há caminho na interface para reabri-la (o card concluído não tem «Ver devolutiva» e o «Tudo concluído» esconde todos os cards) | container de avaliações |

Resultados do UAT relatados pelo operador (a gravar no `51-UAT.md`): teste 1 **pass**; teste 2
**issue** (d, e; a parte G2 — card concluído logo após o envio — passou, e o «Voltar às avaliações»
da devolutiva pela URL direta passou); teste 3 **pass** no que o teste pede (achados a, b, c são
de caminho).

## Achados do aceite 51-17 (já gravados no `51-17-SUMMARY.md`, juntar à fase)

`LoginCandidatoPage` ignora sessão aberta (o link do e-mail mostra o login a quem já está logado);
sem botão de voltar ao dashboard na área do candidato; «Agradecemos seu interesse na Beauty Smile.»
deveria ser branco (`FormularioCandidaturaPage.tsx:547`); `SelectItem` branco sobre branco no hover;
nomes trocados no cadastro (admin `66412f96` = «RH2», recrutador `af4ebf97` = «RH3»); diálogo
«Responder revisão» de `humana_triagem` sem motivo/justificativa (a fila não projeta justificativa
por p42 (d) — portão em `20261008000003:665`).
