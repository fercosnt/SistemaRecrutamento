---
status: complete
phase: 52-hub-do-rh-dados-e-contato
source: [52-01-SUMMARY.md, 52-02-SUMMARY.md, 52-03-SUMMARY.md, 52-04-SUMMARY.md, 52-05-SUMMARY.md, 52-06-SUMMARY.md, 52-07-SUMMARY.md, 52-08-SUMMARY.md, 52-09-SUMMARY.md, 52-10-SUMMARY.md, 52-11-SUMMARY.md, 52-12-SUMMARY.md, 52-13-SUMMARY.md, 52-14-SUMMARY.md, 52-15-SUMMARY.md, 52-16-SUMMARY.md, 52-17-SUMMARY.md, 52-18-SUMMARY.md, 52-23-SUMMARY.md, 52-24-SUMMARY.md, 52-25-SUMMARY.md, 52-26-SUMMARY.md]
started: 2026-10-12T01:30:00Z
updated: 2026-10-12T04:09:15.795Z
---

<!--
Escopo: os 22 planos com SUMMARY. Fora: 52-19..52-22 e 52-27 (bloco D, destrutivo, não executado;
STATE.md manda o UAT ANTES do 52-19).
Portão verify:pre api-coverage: bloqueou por «declaration reason exceeds 200 chars»; COVERAGE.md
encurtado com aprovação do operador (813be711); portão verde.
Reconciliação de commits: nenhum SUMMARY tem `commits:` no frontmatter → WARNING (legado), não
blocker. Anomalia: 52-14 grava plan_head_after 355f124924b2d7dc0d2ad1ab3d2cfa1a7dbf4d5b, que não
existe; o sha real de 355f1249 é 355f1249762b11455eb2513109232b6a7fe56e03 e a janela real dá 10
commits, igual ao «commits: 10 medido» do corpo. Escrituração, não perda de commit.
Cobertura 52-14 D3: errors[] missing_rationale (human_judgment sem rationale) → tratado como
checkpoint humano (teste 16).
Front: último commit de código 5f091c8d está em origin/main; à frente do remoto só há docs.
Recarregar SEM CACHE (Cmd+Shift+R) antes de cada tela — render em cache não é conferência.
-->

## Current Test

[testing complete]

## Tests

### 1. Sair durante a prova (candidato)
expected: Com a conta de teste (+claude6), abra uma prova em andamento (SJT de múltipla escolha, Prova cognitiva ou Big Five — inclusive na introdução do Big Five). Há um botão de saída ACIMA do título. Com ao menos uma resposta marcada e não salva, clicar abre «Sair da avaliação?» com «Sair» em vermelho e o foco inicial em «Continuar» (anel de foco visível). «Sair» leva a /candidato/dashboard. Em telas de rascunho (já salvo) a saída é direta, sem diálogo. No celular (~360px) o botão e o diálogo cabem sem rolagem lateral.
result: pass
observed: "Candidatura 3a9254c3 (+claude6, Consultor, banco SJT novo de pré-vendas). SJT MC: botão acima do título; com resposta marcada, «Sair da avaliação?» com «Sair» vermelho e foco inicial em «Continuar» (anel visível); «Continuar» fecha e mantém a resposta; «Sair» leva a /candidato/dashboard. Big Five: na introdução (sem resposta) saída direta; com respostas marcadas, «Sair da avaliação? Se sair agora, as respostas desta prova não serão salvas.» 360px: botão e diálogo cabem sem rolagem lateral."
note: "O expected deste teste estava DESATUALIZADO para o Big Five: ele é tela de MEMÓRIA (ramo «memória → confirma», CR-01, 52-14-DECISAO-RODADA-1 — o autosave grava, mas a tela não relê), não de rascunho. O comportamento observado é o decidido; o defeito era da instrução do teste, não do código."
not_observed: "Prova cognitiva (nenhuma vaga com aplica_cognitivo = true em PROD) e Raven (não liberado nesta candidatura)."

### 2. Prova cognitiva (Raven) na identidade da marca
expected: A Prova cognitiva abre sobre o fundo gradiente da marca com vidro (glass) e véu escuro leve, em todos os estados — inclusive carregando. As matrizes aparecem em ladrilhos brancos legíveis; as opções em grade de 8 no desktop e de 4 no celular, com toque confortável; o botão principal é turquesa. «Ir ao painel» durante a prova pede «Sair da avaliação?» se já houver resposta enviada ou escolha no item atual.
result: issue
reported: "Passou: candidatura 8e4bb7a0 (+claude7, Consultor). Fundo gradiente com vidro e véu escuro, inclusive carregando; matriz em ladrilho branco legível; alternativas em uma linha no desktop e em grade a 360px, sem rolagem lateral; «Próximo item» turquesa. «Ir ao painel» sem escolha sai direto; com escolha no item atual e depois de resposta enviada (testei no item 2), pede «Sair da avaliação?». A tela de «não liberada» (conta +claude6) também está no visual da marca. Issue: o estado SELECIONADO da alternativa é pouco visível — só um contorno turquesa fino sobre o fundo turquesa (print). Como a prova não deixa voltar a um item respondido, o candidato precisa enxergar com certeza o que marcou antes de avançar. Pedido: contorno grosso e de alto contraste (ex.: ring-4 branco ou escuro) + ícone de check no ladrilho escolhido; conferir o mesmo estado no celular."
severity: minor

### 3. Responder o banco SJT novo até «Tudo concluído» (Consultor fdbe1a4a)
expected: Com a conta de teste (+claude6) inscrita na vaga Consultor (fdbe1a4a), o SJT mostra o banco novo de pré-vendas (6 de múltipla escolha + 1 caso aberto). Responder tudo leva à tela «Tudo concluído», sem erro, e o envio é aceito.
result: pass
observed: "Candidatura 3a9254c3 (+claude6, Consultor fdbe1a4a). O SJT mostrou o banco novo de pré-vendas (6 situações + caso aberto «Responda este lead no WhatsApp»), com alternativas embaralhadas e «Tempo decorrido». Respondi SJT MC, caso aberto, redação e Big Five: «Tudo concluído», sem erro, com o botão «Ver devolutiva» levando à devolutiva do Big Five. Painel: «Avaliações concluídas — aguardando a equipe». Conferido no banco (só leitura): scores_candidato sjt = 8/24, versao 2, expected 6 = answered 6, as 6 respostas em itens ACTIVE do cargo sdr-social-seller, com tags fortemente_pontua, atencao, atencao, pontua, atencao, pontua (soma 4+0+0+2+0+2 = 8, coerente com as escolhas); caso aberto 23,75/25; 1 redação em redacoes_candidato; linha big_five registrada."

