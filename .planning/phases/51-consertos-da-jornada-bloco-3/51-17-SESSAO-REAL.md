# 51-17 — Registro da sessão real (Task 2), colhido pelo orquestrador

Este arquivo guarda os relatos do operador e as saídas da sonda à medida que a sessão avança. O `51-17-SUMMARY.md`
copia daqui. Só ids, booleanos e contagens; a conta de teste é do operador e o endereço dela não fica registrado.

Candidatura: `3a9254c3-8086-42df-8d81-42889c3a1f8d` · vaga `fdbe1a4a-0c15-4659-a589-e9d8f2f9ff98` (Consultor(a) de
Relacionamento e Pré-vendas) · RH2 `af4ebf97-793c-42bb-a090-7ff19b401d06` · admin `4fceff36-8c42-40a5-ad11-48bf0fc6cc81`
(padrão; confirmar no passo 4).

## Passo 1 (D-29, knockout) — 2026-10-09

**Relato do operador** (verbatim):
> Passo 1 feito. … E-mail de rejeição recebido. Parágrafo, verbatim: «Você pode pedir que uma pessoa da nossa equipe
> revise esta decisão. É um direito seu (LGPD, Art. 20).» Botão «Ver a explicação e pedir revisão»: sim. Link de reserva:
> /auth/login?redirect=%2Fcandidato%2Fexplicacao%2F3a9254c3-8086-42df-8d81-42889c3a1f8d.

**Sonda** (22:32:13 -03): `node scripts/p51_aceite.cjs 3a9254c3-… --fase knockout --rh2 af4ebf97-…` →
**`aceite: 13/13 conferencias OK`**. Mais alguns valores da saída: `notificacao evento=decisao status=entregue template=decisao_final`,
`funil kpi_knockouts=3`, `estado_titular origem=automatica elegivel=true`.

**Ocorrências relatadas** (não bloqueiam o aceite; vão para o SUMMARY e para a fila de consertos):
1. **UX, link do e-mail.** Ele leva a `/auth/login?redirect=…`, e a `LoginCandidatoPage` só aplica o `redirect` depois do
   submit; ela não confere se já há sessão. Um candidato logado vê o formulário de novo. Na 1ª tentativa, o autofill entrou
   com outro alias do operador (candidato `03f3b61d`), e a página mostrou «Esta página não está disponível», que é o
   correto para outra conta. Com a conta certa, a explicação abriu com o texto de knockout.
2. **UI.** Na área board, não há botão para voltar ao dashboard.
3. **UI.** Na página de inscrição recebida, «Agradecemos seu interesse na Beauty Smile.» deve ficar em branco
   (`FormularioCandidaturaPage.tsx:547`; o mesmo texto aparece em `DashboardCandidatoPage.tsx:429`).

## Passos 2 e 3 (D-29, pedido e resposta) — 2026-10-09

**Relato do operador** (verbatim):
> Passo 3: em /rh/revisoes o pedido apareceu com o selo «Knockout» e o autor «Automático»; a pergunta, a resposta e a opção
> eliminatória conferiram; respondi «revertida» com justificativa de 50+ caracteres às 22:35.
> ⚠ DIVERGÊNCIA DE PROCEDIMENTO: respondi logado como ADMIN (user 66412f96…, administrador ativo), não como o RH2
> af4ebf97…. O banco mostra respondida_por = 66412f96. […]

O passo 2 não tem relato verbatim próprio: o operador o deu como «feito» junto com o passo 3, e o pedido aparece na sonda.

**Sonda** (22:36:57 -03), `--fase reaberta --rh2 af4ebf97-…` → **`aceite: 18/20`**. As duas FALHAs são as previstas
pelo operador: `revisao:respondida_por_rh2` e `historico:reabertura_ator_rh2`. O ator é um admin, não o RH2. Todo o resto
passou:
- reabertura em `triagem`, veredito `revertida`, `reaberta_em` e prazo presentes;
- candidatura `triagem`/`em_analise`, `motivo_rejeicao` ainda knockout (D-35);
- análise despachada depois da reabertura (D-36), e o knockout não voltou (D-03, 115 s);
- o funil deixou de contar a candidatura como knockout;
- e-mails `revisao_solicitada` (×4, para o RH) e `revisao_respondida` entregues;
- o RH2 continua vendo a candidatura;
- na fila do RH2, `pode_responder=false`, porque o pedido já foi respondido.

**Disposição:** esta candidatura não fecha o aceite formal (a perna do RH2 falhou por procedimento, não por defeito). Ela
continua como evidência suplementar do D-03 (`reaberta-10min` a partir de 22:45). O aceite formal das seis fases é refeito
numa 2ª candidatura da mesma conta de teste, na vaga `e897f709`, com o RH2 de verdade. No passo 4, quem rejeita é o admin
`66412f96-…`.

