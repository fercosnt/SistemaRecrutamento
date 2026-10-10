---
phase: 51-consertos-da-jornada-bloco-3
plan: 17
subsystem: tipos gerados + sonda de aceite + sessão real em PROD (fecho da Phase 51)
tags: [jorn-42, jorn-43, jorn-44, jorn-45, jorn-46, jorn-47, jorn-48, jorn-49, lgpd, art-20, revisao-rejeicao, d-03, d-23, d-28, d-29, d-31, db-types, aceite, push, prod]
status: complete

requires:
  - phase: 51-consertos-da-jornada-bloco-3
    provides: "51-16: JORN-42 no ar (migrations 20261008000002..5, EFs notificar-candidato v19 / exportar-meus-dados v8 / executar-direito-titular v14, cliente em origin/main = 87be2703)"
provides:
  - "database.types.ts com revisao_rejeicao, solicitar/estado/responder_revisao_rejeicao, ler_contexto_knockout_revisao e origem/pedido_id na fila (diff só aditivo, +147/-0)"
  - "scripts/p51_aceite.cjs: sonda só-leitura por candidatura (--fase knockout|reaberta|reaberta-10min|rejeitada-rh|reaberta-2|raven, --rh2, --admin, --auto-teste com 203 afirmações)"
  - "aceite formal em PROD: as seis fases N/N numa só candidatura de teste (8e4bb7a0)"
  - "D-23 provado em sessão real: o decisor revertido foi recusado ao re-rejeitar"
  - "origin/main = HEAD depois do push por sha deste plano"
affects: [verificação da Phase 51, UAT do fim da fase, fila de consertos]

actuals:
  tokens: 25000        # chars/4 sobre o diff realizado: database.types.ts + scripts/p51_aceite.cjs + 51-17-SESSAO-REAL.md (75 775 chars de linhas acrescentadas) + este SUMMARY (~24 000 chars)
  tasks: 3             # Task 1 (executor), Task 2 (sessão real, operador + orquestrador), Task 3 (este fecho)
  commits: 6           # MEDIDO: git rev-list --count b2e37339..HEAD antes do commit deste SUMMARY
plan_head_before: b2e3733977166b2d0060fc009bbfba28c4c4989e
plan_head_after: bc14fafb92c528f48e54eeaf8717719ef623f45c

tech-stack:
  added: []
  patterns:
    - "db:types num arquivo temporário com `< /dev/null`, movido só se não vazio e com as marcas novas; o versionado nunca fica truncado"
    - "Sonda de aceite por fase, só leitura (`set transaction read only` em toda consulta), impersonação por request.jwt.claims + SET LOCAL ROLE; imprime só ids, booleanos e contagens"
    - "Log formal de aceite reiniciado por candidatura: evidência suplementar (procedimento divergente) fica registrada, mas não fecha o aceite"

key-files:
  created:
    - scripts/p51_aceite.cjs
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-17-SESSAO-REAL.md
    - .planning/phases/51-consertos-da-jornada-bloco-3/51-17-SUMMARY.md
  modified:
    - database.types.ts

key-decisions:
  - "Operador, 2026-10-10: «Publicar» database.types.ts e scripts/p51_aceite.cjs sem review adversarial (precedente do 50-11)"
  - "Operador, 2026-10-10: o Raven encerra como está, sem fazer a prova (era opcional); assunto do e-mail de liberação confirmado"
  - "Operador, 2026-10-10: o diálogo «Responder revisão» de um pedido humana_triagem não mostra motivo nem justificativa — deliberado, vai para o backlog (quem revisa usa o hub)"
  - "Operador: as ocorrências de UI/UX da sessão real não bloqueiam o aceite; vão para a fila de consertos"
  - "Orquestrador: as candidaturas 3a9254c3 e af02c120 (respondidas pelo admin, não pelo RH2) saem do aceite formal e ficam como evidência suplementar"

metrics:
  duration: "Task 1: 22:03:39 → 22:14:23 (2026-10-09); sessão real: 22:32:13 (2026-10-09) → 00:05:34 (2026-10-10); fecho: 2026-10-10"
  completed: 2026-10-10