### 4. Painel do candidato «aguardando a equipe»
expected: Depois do teste 3, em /candidato/dashboard a candidatura (avaliação assíncrona, todas as avaliações concluídas) mostra no «Próximo passo» «Avaliações concluídas — aguardando a equipe», SEM botão, e o selo «Aguardando a equipe» em tom neutro. A frase quebra linha a 360px (sem cortar com reticências). Só abrir o painel não grava nada.
result: issue
reported: "issue (minor) — o que o teste pede passou. Passou: candidatura 3a9254c3 (+claude6). «Próximo passo»: «Avaliações concluídas — aguardando a equipe», sem botão de ação; selo «Aguardando a equipe» neutro; a 360px a frase quebra em duas linhas, sem reticências (prints). «Só abrir não grava nada»: conferido no banco, md5 da linha de candidaturas IGUAL antes (00:32:58) e depois (00:34:53) de abrir e recarregar o painel; historico 3→3, notificacoes 7→7, scores 3→3. Issues: 1. [minor] A linha de prazo segue «Avaliação liberada — conclua em até 7 dias corridos. (Estimativa)» com todas as avaliações concluídas, contradizendo o «Próximo passo». A estimativa precisa refletir o estado concluído (ou sumir). 2. [cosmetic] O texto do «Próximo passo» está numa caixa com borda igual à do botão «Retirar minha candidatura»: parece clicável sem ser. Sugestão: texto simples, sem borda."
severity: minor

### 5. «Ver devolutiva» do Big Five
expected: No card do Big Five concluído (painel) e na tela «Tudo concluído» (acima de «Ir ao painel») aparece «Ver devolutiva». O clique leva a /candidato/avaliacao/:id/bigfive/devolutiva e mostra a devolutiva DESSA candidatura (pendência (f) do UAT da 51).
result: pass
observed: "«Tudo concluído» da 3a9254c3 (+claude6): «Ver devolutiva» acima de «Ir ao painel» → /candidato/avaliacao/3a9254c3…/bigfive/devolutiva, mostrando a devolutiva DESSA candidatura (Extroversão média, Amabilidade moderadamente baixa). Contraprova: a 8101c56f, da mesma conta, mostra a dela (Extroversão moderadamente baixa, Amabilidade muito baixa), conferido contra devolutivas_candidato no banco (md5 diferentes)."
ressalva: "Card do Big Five concluído com outra prova pendente: NÃO OBSERVADO. Nenhuma candidatura está nesse estado e o operador optou por não criar uma; aceito como ressalva (mesmo botão «Ver devolutiva» já visto funcionando no «Tudo concluído»)."

### 6. Inscrição encerrada legível
expected: Ao abrir a inscrição de uma vaga encerrada, o cartão de aviso é legível sobre o vidro: título grande em branco e texto em branco suavizado, com o texto de sempre (D-15), sem mudança de redação.
result: pass
observed: "Conta nova de teste +claude8, inscrição na Social Media e897f709 com a resposta eliminatória: o cartão aparece no lugar do formulário, legível sobre o vidro: «Inscrição recebida» (título grande, branco), «Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.» e «Agradecemos seu interesse na Beauty Smile.» em branco suavizado, sem o critério, com «Voltar». Texto D-15 inalterado (print)."

### 7. Hub do candidato abre com sessão real de recrutador
expected: Logado como recrutador ativo, /rh/candidatos/:id de um candidato real abre o hub com o bloco de contato no topo e 4 abas (cadastro, inscrição, avaliações e o que mais estiver previsto), com dados reais — não vazio nem com erro. Ao entrar num workspace de etapa e voltar, o hub cai na aba de onde você saiu. A 360px as 4 abas quebram sem rolagem lateral.
result: pass
observed: "Logado como recrutador +rh6 («Recrutador (teste)», af4ebf97), /rh/candidatos/3a9254c3… (conta de teste +claude6, cadastro completo; não abri dado de candidato real só para teste de tela): contato no topo com e-mail, celular e os botões «Enviar e-mail» / «Chamar no WhatsApp»; 4 abas (Resumo, Cadastro e inscrição, Avaliações, Histórico), com dados reais, sem vazio nem erro (nascimento com idade, endereço completo, disponibilidade, «Não informado» nos campos não preenchidos). Entrei no workspace de redação pela aba Avaliações e, ao voltar, o hub abriu na aba Avaliações (?aba= na URL). A 360px as 4 abas quebram sem rolagem lateral."
note: "O expected pedia «candidato real»; o operador usou a conta de teste +claude6 com cadastro completo por decisão de minimização (não abrir dado de candidato real só para teste de tela). Aceito."

### 8. Contato: e-mail e WhatsApp
expected: No hub, o bloco de contato mostra e-mail e WhatsApp do candidato. O e-mail abre o cliente de e-mail (mailto:) com o endereço; o WhatsApp abre wa.me com o número e a mensagem pré-preenchida. A 360px o bloco quebra sem rolagem lateral.
result: pass
observed: "Hub da 3a9254c3 (+claude6) como recrutador +rh6: o bloco de contato mostra e-mail e celular; «Enviar e-mail» abre o cliente de e-mail (mailto:) com o endereço do candidato e o assunto preenchido; «Chamar no WhatsApp» abre wa.me com o número no formato 55… e a mensagem pré-preenchida (não enviei). A 360px o bloco quebra sem rolagem lateral."

### 9. Abas de cadastro e inscrição
expected: A ficha de cadastro mostra o cadastro completo com dados reais. Na aba de inscrição aparecem as respostas da inscrição, inclusive as longas (com quebra, sem cortar); o link de portfólio é clicável e abre em aba NOVA; o selo é legível sobre o vidro; tudo cabe a 360px.
result: pass
observed: "Hub da 3a9254c3 (+claude6) como recrutador: a aba Cadastro e inscrição mostra o cadastro completo com dados reais; «Respostas da inscrição» com as respostas longas quebrando linha, inteiras, sem reticências; a pergunta eliminatória com selo legível sobre o vidro, a resposta dada e sem as opções não escolhidas; tudo cabe a 360px."
ressalva: "Link de portfólio clicável/aba nova: NÃO OBSERVADO. Nenhuma candidatura de teste respondeu o portfólio com URL http(s) (medido: 9 respostas, 0 com http), e o hub só faz link de http(s) por desenho. Comportamento coberto pelo item automático 85 (52-24 D4: links só http(s), em aba nova, rel noopener noreferrer) — conferido."

### 10. Aba Avaliações (SJT MC, caso aberto, Big Five)
expected: A aba Avaliações, toda aberta, mostra a contagem e os cards em ordem: SJT de múltipla escolha (cada pergunta com a alternativa escolhida e as demais alternativas, com faixas e partes recolhíveis), caso aberto e Big Five com resultado e devolutiva. A hierarquia é clara e, abaixo de 768px, os títulos ficam em 24px e quebram sem rolagem lateral. O sistema não rejeita ninguém por score.
result: pass
observed: "Hub da 3a9254c3 (+claude6) como recrutador, aba Avaliações toda aberta: contagem uma vez só e os cards em ordem; SJT de múltipla escolha com cada situação, a alternativa escolhida (com etiqueta e peso só nela) e as demais em ordem neutra, partes recolhíveis; caso aberto com o texto do candidato; Big Five com as faixas O C E A N (sem número) e «Ver devolutiva». Hierarquia clara; abaixo de 768px os títulos ficam em 24px e quebram sem rolagem lateral. Sem rejeição por score: a candidatura tirou 8/24 no SJT e segue status em_analise (conferido no banco), sem nenhuma linha de rejeição automática no histórico."