## 2ª candidatura (aceite formal) — passo 1 (D-29, knockout) — 2026-10-09

Candidatura: `af02c120-6c5e-4786-a619-7dd7e5d35b11` · vaga `e897f709-d4e7-4f6c-a25b-a433d2eda525` (Social Media — Produção e
Captação de Conteúdo). **Mudança relatada pelo operador:** a conta de teste é outra, nova, criada pelo cadastro normal,
com a mesma convenção (alias do Gmail do operador). O endereço não fica registrado.

**Relato do operador:** o e-mail de rejeição chegou e a explicação abriu, já logado. Os três itens do roteiro
(parágrafo do direito, botão e texto de knockout) chegaram com os marcadores `<sim/não>` não preenchidos; pedi
confirmação, ver adiante.

**Sonda** (22:44:31 -03), `--fase knockout` → **`aceite: 13/13 conferencias OK`**. A notificação `decisao` foi entregue
com o template `decisao_final`.

**Evidência suplementar, 1ª candidatura:** às 22:44:31 a `reaberta-10min` da `3a9254c3` deu `FALHA cedo-demais` (571 s
de 600), mais as duas falhas de autor já conhecidas. Ela foi refeita depois dos 10 minutos (abaixo).

**Evidência suplementar do D-03 na 1ª candidatura** (22:45:04 -03, 601 s depois de `reaberta_em`): `--fase reaberta-10min`
→ `aceite: 19/21`. As duas únicas FALHAs são as de autor já conhecidas (admin em vez do RH2). `knockout:nao_voltou` deu 0,
e a candidatura segue `triagem`/`em_analise`: **o knockout não voltou depois de 10 minutos**.

**Confirmação do operador sobre o passo 1 da 2ª candidatura** (verbatim): «todos botoes sim, paragrafo de pedir sim, pagina
mostra texto de knockout sim». O texto que ele colou da página de explicação, verbatim:

> Sobre a sua candidatura
> Sua candidatura foi encerrada automaticamente na inscrição, sem avaliação de uma pessoa e sem passar pelas etapas do processo.
>
> Por que esta decisão
>
> Esta vaga define alguns requisitos objetivos de elegibilidade, e uma das respostas que você deu no formulário de inscrição
> não atende a um deles. Por isso a sua candidatura foi encerrada logo na inscrição, sem passar pelas etapas de avaliação.
> Nenhuma nota, análise ou perfil foi usado nesta decisão. Ela vale para esta vaga nesta seleção e não impede que você se
> candidate a outras.
>
> Agradecemos seu interesse e o tempo dedicado ao processo.
>
> Você pode pedir que uma pessoa da nossa equipe revise esta decisão. É um direito seu (LGPD, Art. 20).
>
> Pedir que uma pessoa revise esta decisão
> Voltar ao painel

Observação: o roteiro do plano chamava o botão de «Solicitar revisão por pessoa natural»; na tela ele aparece como «Pedir
que uma pessoa revise esta decisão». A página diz que nenhuma pessoa avaliou («sem avaliação de uma pessoa»), como pede o
passo 2.

## 2ª candidatura — o que o banco mostra (o operador não relatou)

Leitura só-leitura às 22:58: o pedido da `af02c120` (`192511a2-…`) foi respondido «revertida» às **22:47:42** por
`66412f96-…` (admin), não pelo RH2. A candidatura está em `triagem`/`em_analise`. Ela também sai do aceite formal; o
operador passou a uma 3ª candidatura.

## 3ª candidatura (aceite formal) — passo 1 (D-29, knockout) — 2026-10-09

Candidatura: `8e4bb7a0-7f7e-4474-9175-323e24e82d63` · vaga `fdbe1a4a-…` (Consultor(a) de Relacionamento e Pré-vendas) ·
mesma conta de teste nova da 2ª.

**Relato do operador** (verbatim): «E-mail de rejeição recebido. Parágrafo do direito de pedir revisão: <sim>. Botão «Ver
a explicação e pedir revisão»: <sim>. RH2 para o resto do ciclo: … = af4ebf97 (já logado, 22:54). Admin do passo 4:
66412f96 …».

**Sonda** (22:58:13 -03), `--fase knockout` → **`aceite: 13/13 conferencias OK`**, com notificação `decisao` entregue.
O log formal (`$TMPDIR/p51_17_aceite.log`) foi reiniciado para esta candidatura.

## 3ª candidatura — passos 2 e 3 (D-29, pedido e resposta pelo RH2) — 2026-10-09