---

# Phase 51 Plan 17: tipos do JORN-42, sonda de aceite e sessão real em PROD Summary

**Os tipos do banco conhecem o JORN-42 (tsc 89 → 89), a sonda só-leitura `scripts/p51_aceite.cjs` existe com auto-teste, e
o direito de revisão funcionou de ponta a ponta em PROD numa conta de teste: um knockout revertido pelo RH2, uma rejeição
do admin revertida pelo RH2, o D-23 recusando o decisor revertido e o Raven liberado no painel. As seis fases deram N/N
na candidatura `8e4bb7a0`.**

Privacidade: este SUMMARY traz só ids, booleanos, contagens e textos de interface. Não registra endereço de e-mail, nome
de candidato nem os aliases das contas de teste. Nas citações verbatim do operador, os aliases foram trocados por
`<alias>`, e o nome da conta de teste por `<conta de teste>`.

## Task 1 — `db:types` e a sonda de aceite (2026-10-09)

| Commit | Horário (-03) | O quê |
|---|---|---|
| `c39f3aa7` | 22:03:39 | `chore(51-17): db:types com revisao_rejeicao e as RPCs do JORN-42`: `database.types.ts`, +147/-0 |
| `df659588` | 22:11:46 | `test(51-17): RED — sonda de aceite …`: auto-teste com fixtures das seis fases |
| `f7233055` | 22:14:23 | `test(51-17): sonda de aceite so-leitura do JORN-42/43`: implementação (GREEN) |

**`db:types`.** Gerado pelo **binário do Supabase CLI 2.116.0 já instalado**, e não pelo `npx supabase` do plano. É a
mesma versão que o threat model T-51-SC nomeia, e nada foi instalado. A saída foi para um arquivo temporário com
`< /dev/null`, e o arquivo só foi movido com `revisao_rejeicao` e `estado_revisao_rejeicao` presentes. O diff é só
aditivo: a tabela `revisao_rejeicao`, `estado/solicitar/responder_revisao_rejeicao`, `ler_contexto_knockout_revisao` e
`origem`/`pedido_id` na fila.

**`tsc`: 89 → 89** (teto 90, D-53). O caminho acima de 90 não foi tomado, e nenhum `@ts-ignore` ou `any` entrou.

**Dívida nomeada: os 4 casts estreitos das RPCs novas** (51-12 e 51-14). Ficam porque removê-los é código novo depois do
review:

| Arquivo | Linha | Forma |
|---|---|---|
| `src/features/explicacao/services/explicacaoService.ts` | 391 | `supabase.rpc as unknown as (…)` |
| `src/features/explicacao/services/explicacaoService.ts` | 681 | `supabase.rpc as unknown as (…)` |
| `src/features/revisao/services/revisaoService.ts` | 360 | `supabase.rpc as unknown as (…)` |
| `src/features/revisao/services/revisaoService.ts` | 416 | `supabase.rpc as unknown as (…)` |

**Sonda.** `node scripts/p51_aceite.cjs <candidatura> --fase knockout|reaberta|reaberta-10min|rejeitada-rh|reaberta-2|raven
[--rh2 <id>] [--admin <id>]`. Toda consulta passa por `p46apply.cjs sql` e começa com `set transaction read only`. A
sonda recusa sem argumento (`SEM CANDIDATURA`, saída 2) e com fase fora do vocabulário (`FASE DESCONHECIDA`). O
auto-teste offline tem 203 afirmações, entre elas 23 mutações que o portão tem de morder. O formatador nunca imprime
e-mail, JWT ou texto livre, e o `user_id` do titular nunca sai.

## Task 2 — sessão real em PROD (2026-10-09 → 2026-10-10)

Fonte: `51-17-SESSAO-REAL.md`, colhido pelo orquestrador à medida que a sessão avançava. Os horários são -03. Ids fixos:
RH2 (recrutador) `af4ebf97-793c-42bb-a090-7ff19b401d06`; admin do passo 4 `66412f96-…`.

### Aceite formal: as seis fases numa só candidatura