### 11. Texto do caso aberto no hub
expected: A resposta do caso aberto é confortável de ler: ritmo de parágrafo, trechos marcados com realce suave (cerca de 30%) e contraste bom. No desktop, a grade é texto largo + coluna estreita (2fr/1fr); no celular, as duas partes empilham.
result: pass
observed: "Hub da 3a9254c3 (+claude6), caso aberto «Responda este lead no WhatsApp»: o texto do candidato aparece com ritmo de parágrafo, os trechos citados pela IA marcados com realce suave dentro do texto e bom contraste; no desktop, texto largo + coluna estreita; no celular, as duas partes empilham sem rolagem lateral."

### 12. «Modelo não registrado» em análise antiga
expected: No hub, uma análise de IA antiga sem modelo gravado mostra «Modelo não registrado (análise anterior a 22/09/2026)» em vez de vazio ou «null». Análises novas mostram o modelo.
result: pass
observed: "Hub da 8101c56f (análise de 22/09/2026 00:33, modelo_ia nulo): «Modelo não registrado (análise anterior a 22/09/2026)», sem palavra repetida e sem vazio/null; caso de borda (data = 22/09) com o parêntese, como manda a regra ≤. Hub da 3a9254c3 (análise de 09/10, modelo gravado): mostra o modelo."

### 13. Notas 1–5 no workspace
expected: No workspace de avaliação por competência, os botões de nota 1–5 têm contraste claro entre nota livre e marcada sobre o vidro; com nome de competência longo, a linha quebra sem empurrar os botões para fora; o alvo de toque tem cerca de 44px.
result: pass
observed: "Workspace de entrevista da d31c78bb (cand1), aba «Avaliação da entrevista»: cada competência com 5 botões 1–5, nenhum marcado de início; o marcado se distingue claramente dos livres sobre o vidro; a 360px os nomes quebram linha sem empurrar os botões para fora e o alvo de toque é confortável; subtítulo sem jargão. Não salvei (trava «Nenhuma análise vigente» segue ativa)."

### 14. Realce dos itens de seleção nos dois fundos
expected: Nas listas suspensas, o item em foco ou selecionado tem realce turquesa (~20%) e o texto continua legível, nos dois fundos: (a) diálogo «Rejeitar candidatura», fundo padrão; (b) filtros da página Candidatos RH, fundo azul escuro.
result: pass
observed: "(a) Diálogo «Rejeitar» no hub da 3a9254c3 (cancelado, nada gravado): no Select «Motivo da rejeição», o item sob o mouse e o item em foco pelo teclado têm realce turquesa leve com texto legível, inclusive «Reprovado na entrevista», que antes sumia (branco sobre branco); o item selecionado também legível. (b) Filtros de /rh/candidatos no fundo azul escuro: mesmo realce, texto legível em todos os itens."

### 15. «Responder revisão» com contexto da rejeição na triagem
expected: No diálogo «Responder revisão» de um pedido cuja origem é rejeição humana na triagem, aparecem «Motivo da rejeição» (rótulo legível; código desconhecido aparece cru) e «Justificativa registrada» (inteira, com as quebras de linha); quando não há registro, «Não registrado». Pedidos de origem automática mostram o próprio bloco de knockout; pedidos humanos comuns não mostram esse bloco.
result: pass
observed: "/rh/revisoes como recrutador, em «Ver resposta»: humana_triagem (Claude Sete, Consultor 8e4bb7a0; quem decidiu «Admin (teste)»): «Motivo da rejeição: Perfil desalinhado com a vaga» (rótulo legível) e «Justificativa registrada: o perfil nao se adequa a vaga, nao e o perfil que procuramos», inteira. automatica (Claude Sete, Consultor; «Automático (knockout)»): bloco «O que encerrou a candidatura» com pergunta, resposta e opção; sem motivo/justificativa. decisão final (Claude Teste Revisao = conta +claude3, Social Media, 06/09; «Admin (teste)», mantida): nenhum dos dois blocos."
ressalva: "Não observados (não existem nos dados): código de motivo desconhecido exibido cru e justificativa ausente → «Não registrado». O operador citou os itens automáticos 43 e 61; conferido nesta sessão, eles NÃO cobrem esses dois estados (43 = RPC; 61 = carregando/erro/vazio). Cobertura real: «Não registrado» → ContextoRejeicaoTriagemRevisao.test.tsx, casos `indisponivel` e `disponivel` com campos nulos (suíte 9/9, rodada em 2026-10-12). Código desconhecido cru → SEM teste; só o código (ContextoRejeicaoTriagemRevisao.tsx:59, `?.label ?? motivo`) — o teste de rótulo percorre apenas os códigos do MOTIVO_OPTIONS."

### 16. Registros do operador (conferidos por arquivo)
expected: Confirme os quatro registros, já conferidos por máquina nesta sessão: (a) 52-14 D3 — decisão escrita «aplicar» e janela única «Confirmo», verbatim e datada (52-14-DECISAO-RODADA-1.md, 2026-10-11); (b) 52-16 D3 e 52-17 D1 — texto do banco SJT v2 aprovado por md5: o md5 atual de docs/specs/BANCO-SJT-V2.md é 03b2a0d5d96774bbb73b06b7c693bbe5, igual ao texto_md5_aprovado (52-17-TEXTO-APROVADO.md, aprovado_em 2026-10-11 15:13 -0300); (c) 52-26 D5 — push c3e04a71..29f34756 feito pela opção B do operador (52-26-DECISAO-PUSH.md); 29f34756 está em origin/main.
result: pass
observed: "Conferido também na janela verificadora: (a) 52-14-DECISAO-RODADA-1.md com «aplicar» e «Confirmo» verbatim, 2026-10-11; (b) md5 atual de docs/specs/BANCO-SJT-V2.md = 03b2a0d5d96774bbb73b06b7c693bbe5 = texto_md5_aprovado do 52-17-TEXTO-APROVADO.md (rodada 2 + polir); (c) 29f34756 é ancestral de origin/main, com a decisão registrada em 52-26-DECISAO-PUSH.md."

### 17. [52-01 D1] p52_ensaio.cjs roda smoke vivo contra PROD numa transação que aborta (tracer)
expected: p52_ensaio.cjs roda smoke vivo contra PROD numa transação que aborta (tracer)
result: pass
source: automated
coverage_id: 52-01-D1

### 18. [52-01 D2] p52_portao.cjs com regra (8) por forma sobre _p52_, auto-teste 68/68
expected: p52_portao.cjs com regra (8) por forma sobre _p52_, auto-teste 68/68
result: pass
source: automated
coverage_id: 52-01-D2

### 19. [52-01 D3] p52_tipografia.cjs acusa/aceita as 11 amostras da UI-SPEC e recusa varredura vazia
expected: p52_tipografia.cjs acusa/aceita as 11 amostras da UI-SPEC e recusa varredura vazia
result: pass
source: automated
coverage_id: 52-01-D3