**Relato do operador** (verbatim):
> Passo 2 (candidato …): a explicação mostra, verbatim, «Sua candidatura foi encerrada automaticamente na inscrição, sem
> avaliação de uma pessoa e sem passar pelas etapas do processo.» e «Nenhuma nota, análise ou perfil foi usado nesta
> decisão.». Botão «Pedir que uma pessoa revise esta decisão» (o checkpoint citava «Solicitar revisão por pessoa natural»,
> substituído na Phase 43, SolicitarRevisaoCTA.tsx:61). Abriu a confirmação «Pedir revisão desta decisão?» / «Sua
> solicitação será enviada à equipe responsável, que revisará a decisão. Acompanhe o andamento pelo seu painel.» → «Pedir
> revisão». Toast: «Solicitação enviada. A equipe responsável foi notificada.» O botão ficou desabilitado, com «Você já
> solicitou a revisão desta decisão.» abaixo.
> E-mail ao RH recebido: «Foi registrado um pedido de revisão de decisão referente à vaga Consultor(a) de Relacionamento e
> Pré-vendas. […] Ele deve ser respondido pela fila — não por resposta a este e-mail.», com botão «Abrir a fila de revisões».
>
> Passo 3 (RH2 = …, af4ebf97): em /rh/revisoes o pedido apareceu com o selo «Knockout» e quem decidiu «Automático». O
> diálogo «Responder revisão» mostra o candidato, a vaga, a decisão original «Rejeitado», quem decidiu «Automático
> (knockout)», o pedido feito em 09/10/2026 e o bloco «O que encerrou a candidatura»: a pergunta eliminatória «Qual é a sua
> disponibilidade para esta vaga, que é presencial na clínica, de segunda a sexta, das 9h às 19h?», a resposta do candidato
> e a opção que encerrou, ambas «Tenho disponibilidade apenas para trabalho remoto». Escolhi «Reverter decisão»,
> justificativa com 50+ caracteres, «Registrar resposta». Confirmação: «Reabrir a candidatura? A candidatura volta para a
> etapa de triagem e precisa de uma nova decisão em até 10 dias corridos. […]» → «Registrar e reabrir».
> Conferido no banco: respondida_por = af4ebf97, reaberta às 23:19:13.

**Sonda** (23:20:30 -03), `--fase reaberta --rh2 af4ebf97-…` → **`aceite: 20/20 conferencias OK`**. Inclui
`respondida_por_rh2` e `reabertura_ator_rh2`, análise despachada (D-36), knockout não voltou (77 s), funil não conta como
knockout, motivo mantido (D-35), e `pode_responder=false` na fila do RH2 (pedido já respondido).

**Sonda** (23:29:37 -03, 619 s depois de `reaberta_em`), `--fase reaberta-10min` → **`aceite: 21/21 conferencias OK`**.
A candidatura segue `triagem`/`em_analise`, e o knockout não voltou (D-03). Liberado o passo 4.

## 3ª candidatura — passo 4, momento 1 (D-28, rejeição pelo admin e novo pedido) — 2026-10-09

**Relato do operador** (verbatim; o nome da conta de teste no título do diálogo foi trocado por `<conta de teste>`):
> Admin +rh2 (66412f96) rejeitou pelo diálogo do hub. Texto do diálogo: «Rejeitar <conta de teste>? Informe o motivo e uma
> justificativa (mínimo 50 caracteres). Esta ação move o candidato para "Rejeitado" e fica registrada na trilha de
> auditoria. Você pode reverter manualmente depois.» Com o aviso «O candidato pode baixar este texto: a justificativa entra
> na cópia de dados que ele pede pela LGPD (Art. 18, II). Escreva com fatos, do jeito que você assinaria.» Motivo: «Perfil
> desalinhado com a vaga». Justificativa de teste com 50+ caracteres.
>
> Candidato …: a explicação mudou para o texto de rejeição humana, «Após a análise da sua candidatura por uma pessoa da
> nossa equipe, decidimos não seguir com ela nesta vaga.». Pedi a revisão: confirmação «Pedir revisão desta decisão?» →
> «Pedir revisão». O botão ficou desabilitado, com «Você já solicitou a revisão desta decisão.».
>
> Fila como admin 66412f96: o botão de responder do pedido novo está DESABILITADO, com «Você registrou esta decisão.»
> abaixo; o tooltip diz «Quem registrou a decisão não pode responder à revisão dela. Encaminhe este pedido a outra pessoa do
> RH ou a um administrador.»

**Ocorrência de UI** (não bloqueia): no Select «Motivo da rejeição», o item sob o mouse fica com texto branco sobre fundo
branco, ilegível (no print era a opção «Reprovado na entrevista»). Provavelmente é o estilo de foco/hover do `SelectItem`
compartilhado; vale conferir os outros Selects do RH.

**Sonda** (23:43:35 -03), `--fase rejeitada-rh --rh2 af4ebf97-… --admin 66412f96-…` → **`aceite: 23/23 conferencias OK`**.
Ela confirma:
- pedido 2 com `origem=humana_triagem`, `rejeitado_por=admin`, ainda pendente e ligado à rejeição corrente;
- duas rejeições distintas (D-06);
- na fila, `pode_responder=false` para o admin (REVISAO-05) e `true` para o RH2;
- e-mail de decisão da rejeição pelo RH entregue;
- o funil não conta a candidatura como knockout.