Candidatura **`8e4bb7a0-7f7e-4474-9175-323e24e82d63`**, vaga `fdbe1a4a-…` (Consultor(a) de Relacionamento e Pré-vendas),
conta de teste marcada do operador.

O log `$TMPDIR/p51_17_aceite.log` está transcrito abaixo. O `.gitignore` recusa `*.log`.
```
FASE knockout: aceite: 13/13 conferencias OK
FASE reaberta: aceite: 20/20 conferencias OK
FASE reaberta-10min: aceite: 21/21 conferencias OK
FASE rejeitada-rh: aceite: 23/23 conferencias OK
FASE reaberta-2: aceite: 23/23 conferencias OK
FASE raven: aceite: 4/4 conferencias OK
```
O `<verify>` da Task 2 respondeu `aceite real completo: 6 fases N/N`, sem nenhuma string com forma de e-mail.

| Fase | Horário da sonda | Resultado | O que a sonda confirma |
|---|---|---|---|
| `knockout` | 2026-10-09 22:58:13 | 13/13 | knockout automático; notificação `decisao` entregue com o template `decisao_final` |
| `reaberta` | 2026-10-09 23:20:30 | 20/20 | `respondida_por_rh2` e `reabertura_ator_rh2`; reaberta às 23:19:13; análise despachada (D-36); knockout não voltou (77 s); funil não conta como knockout; motivo mantido (D-35); `pode_responder=false` na fila do RH2, porque o pedido já foi respondido |
| `reaberta-10min` | 2026-10-09 23:29:37 (619 s depois de `reaberta_em`) | 21/21 | candidatura segue `triagem`/`em_analise`; o knockout não voltou (D-03) |
| `rejeitada-rh` | 2026-10-09 23:43:35 | 23/23 | pedido 2 com `origem=humana_triagem`, `rejeitado_por`=admin, pendente e ligado à rejeição corrente; duas rejeições distintas (D-06); `pode_responder=false` para o admin (REVISAO-05) e `true` para o RH2; e-mail de decisão entregue; funil não conta como knockout |
| `reaberta-2` | 2026-10-10 00:01:23 | 23/23 | pedido 2 `revertida`, com decisor (admin) ≠ revisor (RH2) (REVISAO-05); reabertura com prazo e linha de histórico do RH2; `triagem`/`em_analise`, e a rejeição não voltou; e-mail `revisao_respondida` entregue; o titular vê origem `humana_triagem` com veredito `revertida` |
| `raven` | 2026-10-10 00:05:34 | 4/4 | `raven liberado=true registrado=false liberacoes_ativas=1`; notificação `cognitivo_liberado` entregue com o template `avaliacao_cognitiva_liberada` |

### Relatos do operador (verbatim, datados)

**Passo 1 (D-29), 2026-10-09** (`8e4bb7a0`):
> E-mail de rejeição recebido. Parágrafo do direito de pedir revisão: <sim>. Botão «Ver a explicação e pedir revisão»:
> <sim>. RH2 para o resto do ciclo: … = af4ebf97 (já logado, 22:54). Admin do passo 4: 66412f96 …

Na mesma conta de teste (2ª candidatura, mesmo dia), o operador confirmou o roteiro com «todos botoes sim, paragrafo de
pedir sim, pagina mostra texto de knockout sim». Na 1ª candidatura ele citou o parágrafo do e-mail: «Você pode pedir que
uma pessoa da nossa equipe revise esta decisão. É um direito seu (LGPD, Art. 20).» (D-09).

**Passos 2 e 3 (D-29), 2026-10-09** (`8e4bb7a0`):
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

**Passo 4, momento 1 (D-28), 2026-10-09** (`8e4bb7a0`):
> Admin <alias> (66412f96) rejeitou pelo diálogo do hub. Texto do diálogo: «Rejeitar <conta de teste>? Informe o motivo e uma
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

**Passo 4, momento 2 (D-28), 2026-10-10** (`8e4bb7a0`):
> RH2 (af4ebf97, <alias>) respondeu «revertida» ao pedido humana_triagem às 00:00:21, com a justificativa «Vamos reverter para
> dar mais uma chance a este candidato». Diálogo: Decisão original «Rejeitado / Rejeição pelo RH», Quem decidiu «RH2».