### 20. [52-01 D4] p52_vitest_delta.cjs: auto-teste 9/9, BASE NAO MEDIDA no CLI, uso normal alteradas=0 · novas=0 · mordida=ok
expected: p52_vitest_delta.cjs: auto-teste 9/9, BASE NAO MEDIDA no CLI, uso normal alteradas=0 · novas=0 · mordida=ok
result: pass
source: automated
coverage_id: 52-01-D4

### 21. [52-01 D5] Base da fase refs/gsd/52/base fixada
expected: Base da fase refs/gsd/52/base fixada
result: pass
source: automated
coverage_id: 52-01-D5

### 22. [52-02 D1] SJT MC: com 1 resposta, «Voltar às avaliações» abre «Sair da avaliação?» / «Se sair agora, as respostas desta prova não serão salvas.»; «Continuar» fecha e mantém a resposta; «Sair» vai a /candidato/avaliacao/:id; com 0 respostas sai direto, sem diálogo
expected: SJT MC: com 1 resposta, «Voltar às avaliações» abre «Sair da avaliação?» / «Se sair agora, as respostas desta prova não serão salvas.»; «Continuar» fecha e mantém a resposta; «Sair» vai a /candidato/avaliacao/:id; com 0 respostas sai direto, sem diálogo
result: pass
source: automated
coverage_id: 52-02-D1

### 23. [52-02 D2] Prova cognitiva no grupo da confirmação (D-36): 0 respostas → direto; 1 → diálogo, Continuar mantém, Sair navega
expected: Prova cognitiva no grupo da confirmação (D-36): 0 respostas → direto; 1 → diálogo, Continuar mantém, Sair navega
result: pass
source: automated
coverage_id: 52-02-D2

### 24. [52-02 D3] Big Five (introdução e com resposta), Redação e Caso prático (com e sem texto): o clique chama flushNow e só navega depois que ele termina; nunca abre o diálogo
expected: Big Five (introdução e com resposta), Redação e Caso prático (com e sem texto): o clique chama flushNow e só navega depois que ele termina; nunca abre o diálogo
result: pass
source: automated
coverage_id: 52-02-D3

### 25. [52-02 D4] Cronômetro do SJT MC diz «Tempo decorrido: mm:ss (sem limite de tempo)» com tabular-nums; a frase antiga não existe em src/features/avaliacao (código nem docblock)
expected: Cronômetro do SJT MC diz «Tempo decorrido: mm:ss (sem limite de tempo)» com tabular-nums; a frase antiga não existe em src/features/avaliacao (código nem docblock)
result: pass
source: automated
coverage_id: 52-02-D4

### 26. [52-03 D1] Raven em andamento: sem nenhuma escolha, «Ir ao painel» vai direto a /candidato/dashboard; com escolha no item atual (não enviada) abre «Sair da avaliação?» — «Continuar» mantém item e escolha, «Sair» vai ao painel; com resposta anterior enviada e nenhuma escolha atual, também confirma
expected: Raven em andamento: sem nenhuma escolha, «Ir ao painel» vai direto a /candidato/dashboard; com escolha no item atual (não enviada) abre «Sair da avaliação?» — «Continuar» mantém item e escolha, «Sair» vai ao painel; com resposta anterior enviada e nenhuma escolha atual, também confirma
result: pass
source: automated
coverage_id: 52-03-D1

### 27. [52-03 D2] Shell da marca: BackgroundImage gradient + overlay bg-black 15%, container max-w-4xl, no estado em andamento e nos estados não liberado / já respondeu
expected: Shell da marca: BackgroundImage gradient + overlay bg-black 15%, container max-w-4xl, no estado em andamento e nos estados não liberado / já respondeu
result: pass
source: automated
coverage_id: 52-03-D2