## 3ª candidatura — passo 4, momento 2 (D-28, resposta pelo RH2) — 2026-10-10

**Relato do operador** (verbatim):
> RH2 (af4ebf97, +rh6) respondeu «revertida» ao pedido humana_triagem às 00:00:21, com a justificativa «Vamos reverter para
> dar mais uma chance a este candidato». Diálogo: Decisão original «Rejeitado / Rejeição pelo RH», Quem decidiu «RH2».
>
> 1. Nomes no cadastro: o admin 66412f96 (+rh2) se chama «RH2» no sistema; o recrutador af4ebf97 (+rh6), que o plano chama
>    de RH2, se chama «RH3». «Quem decidiu: RH2» está correto (o admin). Foi a causa das duas respostas pelo admin errado.
> 2. Pendência de produto, decidida pelo operador: NÃO consertar agora. No pedido humana_triagem, o diálogo «Responder
>    revisão» não mostra o motivo nem a justificativa da rejeição. É deliberado: a fila não projeta justificativa (p42 (d),
>    com portão em 20261008000003:665). Mostrar exigiria uma RPC de leitura própria, como a do contexto do knockout. Fica no
>    backlog; quem revisa usa o hub.

**Sonda** (2026-10-10 00:01:23 -03), `--fase reaberta-2 --rh2 af4ebf97-… --admin 66412f96-…` → **`aceite: 23/23
conferencias OK`**. Ela confirma:
- pedido 2 `revertida`, com o decisor (admin) diferente do revisor (RH2) (REVISAO-05);
- reabertura com prazo e linha de histórico de autoria do RH2;
- candidatura em `triagem`/`em_analise`, e a rejeição não voltou;
- e-mail `revisao_respondida` entregue;
- o titular vê a origem `humana_triagem` com veredito `revertida`.

## 3ª candidatura — passo 6 (D-23 em sessão real, extra ao roteiro) — 2026-10-10

**Relato do operador** (verbatim):
> o admin 66412f96 (+rh2) tentou rejeitar de novo pelo diálogo do hub e foi RECUSADO com, verbatim: «Você registrou a
> rejeição que foi revertida na revisão. Uma nova rejeição deste caso precisa ser registrada por outra pessoa do RH.»
> Conferido no banco: nenhuma linha de histórico depois de 00:00:21; candidatura em triagem/em_analise.

**Conferência do orquestrador** (só leitura): 0 linhas em `historico_candidatura` com `criado_em > 00:00:22`, candidatura
`triagem/em_analise`. A trava D-23 da migration `20261008000005` funciona em PROD, e a mensagem própria do cliente aparece.

## 3ª candidatura — passo 5 (JORN-43, Raven) — 2026-10-10

**Relato do operador** (verbatim):
> liberei o Raciocínio lógico (Matrizes) no hub. E-mail recebido com assunto «<confirmar na caixa>» e corpo, verbatim: «A
> equipe da Beauty Smile liberou o Raciocínio lógico (Matrizes) para a sua candidatura à vaga Consultor(a) de
> Relacionamento e Pré-vendas. Ele está no seu painel, no cartão desta candidatura.» Painel do candidato …: o card da
> candidatura Consultor mostra «Em Análise», «Etapa atual: Triagem», «Em triagem — retorno em até 48 horas. (Estimativa)» e,
> em PRÓXIMO PASSO, o card «Raciocínio lógico (Matrizes) — A equipe liberou esta avaliação para a sua candidatura.» com o
> botão «Fazer a avaliação».

O assunto do e-mail ficou com o marcador `<confirmar na caixa>`. O corpo nomeia o instrumento (D-31).

**Sonda** (00:05:34 -03), `--fase raven` → **`aceite: 4/4 conferencias OK`**:
- `raven liberado=true registrado=false liberacoes_ativas=1`;
- notificação `cognitivo_liberado` entregue com o template `avaliacao_cognitiva_liberada`.

## Aceite formal — as seis fases numa só candidatura (`8e4bb7a0`)

Cópia do log em `51-17-aceite.log`:
```
FASE knockout: aceite: 13/13 conferencias OK
FASE reaberta: aceite: 20/20 conferencias OK
FASE reaberta-10min: aceite: 21/21 conferencias OK
FASE rejeitada-rh: aceite: 23/23 conferencias OK
FASE reaberta-2: aceite: 23/23 conferencias OK
FASE raven: aceite: 4/4 conferencias OK
```
O `<verify>` da Task 2 respondeu `aceite real completo: 6 fases N/N`, sem nenhuma string com forma de e-mail.