**Passo 6 (D-23 em sessão real, além do roteiro), 2026-10-10** (`8e4bb7a0`):
> o admin 66412f96 (<alias>) tentou rejeitar de novo pelo diálogo do hub e foi RECUSADO com, verbatim: «Você registrou a
> rejeição que foi revertida na revisão. Uma nova rejeição deste caso precisa ser registrada por outra pessoa do RH.»
> Conferido no banco: nenhuma linha de histórico depois de 00:00:21; candidatura em triagem/em_analise.

O orquestrador conferiu só por leitura: 0 linhas em `historico_candidatura` com `criado_em > 00:00:22`, e a candidatura
está `triagem/em_analise`. A trava D-23 da migration `20261008000005` funciona em PROD, e a mensagem própria do cliente
aparece.

**Passo 5 (JORN-43, Raven), 2026-10-10** (`8e4bb7a0`):
> liberei o Raciocínio lógico (Matrizes) no hub. E-mail recebido com assunto «<confirmar na caixa>» e corpo, verbatim: «A
> equipe da Beauty Smile liberou o Raciocínio lógico (Matrizes) para a sua candidatura à vaga Consultor(a) de
> Relacionamento e Pré-vendas. Ele está no seu painel, no cartão desta candidatura.» Painel do candidato …: o card da
> candidatura Consultor mostra «Em Análise», «Etapa atual: Triagem», «Em triagem — retorno em até 48 horas. (Estimativa)» e,
> em PRÓXIMO PASSO, o card «Raciocínio lógico (Matrizes) — A equipe liberou esta avaliação para a sua candidatura.» com o
> botão «Fazer a avaliação».

Assunto confirmado depois pelo operador (2026-10-10), verbatim: «O Raciocínio lógico (Matrizes) foi liberado para você».
O D-31 bate com o assunto que o plano previa. **A prova não foi feita.** Ela era opcional, e o operador encerrou como
está. Por isso a parte «o card some e `registrado = true`» ficou sem prova; a fase `raven` provou `liberado=true
registrado=false`.

### Evidência suplementar (fora do aceite formal)

**`3a9254c3-8086-42df-8d81-42889c3a1f8d`** (vaga `fdbe1a4a-…`), 2026-10-09:
- `knockout` 13/13 às 22:32:13, com notificação `decisao` entregue e `funil kpi_knockouts=3`. Relato do operador sobre o
  e-mail (verbatim): «Parágrafo, verbatim: «Você pode pedir que uma pessoa da nossa equipe revise esta decisão. É um
  direito seu (LGPD, Art. 20).» Botão «Ver a explicação e pedir revisão»: sim. Link de reserva:
  /auth/login?redirect=%2Fcandidato%2Fexplicacao%2F3a9254c3-8086-42df-8d81-42889c3a1f8d.»
- O pedido foi respondido «revertida» às 22:35, **logado como admin (`66412f96`) e não como o RH2**. Relato verbatim:
  «⚠ DIVERGÊNCIA DE PROCEDIMENTO: respondi logado como ADMIN (user 66412f96…, administrador ativo), não como o RH2
  af4ebf97…. O banco mostra respondida_por = 66412f96.»
- `reaberta` deu 18/20 às 22:36:57. As duas FALHAs são de autor (`revisao:respondida_por_rh2`,
  `historico:reabertura_ator_rh2`), e todo o resto passou.
- `reaberta-10min`: às 22:44:31 deu `FALHA cedo-demais` (571 s de 600). Às 22:45:04, 601 s depois de `reaberta_em`, deu
  **19/21**. As duas FALHAs são as de autor, `knockout:nao_voltou` = 0, e a candidatura segue `triagem`/`em_analise`:
  **D-03 provado, o knockout não voltou depois de 10 minutos.**