### 28. [52-03 D3] Instruções visíveis no item 1 e no item 2; grade com classes inteiras no fonte (8 → grid-cols-4 sm:grid-cols-8; 6 → grid-cols-3 sm:grid-cols-6); CTA bg-[#35BFAD] text-white; tipografia do contrato
expected: Instruções visíveis no item 1 e no item 2; grade com classes inteiras no fonte (8 → grid-cols-4 sm:grid-cols-8; 6 → grid-cols-3 sm:grid-cols-6); CTA bg-[#35BFAD] text-white; tipografia do contrato
result: pass
source: automated
coverage_id: 52-03-D3

### 29. [52-03 D4] Guarda rotulos-navegacao-candidato verde e provado mordendo (arquivo temporário com o rótulo antigo o deixa vermelho; removido, volta a verde)
expected: Guarda rotulos-navegacao-candidato verde e provado mordendo (arquivo temporário com o rótulo antigo o deixa vermelho; removido, volta a verde)
result: pass
source: automated
coverage_id: 52-03-D4

### 30. [52-04 D2] Os quatro testes que já montavam o painel seguem verdes só com o vi.mock do hook acrescentado (nenhuma asserção mudada)
expected: Os quatro testes que já montavam o painel seguem verdes só com o vi.mock do hook acrescentado (nenhuma asserção mudada)
result: pass
source: automated
coverage_id: 52-04-D2

### 31. [52-05 D1] textoProveniencia diz «Modelo não registrado» (frase inteira) para modelo nulo, e nenhuma combinação provedor × modelo × data × causa produz «modelo» duas vezes
expected: textoProveniencia diz «Modelo não registrado» (frase inteira) para modelo nulo, e nenhuma combinação provedor × modelo × data × causa produz «modelo» duas vezes
result: pass
source: automated
coverage_id: 52-05-D1

### 32. [52-05 D2] Parêntese «(análise anterior a 22/09/2026)» só com data ≤ 22/09/2026 em São Paulo; sem data, data ilegível ou posterior, só «Modelo não registrado» (D-52-U17)
expected: Parêntese «(análise anterior a 22/09/2026)» só com data ≤ 22/09/2026 em São Paulo; sem data, data ilegível ou posterior, só «Modelo não registrado» (D-52-U17)
result: pass
source: automated
coverage_id: 52-05-D2

### 33. [52-05 D3] Hub: created_at projetado e devolvido como gerado_em; os dois selos do AnaliseIABlock recebem geradoEm
expected: Hub: created_at projetado e devolvido como gerado_em; os dois selos do AnaliseIABlock recebem geradoEm
result: pass
source: automated
coverage_id: 52-05-D3

### 34. [52-05 D4] Consumidores sem data (comparativo, redação, guia, transcrição, PDF) mostram exatamente «Modelo não registrado»; PDF de contingência sem modelo contém contingenciaSemModelo e a causa
expected: Consumidores sem data (comparativo, redação, guia, transcrição, PDF) mostram exatamente «Modelo não registrado»; PDF de contingência sem modelo contém contingenciaSemModelo e a causa
result: pass
source: automated
coverage_id: 52-05-D4

### 35. [52-05 D5] Menu do RH acende «Candidatos» em /rh/candidato/:id/{entrevista,redacao,decisao}; todos os ramos anteriores de getActivePageFromPath inalterados
expected: Menu do RH acende «Candidatos» em /rh/candidato/:id/{entrevista,redacao,decisao}; todos os ramos anteriores de getActivePageFromPath inalterados
result: pass
source: automated
coverage_id: 52-05-D5

### 36. [52-06 D1] Candidato com sessão hidratada que abre o login vai direto ao destino (resolveRedirect, escopo /candidato/, senão painel); //evil.com e /rh/… caem no painel; RH/sem sessão veem o formulário; «Verificando sua sessão…» durante a hidratação; sessão do próprio envio não sequestra o destino
expected: Candidato com sessão hidratada que abre o login vai direto ao destino (resolveRedirect, escopo /candidato/, senão painel); //evil.com e /rh/… caem no painel; RH/sem sessão veem o formulário; «Verificando sua sessão…» durante a hidratação; sessão do próprio envio não sequestra o destino
result: pass
source: automated
coverage_id: 52-06-D1

### 37. [52-06 D2] «Meu painel» na navbar do candidato, à esquerda de «Área do candidato», ausente em /candidato/dashboard
expected: «Meu painel» na navbar do candidato, à esquerda de «Área do candidato», ausente em /candidato/dashboard
result: pass
source: automated
coverage_id: 52-06-D2

### 38. [52-07 D1] Notas 1–5 vazias e obrigatórias: radiogroup por competência (aria-label = competência) com 5 radios «1»…«5», nenhum marcado com score 4 da IA na fixture; sem leitura «x / 5»; Salvar desabilitado até todas as notas e as notas escritas; payload só com as notas escolhidas; saving desabilita os botões
expected: Notas 1–5 vazias e obrigatórias: radiogroup por competência (aria-label = competência) com 5 radios «1»…«5», nenhum marcado com score 4 da IA na fixture; sem leitura «x / 5»; Salvar desabilitado até todas as notas e as notas escritas; payload só com as notas escolhidas; saving desabilita os botões
result: pass
source: automated
coverage_id: 52-07-D1

### 39. [52-07 D2] Subtítulo «Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.» e rótulo «Notas do gestor (obrigatório)» com sufixo em span font-normal text-white/70
expected: Subtítulo «Escolha uma nota de 1 a 5 para cada competência. A decisão é sempre humana.» e rótulo «Notas do gestor (obrigatório)» com sufixo em span font-normal text-white/70
result: pass
source: automated
coverage_id: 52-07-D2

### 40. [52-07 D3] Ban de «BARS sliders» e de notas_humanas como texto visível em src/features/entrevista, com mordida provada no código real (RED) e por fixtures
expected: Ban de «BARS sliders» e de notas_humanas como texto visível em src/features/entrevista, com mordida provada no código real (RED) e por fixtures
result: pass
source: automated
coverage_id: 52-07-D3

### 41. [52-08 D1] ler_devolutiva_bigfive_rh: so RH ativo le; allowlist {dim, banda, texto_interpretativo}; sem percentil nem folha numerica; banda/texto = os da devolutiva do candidato; candidatura viva
expected: ler_devolutiva_bigfive_rh: so RH ativo le; allowlist {dim, banda, texto_interpretativo}; sem percentil nem folha numerica; banda/texto = os da devolutiva do candidato; candidatura viva
result: pass
source: automated
coverage_id: 52-08-D1

### 42. [52-08 D2] ler_sjt_mc_rh: cenario + alternativas {opcao_id, texto, escolhida}, etiqueta/peso so da escolhida, ordem neutra md5, perguntas sem filtro de status
expected: ler_sjt_mc_rh: cenario + alternativas {opcao_id, texto, escolhida}, etiqueta/peso so da escolhida, ordem neutra md5, perguntas sem filtro de status
result: pass
source: automated
coverage_id: 52-08-D2

### 43. [52-08 D3] ler_contexto_rejeicao_triagem_revisao: motivo e justificativa da revisao humana_triagem; automatica/inexistente = mesmo P0002; helper antes da busca
expected: ler_contexto_rejeicao_triagem_revisao: motivo e justificativa da revisao humana_triagem; automatica/inexistente = mesmo P0002; helper antes da busca
result: pass
source: automated
coverage_id: 52-08-D3

### 44. [52-08 D4] Nomes por papel (Recrutador (teste) / Admin (teste)) por escrita controlada com PRE/POS que mordem
expected: Nomes por papel (Recrutador (teste) / Admin (teste)) por escrita controlada com PRE/POS que mordem
result: pass
source: automated
coverage_id: 52-08-D4

### 45. [52-08 D5] Runner p52_mutacoes.cjs com controle verde e todas as mutacoes mordendo na propria letra
expected: Runner p52_mutacoes.cjs com controle verde e todas as mutacoes mordendo na propria letra
result: pass
source: automated
coverage_id: 52-08-D5

### 46. [52-09 D1] EF ler-cadastro-candidato-rh autoriza pela linha viva de usuarios_rh (401/403/400/404 único) e escreve a linha de log só com ids e papel
expected: EF ler-cadastro-candidato-rh autoriza pela linha viva de usuarios_rh (401/403/400/404 único) e escreve a linha de log só com ids e papel
result: pass
source: automated
coverage_id: 52-09-D1

### 47. [52-09 D2] Todo registro @invalido.local (tombstone e fictícios com celular, inclusive em maiúsculas/espaço) sai com contato null; tombstone com cadastro null; cadastro.email null nos fictícios; controle com contato real preservado
expected: Todo registro @invalido.local (tombstone e fictícios com celular, inclusive em maiúsculas/espaço) sai com contato null; tombstone com cadastro null; cadastro.email null nos fictícios; controle com contato real preservado
result: pass
source: automated
coverage_id: 52-09-D2

### 48. [52-09 D3] Contrato completo (cadastro 19 campos, disponibilidade, inscrição em ordem com removida/eliminatória sem a opção), sem chaves internas no JSON, validado pelo serviço
expected: Contrato completo (cadastro 19 campos, disponibilidade, inscrição em ordem com removida/eliminatória sem a opção), sem chaves internas no JSON, validado pelo serviço
result: pass
source: automated
coverage_id: 52-09-D3

### 49. [52-10 D1] O hub tem quatro abas (Resumo abre primeiro), com a aba na URL (?aba=) gravada com replace; valor desconhecido → Resumo
expected: O hub tem quatro abas (Resumo abre primeiro), com a aba na URL (?aba=) gravada com replace; valor desconhecido → Resumo
result: pass
source: automated
coverage_id: 52-10-D1

### 50. [52-10 D2] Seções existentes na aba da D-52-U01 sem mudar conteúdo; ações de funil no «Próximo passo» do Resumo; contato fora das abas
expected: Seções existentes na aba da D-52-U01 sem mudar conteúdo; ações de funil no «Próximo passo» do Resumo; contato fora das abas
result: pass
source: automated
coverage_id: 52-10-D2

### 51. [52-10 D3] «Dados do cadastro» lido pelo useCadastroCandidatoRh: 10 pares + Endereço + Disponibilidade na ordem da UI-SPEC, formatos (CPF, CEP, nascimento com idade em São Paulo), «Não informado», Detalhes só com valor
expected: «Dados do cadastro» lido pelo useCadastroCandidatoRh: 10 pares + Endereço + Disponibilidade na ordem da UI-SPEC, formatos (CPF, CEP, nascimento com idade em São Paulo), «Não informado», Detalhes só com valor
result: pass
source: automated
coverage_id: 52-10-D3

### 52. [52-10 D4] D-40: registro fictício/anonimizado mostra o celular como texto puro, sem tel:/wa.me/mailto: nem botão na ficha; campo livre com marcação vira texto (T-52-71)
expected: D-40: registro fictício/anonimizado mostra o celular como texto puro, sem tel:/wa.me/mailto: nem botão na ficha; campo livre com marcação vira texto (T-52-71)
result: pass
source: automated
coverage_id: 52-10-D4

### 53. [52-11 D1] Rótulos e faixas do Big Five extraídos para lib/bigFiveRotulos.tsx; a devolutiva do candidato importa de volta com comportamento idêntico
expected: Rótulos e faixas do Big Five extraídos para lib/bigFiveRotulos.tsx; a devolutiva do candidato importa de volta com comportamento idêntico
result: pass
source: automated
coverage_id: 52-11-D1

### 54. [52-11 D2] Big Five no hub (BigFiveResultadoHub): aviso fixo, faixas O C E A N da devolutiva, Ver/Ocultar devolutiva acessível, sem devolutiva sem faixa, skeleton, erro com Recarregar devolutiva
expected: Big Five no hub (BigFiveResultadoHub): aviso fixo, faixas O C E A N da devolutiva, Ver/Ocultar devolutiva acessível, sem devolutiva sem faixa, skeleton, erro com Recarregar devolutiva
result: pass
source: automated
coverage_id: 52-11-D2

### 55. [52-11 D3] Nenhum número da escala do Big Five no hub: tipo sem o campo, projeção no serviço, teste do 87 e guarda por forma (mutações provaram que os três mordem)
expected: Nenhum número da escala do Big Five no hub: tipo sem o campo, projeção no serviço, teste do 87 e guarda por forma (mutações provaram que os três mordem)
result: pass
source: automated
coverage_id: 52-11-D3

### 56. [52-11 D4] SJT MC no hub (SjtMcDetalhe): Situação {n}, cenário, todas as alternativas na ordem do servidor, escolhida com Check/«Escolhida»/etiqueta pt-BR/peso só nela, legenda da D-37, alternativa sumida, falhou, erro/recarregar
expected: SJT MC no hub (SjtMcDetalhe): Situação {n}, cenário, todas as alternativas na ordem do servidor, escolhida com Check/«Escolhida»/etiqueta pt-BR/peso só nela, legenda da D-37, alternativa sumida, falhou, erro/recarregar
result: pass
source: automated
coverage_id: 52-11-D4

### 57. [52-12 D1] localizarCitacoes: espaço normalizado, caixa e acento exatos, primeira ocorrência, sobrepostas e encostadas fundidas, vazia ignorada, quebra de linha como espaço
expected: localizarCitacoes: espaço normalizado, caixa e acento exatos, primeira ocorrência, sobrepostas e encostadas fundidas, vazia ignorada, quebra de linha como espaço
result: pass
source: automated
coverage_id: 52-12-D1

### 58. [52-12 D2] TextoComCitacoes: <mark> por segmentos, legenda antes do texto, caixa neutra em 16px, lista lateral só com citação não localizada, texto nulo → todas na lista, HTML literal, zero dangerouslySetInnerHTML
expected: TextoComCitacoes: <mark> por segmentos, legenda antes do texto, caixa neutra em 16px, lista lateral só com citação não localizada, texto nulo → todas na lista, HTML literal, zero dangerouslySetInnerHTML
result: pass
source: automated
coverage_id: 52-12-D2

### 59. [52-12 D3] Variante do hub de RespostaCasoAbertoConteudo: ficha neutra, sem rótulo próprio, cinco estados sem texto (e disponivel vazio) com as citações na lista, cadeia de classes sem âmbar, «Tentar de novo» 14/600; Decisão Final segue âmbar e 12px
expected: Variante do hub de RespostaCasoAbertoConteudo: ficha neutra, sem rótulo próprio, cinco estados sem texto (e disponivel vazio) com as citações na lista, cadeia de classes sem âmbar, «Tentar de novo» 14/600; Decisão Final segue âmbar e 12px
result: pass
source: automated
coverage_id: 52-12-D3

### 60. [52-12 D4] Card do caso aberto pelo card inteiro: citações na lista sem texto, marca com await quando o texto chega, um só «Texto do candidato», cadeia sem âmbar, «Pontos de atenção», rótulos/selos/sinal/nível em 14px, dimensão em 600; D-20 e blocos imutáveis byte a byte
expected: Card do caso aberto pelo card inteiro: citações na lista sem texto, marca com await quando o texto chega, um só «Texto do candidato», cadeia sem âmbar, «Pontos de atenção», rótulos/selos/sinal/nível em 14px, dimensão em 600; D-20 e blocos imutáveis byte a byte
result: pass
source: automated
coverage_id: 52-12-D4

### 61. [52-13 D2] Estados honestos do contexto (carregando, erro com «Tentar novamente», vazio) e coerção estrita do serviço (só `disponivel` passa; 42501/P0002 classificados)
expected: Estados honestos do contexto (carregando, erro com «Tentar novamente», vazio) e coerção estrita do serviço (só `disponivel` passa; 42501/P0002 classificados)
result: pass
source: automated
coverage_id: 52-13-D2

### 62. [52-14 D1] Tracer: ensaio do bloco B sobre o estado vivo de PROD (VERDE, vistas=igual, 52l=20/20), mutacoes 8/8, deno 40/0, delta do vitest alteradas=0 novas=0 mordida=ok, lint 89, marcadores nos chunks certos, tipografia OK
expected: Tracer: ensaio do bloco B sobre o estado vivo de PROD (VERDE, vistas=igual, 52l=20/20), mutacoes 8/8, deno 40/0, delta do vitest alteradas=0 novas=0 mordida=ok, lint 89, marcadores nos chunks certos, tipografia OK
result: pass
source: automated
coverage_id: 52-14-D1

### 63. [52-14 D2] Review adversarial bloqueante sem critico, cobrindo o diff inteiro desde refs/gsd/52/base e o 52-15-PLAN, com nada fora de .planning mudado depois do reviewed_head
expected: Review adversarial bloqueante sem critico, cobrindo o diff inteiro desde refs/gsd/52/base e o 52-15-PLAN, com nada fora de .planning mudado depois do reviewed_head
result: pass
source: automated
coverage_id: 52-14-D2

### 64. [52-15 D1] Migrations 0001 e 0002 em PROD pelo p46apply com o portao no mesmo comando; ledger md5 = arquivo
expected: Migrations 0001 e 0002 em PROD pelo p46apply com o portao no mesmo comando; ledger md5 = arquivo
result: pass
source: automated
coverage_id: 52-15-D1

### 65. [52-15 D2] Smoke das leituras contra os objetos vivos verde (vistas=vacua) e 8/8 mutacoes pos-apply mordem
expected: Smoke das leituras contra os objetos vivos verde (vistas=vacua) e 8/8 mutacoes pos-apply mordem
result: pass
source: automated
coverage_id: 52-15-D2

### 66. [52-15 D3] EF ler-cadastro-candidato-rh ACTIVE com verify_jwt=true; chamada sem Authorization = 401
expected: EF ler-cadastro-candidato-rh ACTIVE com verify_jwt=true; chamada sem Authorization = 401
result: pass
source: automated
coverage_id: 52-15-D3

### 67. [52-15 D4] Cliente dos blocos A e B empurrado por sha (enumerado, 0 ALHEIO); origin/main..HEAD vazio; marcadores no ar
expected: Cliente dos blocos A e B empurrado por sha (enumerado, 0 ALHEIO); origin/main..HEAD vazio; marcadores no ar
result: pass
source: automated
coverage_id: 52-15-D4

### 68. [52-15 D6] database.types.ts regenerado sem truncar, com as tres RPCs; tsc 89 → 89
expected: database.types.ts regenerado sem truncar, com as tres RPCs; tsc 89 → 89
result: pass
source: automated
coverage_id: 52-15-D6

### 69. [52-16 D1] Parser, tabela de caracteres e gerador do banco SJT v2, com as recusas do contrato (contagem, alternativas, etiqueta, marcação, caso mantido divergente) e SQL determinístico
expected: Parser, tabela de caracteres e gerador do banco SJT v2, com as recusas do contrato (contagem, alternativas, etiqueta, marcação, caso mantido divergente) e SQL determinístico
result: pass
source: automated
coverage_id: 52-16-D1

### 70. [52-16 D2] Migration gerada ensaiada em PROD (aborta): quatro cargos 6+1, retirados=19 = baseline, mantidos=3, tabela_md5 do SQL = do script; smoke52b 9/9
expected: Migration gerada ensaiada em PROD (aborta): quatro cargos 6+1, retirados=19 = baseline, mantidos=3, tabela_md5 do SQL = do script; smoke52b 9/9
result: pass
source: automated
coverage_id: 52-16-D2

### 71. [52-17 D2] Migration 20261011000003 gerada do texto aprovado, idêntica a uma geração nova, ensaiada no arquivo exato sobre o estado vivo de PROD (aborta)
expected: Migration 20261011000003 gerada do texto aprovado, idêntica a uma geração nova, ensaiada no arquivo exato sobre o estado vivo de PROD (aborta)
result: pass
source: automated
coverage_id: 52-17-D2

### 72. [52-17 D3] Suíte Vitest inteira com a migration commitada: nenhum vermelho novo contra refs/gsd/52/base
expected: Suíte Vitest inteira com a migration commitada: nenhum vermelho novo contra refs/gsd/52/base
result: pass
source: automated
coverage_id: 52-17-D3

### 73. [52-17 D4] Mutações do banco (B1–B6) e do bloco B (L1–L8) mordem; controles verdes; nada persistiu
expected: Mutações do banco (B1–B6) e do bloco B (L1–L8) mordem; controles verdes; nada persistiu
result: pass
source: automated
coverage_id: 52-17-D4

### 74. [52-18 D1] Migration exata do banco v2 ensaiada sobre o estado vivo (Task 1, e de novo na Passo 0b, minutos antes do apply); mutações mordem
expected: Migration exata do banco v2 ensaiada sobre o estado vivo (Task 1, e de novo na Passo 0b, minutos antes do apply); mutações mordem
result: pass
source: automated
coverage_id: 52-18-D1

### 75. [52-18 D2] Banco SJT v2 aplicado em PROD pela via do projeto (portão + p46apply migrate no mesmo comando): ledger = arquivo, 6+1 nos quatro cargos, tabela = aprovada
expected: Banco SJT v2 aplicado em PROD pela via do projeto (portão + p46apply migrate no mesmo comando): ledger = arquivo, 6+1 nos quatro cargos, tabela = aprovada
result: pass
source: automated
coverage_id: 52-18-D2

### 76. [52-18 D3] Remap provado em PROD: 0 opcao_id fora de v4, pontuar_sjt = md5 do cabeçalho, mapa 32/8 vigente e fora do alcance de API, 0 resposta no id velho; checagem de forma WR-01 = 0
expected: Remap provado em PROD: 0 opcao_id fora de v4, pontuar_sjt = md5 do cabeçalho, mapa 32/8 vigente e fora do alcance de API, 0 resposta no id velho; checagem de forma WR-01 = 0
result: pass
source: automated
coverage_id: 52-18-D3

### 77. [52-18 D4] Push do bloco C com o database.types.ts do 52-15, por sha, enumerado; origin/main = HEAD logo após o push
expected: Push do bloco C com o database.types.ts do 52-15, por sha, enumerado; origin/main = HEAD logo após o push
result: pass
source: automated
coverage_id: 52-18-D4

### 78. [52-23 D1] O cabeçalho do hub mostra o e-mail do candidato com «Enviar e-mail» (mailto: com assunto da vaga, corpo vazio), lido pelo useCadastroCandidatoRh do 52-09, montado no HubCandidatoRH fora das abas
expected: O cabeçalho do hub mostra o e-mail do candidato com «Enviar e-mail» (mailto: com assunto da vaga, corpo vazio), lido pelo useCadastroCandidatoRh do 52-09, montado no HubCandidatoRH fora das abas
result: pass
source: automated
coverage_id: 52-23-D1

### 79. [52-23 D2] «Chamar no WhatsApp» com wa.me/55…, a mensagem pronta, target _blank e rel noopener noreferrer. Número fora do formato vira texto com a frase da Invariante 7
expected: «Chamar no WhatsApp» com wa.me/55…, a mensagem pronta, target _blank e rel noopener noreferrer. Número fora do formato vira texto com a frase da Invariante 7
result: pass
source: automated
coverage_id: 52-23-D2

### 80. [52-23 D3] Privacidade (JORN-53, SC2, D-40): fictício com celular no cadastro, tombstone e e-mail @INVALIDO.LOCAL. Os três mostram só «Sem contato disponível.», sem mailto:, wa.me, mensagem pronta, assunto, dígitos ou causa
expected: Privacidade (JORN-53, SC2, D-40): fictício com celular no cadastro, tombstone e e-mail @INVALIDO.LOCAL. Os três mostram só «Sem contato disponível.», sem mailto:, wa.me, mensagem pronta, assunto, dígitos ou causa
result: pass
source: automated
coverage_id: 52-23-D3

### 81. [52-23 D4] Estados: skeleton, erro com «Recarregar contato» (refetch), sem contato, sem título de vaga. O clique não dispara rede (D-15)
expected: Estados: skeleton, erro com «Recarregar contato» (refetch), sem contato, sem título de vaga. O clique não dispara rede (D-15)
result: pass
source: automated
coverage_id: 52-23-D4

### 82. [52-24 D1] «Respostas da inscrição» na aba Cadastro, abaixo de «Dados do cadastro», com a inscricao do mesmo useCadastroCandidatoRh
expected: «Respostas da inscrição» na aba Cadastro, abaixo de «Dados do cadastro», com a inscricao do mesmo useCadastroCandidatoRh
result: pass
source: automated
coverage_id: 52-24-D1

### 83. [52-24 D2] Grupos por bloco (rotuloDoBloco; vazio → Geral; desconhecido → o nome), <ol> na ordem da EF, ficha neutra, vazio sem causa, resposta por tipo, Sem resposta, nota de removida, código cru
expected: Grupos por bloco (rotuloDoBloco; vazio → Geral; desconhecido → o nome), <ol> na ordem da EF, ficha neutra, vazio sem causa, resposta por tipo, Sem resposta, nota de removida, código cru
result: pass
source: automated
coverage_id: 52-24-D2

### 84. [52-24 D3] Eliminatória com selo neutro e sem veredito, sem opção não escolhida (D-19, RNF-07a)
expected: Eliminatória com selo neutro e sem veredito, sem opção não escolhida (D-19, RNF-07a)
result: pass
source: automated
coverage_id: 52-24-D3

### 85. [52-24 D4] Links só http(s), por segmento, em aba nova com rel noopener noreferrer e aria-label; <script>/javascript:/data: como texto; LinkedIn/Instagram pela mesma regra
expected: Links só http(s), por segmento, em aba nova com rel noopener noreferrer e aria-label; <script>/javascript:/data: como texto; LinkedIn/Instagram pela mesma regra
result: pass
source: automated
coverage_id: 52-24-D4

### 86. [52-24 D5] O formulário do candidato segue idêntico depois da extração dos blocos
expected: O formulário do candidato segue idêntico depois da extração dos blocos
result: pass
source: automated
coverage_id: 52-24-D5

### 87. [52-25 D1] A contagem «N avaliações respondidas» aparece uma vez só no hub (defeito c). O «Ver respostas» saiu (D-52-U03)
expected: A contagem «N avaliações respondidas» aparece uma vez só no hub (defeito c). O «Ver respostas» saiu (D-52-U03)
result: pass
source: automated
coverage_id: 52-25-D1

### 88. [52-25 D2] O ScorecardAvaliacao monta aberto dentro da seção, logo depois da contagem, com as linhas que o número conta (C-8)
expected: O ScorecardAvaliacao monta aberto dentro da seção, logo depois da contagem, com as linhas que o número conta (C-8)
result: pass
source: automated
coverage_id: 52-25-D2

### 89. [52-25 D3] O dado vence a etapa: com linha sjt/big_five a seção é com_dados em inscricao/triagem. Sem linha a etapa ainda manda, e nao_se_aplica fica como estava
expected: O dado vence a etapa: com linha sjt/big_five a seção é com_dados em inscricao/triagem. Sem linha a etapa ainda manda, e nao_se_aplica fica como estava
result: pass
source: automated
coverage_id: 52-25-D3

### 90. [52-25 D4] Títulos de seção do hub em text-2xl fixo nos 5 lugares; p52_tipografia verde sobre os arquivos de tela do hub
expected: Títulos de seção do hub em text-2xl fixo nos 5 lugares; p52_tipografia verde sobre os arquivos de tela do hub
result: pass
source: automated
coverage_id: 52-25-D4

### 91. [52-26 D1] Gerador da 0005 (captura só leitura, troca ancorada, --conferir, --auto-teste) e a migration gerada = arquivo
expected: Gerador da 0005 (captura só leitura, troca ancorada, --conferir, --auto-teste) e a migration gerada = arquivo
result: pass
source: automated
coverage_id: 52-26-D1

### 92. [52-26 D2] WR-04 + F13 provados no ensaio que ABORTA sobre o PROD de agora (smoke52g 13/13, G1–G7 mordem)
expected: WR-04 + F13 provados no ensaio que ABORTA sobre o PROD de agora (smoke52g 13/13, G1–G7 mordem)
result: pass
source: automated
coverage_id: 52-26-D2

### 93. [52-26 D3] Nada antigo quebrou: p49 revisão/vigente verdes com e sem a 0005; delta Vitest alteradas=0 novas=0; lint 89; tipografia; build
expected: Nada antigo quebrou: p49 revisão/vigente verdes com e sem a 0005; delta Vitest alteradas=0 novas=0; lint 89; tipografia; build
result: pass
source: automated
coverage_id: 52-26-D3

### 94. [52-26 D4] A 0005 em PROD, provada contra o vivo (sessão B, Task 4 Passos 0–2)
expected: A 0005 em PROD, provada contra o vivo (sessão B, Task 4 Passos 0–2)
result: pass
source: automated
coverage_id: 52-26-D4

## Observações fora dos testes
<!-- Registradas pelo operador durante o UAT; não são falha do teste em que surgiram. -->

- origem: teste 6
  tipo: observação para a G-51-OP1
  texto: "No PAINEL, o card da candidatura rejeitada repete o problema que a 52-06 consertou no formulário: «Agradecemos seu interesse na Beauty Smile.» pequeno e cinza-claro sobre fundo claro, quase ilegível (DashboardCandidatoPage.tsx:429, a segunda ocorrência apontada no 51-17); o selo «Rejeitado» também tem baixo contraste."
  destino: "a decidir pelo operador no fecho do UAT (gap desta fase ou backlog)"

- origem: teste 6
  tipo: limpeza do bloco D
  texto: "Conta nova de teste +claude8 (casa +claudeN), criada neste UAT, com inscrição na Social Media e897f709 — registrar para a limpeza do bloco D."

## Summary

total: 94
passed: 92
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-52-2
  truth: "Na Prova cognitiva (Raven), a alternativa escolhida no item atual é inequivocamente visível antes de avançar — a prova não deixa voltar a item respondido."
  status: failed
  reason: "User reported: o estado SELECIONADO da alternativa é pouco visível — só um contorno turquesa fino sobre o fundo turquesa (print). Como a prova não deixa voltar a um item respondido, o candidato precisa enxergar com certeza o que marcou antes de avançar. Pedido: contorno grosso e de alto contraste (ex.: ring-4 branco ou escuro) + ícone de check no ladrilho escolhido; conferir o mesmo estado no celular."
  severity: minor
  test: 2
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis

- gap_id: G-52-4
  truth: "Com todas as avaliações concluídas, o painel do candidato não mostra prazo de conclusão que contradiga o «Próximo passo» («Avaliações concluídas — aguardando a equipe»)."
  status: failed
  reason: "User reported: [minor] A linha de prazo segue «Avaliação liberada — conclua em até 7 dias corridos. (Estimativa)» com todas as avaliações concluídas, contradizendo o «Próximo passo». A estimativa precisa refletir o estado concluído (ou sumir)."
  severity: minor
  test: 4
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis

- gap_id: G-52-4b
  truth: "O texto informativo do «Próximo passo» não tem aparência de botão (sem a mesma borda do «Retirar minha candidatura»)."
  status: failed
  reason: "User reported: [cosmetic] O texto do «Próximo passo» está numa caixa com borda igual à do botão «Retirar minha candidatura»: parece clicável sem ser. Sugestão: texto simples, sem borda."
  severity: cosmetic
  test: 4
  artifacts: []  # Filled by diagnosis
  missing: []    # Filled by diagnosis