**`af02c120-6c5e-4786-a619-7dd7e5d35b11`** (vaga `e897f709-…`, Social Media), 2026-10-09:
- `knockout` 13/13 às 22:44:31.
- Leitura só-leitura às 22:58: o pedido `192511a2-…` foi respondido «revertida» às 22:47:42 **pelo admin `66412f96`**, não
  pelo RH2. A candidatura ficou em `triagem`/`em_analise`. Ela saiu do aceite formal.

**Causa das duas respostas pelo admin** (relato verbatim do operador, 2026-10-10): «Nomes no cadastro: o admin 66412f96
(<alias>) se chama «RH2» no sistema; o recrutador af4ebf97 (<alias>), que o plano chama de RH2, se chama «RH3». «Quem decidiu:
RH2» está correto (o admin). Foi a causa das duas respostas pelo admin errado.»

## Task 3 — publicação

**Resposta do operador** (2026-10-10, AskUserQuestion), à pergunta sobre publicar `database.types.ts` e
`scripts/p51_aceite.cjs` sem review adversarial (precedente do 50-11): «**Publicar**».

O push é feito por sha, depois do commit deste SUMMARY, com o comando da Task 3. O resultado está no relatório do
executor ao orquestrador, porque o push vem depois deste arquivo.

### Itens para a UAT do fim da fase (`<human-check>` da Task 3)

- [ ] **JORN-44**: em `/candidato/avaliacao/<id>` de uma candidatura em avaliação assíncrona, «Ir ao painel» aparece no
  cabeçalho, ao lado de «Sair». No estado «você concluiu todas as avaliações», há um botão «Ir ao painel» abaixo da frase.
  Os dois levam ao painel.
- [ ] **JORN-46**: dentro da redação, da SJT, do caso prático, do Big Five e da devolutiva, o botão diz «Voltar às
  avaliações» e leva à lista. Com a etapa já avançada, «Ir ao painel» leva direto ao painel.
- [ ] **JORN-45**: no hub do RH de uma candidatura com avaliações, «N avaliações respondidas» + «Ver respostas» abre o
  detalhe no lugar. O Big Five diz «Concluído» ou «Não fez», sem número. No caso prático, o texto do candidato aparece ao
  lado das citações.
- [ ] **JORN-48**: no hub, «Prova cognitiva» (ou «Não se aplica a esta vaga», quando a vaga não a aplica) aparece logo
  acima do bloco «Raciocínio lógico (Matrizes)». No container do candidato aparece o card «Prova cognitiva», e na tela do
  Raven o título é «Raciocínio lógico (Matrizes)».
- [ ] **JORN-47**: no workspace de entrevista, com as notas vazias, o «Salvar avaliação» fica desabilitado e a tela diz
  «Escreva as notas do gestor para salvar a avaliação.».
- [ ] **JORN-49**: na página de privacidade do candidato, a prévia do recibo de exclusão lista CEP, rua, número,
  complemento, bairro e cidade (e não «endereço»). Em «mantém», aparece «Estado e faixa etária» com «LGPD, Art. 16, IV».

## Ocorrências para a fila de consertos (o operador decidiu que não bloqueiam)

1. **UX, o link do e-mail leva ao login mesmo com sessão.** O link aponta para `/auth/login?redirect=…`, e a
   `LoginCandidatoPage` só aplica o `redirect` depois do submit, sem conferir se já há sessão. Um candidato logado vê o
   formulário de novo. Na 1ª tentativa, o autofill entrou com outra conta de teste do operador (candidato `03f3b61d`), e a
   página mostrou «Esta página não está disponível», que é o correto para outra conta.
2. **UI, a área board não tem volta ao dashboard.**
3. **UI, o texto «Agradecemos seu interesse na Beauty Smile.» deveria estar em branco**
   (`src/components/pages/FormularioCandidaturaPage.tsx:547`; o mesmo texto aparece em
   `src/components/pages/DashboardCandidatoPage.tsx:429`).
4. **UI, `SelectItem`: no hover fica branco sobre branco.** No Select «Motivo da rejeição», o item sob o mouse fica com
   texto branco sobre fundo branco e ilegível (no print era «Reprovado na entrevista»). Provavelmente é o estilo de
   foco/hover do `SelectItem` compartilhado; vale conferir os outros Selects do RH.
5. **Cadastro, os nomes estão trocados:** o admin `66412f96` se chama «RH2» e o recrutador `af4ebf97` se chama «RH3».
6. **Backlog de produto, por decisão deliberada do operador:** o pedido `humana_triagem` não mostra motivo nem justificativa
   no diálogo «Responder revisão». Relato verbatim: «Pendência de produto, decidida pelo operador: NÃO consertar agora. No
   pedido humana_triagem, o diálogo «Responder revisão» não mostra o motivo nem a justificativa da rejeição. É deliberado:
   a fila não projeta justificativa (p42 (d), com portão em 20261008000003:665). Mostrar exigiria uma RPC de leitura
   própria, como a do contexto do knockout. Fica no backlog; quem revisa usa o hub.»

## Pendências herdadas do 51-16 (sem conserto aqui)

- **WR-01 do review -3:** o decisor revertido ainda re-rejeita por PATCH direto em `candidaturas` (policy
  `rh_avanca_etapa`), e isso contorna o D-23. O passo 6 provou a trava só pelo caminho da RPC, que é o que a interface
  oferece. O conserto proposto (`guard_rejeicao_auditada` exigir `app.rejeicao_sancionada` para `auth.uid()` não nulo) é
  um plano próprio, com review.
- **WR-02 do review -3:** o filtro `h.decisao = 'rejeitado'` do ramo arquivo de `rejeitar_candidatura` não tem mutação nem
  sonda.
- As demais pendências listadas no `51-16-SUMMARY.md` (IN-01..IN-03 e IN-06 do -3, WINDOWS 89 e 91-93, 51-03, 51-14,
  IN-16) seguem como estavam.

## Deviations from Plan

1. **[Procedimento] Duas candidaturas respondidas pelo admin, e não pelo RH2.** Em `3a9254c3` e em `af02c120`, o pedido
   foi respondido pelo admin `66412f96`, porque os nomes do cadastro estão trocados (ocorrência 5). A sonda reprovou a
   perna do autor, como devia. As duas ficaram como evidência suplementar, e o aceite formal foi refeito na `8e4bb7a0` com
   o RH2 de verdade. A `3a9254c3` deu 19/21 em `reaberta-10min`, com as duas FALHAs de autor, e provou o D-03.
2. **[Roteiro] Nome do botão.** O plano dizia «Solicitar revisão por pessoa natural». Na tela, o botão é «Pedir que uma
   pessoa revise esta decisão», texto substituído na Phase 43 (`SolicitarRevisaoCTA.tsx:61`). Não é defeito.
3. **[Extra ao roteiro] Passo 6, o D-23 em sessão real.** A recusa ao decisor revertido foi provada em PROD, com a mensagem
   do cliente.
4. **[Opcional não feito] Prova do Raven.** O card sumir e `registrado = true` ficaram sem prova, por decisão do operador.
5. **[Ferramenta] `db:types` pelo binário 2.116.0 instalado** em vez do `npx supabase`. É a mesma versão, e nada foi
   instalado.
6. **[Registro] Log de aceite fora do git.** O `.gitignore` recusa `*.log`, por isso o log está transcrito no
   `51-17-SESSAO-REAL.md` e aqui.

Nenhuma escrita em PROD pelo executor: toda conferência foi só leitura, e todo passo humano foi do operador.

## Known Stubs

Nenhum. `scripts/p51_aceite.cjs` é ferramenta local só-leitura, e `database.types.ts` é gerado.

## Self-Check

- FOUND: `database.types.ts` (com `revisao_rejeicao` e `estado_revisao_rejeicao`), `scripts/p51_aceite.cjs`,
  `51-17-SESSAO-REAL.md`.
- FOUND: `c39f3aa7`, `df659588`, `f7233055`, `5520fd4c`, `702727e4`, `bc14fafb`, todos ancestrais de HEAD.
- `commits: 6` medido de `b2e37339..HEAD` antes do commit deste SUMMARY.

## Self-Check: PASSED
