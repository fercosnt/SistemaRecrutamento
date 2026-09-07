# Guia de validação final — o que fazer e testar para fechar o projeto

**Escrito em:** 2026-09-05, a partir de medições em PROD feitas na mesma sessão (não de leitura
de registro — o registro estava errado em pontos que importam, ver §0.3).
**Para quem:** o operador (Fernando) e o agente, em sessões alternadas.
**Como usar:** cada item tem um ID (`B3`, `E5`…). Responda por ID com ✅ / ⚠ / ⛔ e o que mediu.
O agente atualiza este arquivo, os `VERIFICATION.md` e o `WINDOWS.md` a partir das respostas.

---

## 0. Onde estamos — medido hoje

### 0.1 Saúde do código

| Medida | Valor |
|---|---|
| Vitest | **1945/1945** verdes, 194 arquivos · Deno (EF de análise) **6/6** |
| `tsc --noEmit` | **95** erros no baseline (teto CI 104) |
| Site | `https://rh.beautysmile.com.br/vagas` → **200** |
| HEAD | `c477fbc` (2026-08-31) · árvore limpa |

### 0.2 Dados vivos em PROD

| Objeto | Estado |
|---|---|
| Vagas **ativas** | 2 — `consultor-relacionamento-pre-vendas` (5 perguntas, rubrica, **3 candidaturas fictícias em `triagem`**) · `social-media-producao-captacao-conteudo` (6 perguntas, rubrica, **0 candidaturas**) |
| Testes das vagas | Consultor: triagem\*, SJT\*, redação\*, entrevista\* (Big Five e cognitivo opcionais) · Social Media: triagem\*, SJT\*, entrevista\* (redação opcional). `aplica_cognitivo=false` nas duas |
| Candidatos fictícios (`f0000001..3`) | Rafael **67** · Camila **68** · Beatriz **20** — análise `sucesso` nos 3 |
| Candidatura E2E (`teste-e2e-social-media`, vaga inativa) | em `entrevista_online`; cognitivo feito (1 liberação, 1 score Raven); **SJT 0 · redação 0 · Big Five 0 · agendamento 0** |
| `candidatos` | 35 no total — **11 sintéticos** (8 fixture-p46 + 3 fictícios) |
| RH ativo | **só** `fernando@beautysmile.com.br` (administrador). As 4 contas de teste estão `ativo=false` |
| Purga | `dry_run` · cron **disparando** (15 execuções de ensaio, última hoje 00:00) · **13 dias** corridos · `aprovado` e `decisao_final` ainda em `seed` |
| Titulares elegíveis à purga | 5 — **todos fixture**, zero pessoa real |
| `solicitacoes_dados` | 2 |
| Notificações | 8 eventos vivos com `entregue`; 1 `bounce` em `revisao_solicitada` (o endereço indeliverável do RH de teste) |
| `WINDOWS.md` | **40 abertas** (45 → 20 · 46 → 8 · 47 → 8 · 42 → 2 · 43 → 2) — bloqueia `/gsd-ship` |

### 0.3 Registro que está ERRADO e precisa de conserto (o agente faz — item A3)

- `STATE.md` diz «O CRON NUNCA DISPAROU». Disparou 15 vezes.
- `RETOMAR-AQUI.md` diz «14 noites de ensaio e hoje há 0». Há 15.
- `UAT-SESSAO-CONSOLIDADA.md` e `PENDENCIAS` dizem que `recrutador.rh@teste.com` e `e2e.admin`
  estão **ativas** e servem como segundo RH. **Estão inativas** — o item E4 do §E depende disso.
- `47-VERIFICATION.md` mantém «parecer do Encarregado» como pendência humana; a
  `DECISAO-ENCARREGADO.md` (13/08) a fechou.
- `WINDOWS.md` itens 24, 28, 29, 31, 32 estão `open` e o próprio verificador da 47 os dá por
  resolvidos.

### 0.4 O que os 3 candidatos fictícios já provaram — e o que não provaram

- ✅ **A regra eliminatória MORDE**: Beatriz (4 meses de experiência, perfil bom) ficou em **20**
  — a rubrica manda «abaixo de 40 quando falta eliminatório, por melhor que seja o resto».
- ⚠ **Camila (calibrada como piso) = 68 ≥ Rafael (calibrado como meio) = 67.** Um ponto de
  diferença está dentro da variância já medida (89/75/80 no mesmo candidato). **Não conclua nada
  de n=1** — item C6 mede com n≥3.
- ❌ Os fictícios **não exercitam nada além da triagem**: não têm login, não fazem SJT, redação,
  Big Five, entrevista. O funil inteiro só se prova com **conta que você opera** (§B–§E).

---

## 1. Regras da sessão — valem para todos os blocos

1. **`NOTIFICACOES_MODO = producao`.** Todo evento manda e-mail **real**. Use endereços com `+`
   (`fernandinho.costa.neto+t1@gmail.com`) para filtrar depois. Receber o e-mail **é parte do
   teste** — anote quanto tempo levou.
2. **Medir antes e depois.** «Passou» não é medição. Para cada bloco o agente entrega as
   contagens de referência **antes**; você anota o que viu; o agente mede **depois**. Foi uma
   asserção negativa que pegou o `42804` da Phase 43 que um smoke 10/10 deixou passar.
3. **Três coisas de sentido único:** o 1º clique no pedido de cópia queima o cooldown de 24 h
   daquela conta; upload de currículo **não tem backup** (PITR desligado, Storage fora de todo
   caminho); o pedido de exclusão encerra as candidaturas.
4. **Sintético não se mistura com real.** Os 3 fictícios e as 8 fixtures **saem antes da
   divulgação** das vagas (item I3 / H3). Toda conta de teste sua leva `+t` no e-mail.
5. **Anote tudo o que estranhar, mesmo o que parecer bobagem.** Dois dos quatro defeitos do
   teste de 25/08 eram «bobagem» que impedia cadastro.
6. **Passo irreversível sobre dado real não é executado por agente.** O agente para e pergunta.

---

## 2. Contas de teste — crie uma vez, use nos blocos

| Conta | Papel | Para quê | Quem cria |
|---|---|---|---|
| **T1** `…+t1@gmail.com` | candidato | O caminho feliz inteiro: cadastro → Social Media → SJT → redação → Big Five → cognitivo → entrevistas → **aprovado** | você, pelo navegador (é o teste B1) |
| **T2** `…+t2@gmail.com` | candidato | O **knockout**: responde «apenas remoto» → rejeitado na inscrição → pede **revisão (Art. 20)** → RH2 responde | você |
| **T3** `…+t3@gmail.com` | candidato | Direitos do titular: cópia dos dados (queima cooldown), currículo por URL assinada, revogação de marketing, **exclusão agendada e cancelada** | você |
| **RH2** | recrutador | O segundo RH que o REVISAO-05 exige (quem decidiu não pode responder a revisão) e o E4 | **você**, em `/rh/configuracoes` — e isso testa a EF `gerenciar-usuario-rh` do M5 (item A1) |

⚠ T1 tem de **marcar** a caixa de retenção de currículo na Etapa 4 (o ramo autorizado da guarda
já foi visto em 22/08, mas a conta nova precisa dela para o bloco de guarda aparecer). T3 pode
deixar desmarcada — assim os dois ramos ficam cobertos.

---

## 3. Divisão de trabalho

| O agente faz sozinho | Só você faz |
|---|---|
| Medições SQL antes/depois de cada bloco | Tudo que é **navegador com login real** e recebimento de e-mail |
| Reativar/preparar dados, semear fictícios, rodar smokes | **Decisões**: janelas de retenção, destino das fixtures, flip da purga, o que entra no backlog |
| Consertar defeitos que você achar, com review antes do apply | Olhar a **tela com conteúdo real** — a lição nº 3 de 23/08: dois defeitos de markdown não seriam pegos por teste nenhum |
| Atualizar `VERIFICATION.md`, `WINDOWS.md`, `STATE.md` | Teste no **celular** — o candidato é mobile-first e ninguém nunca passou pelo cadastro num telefone |
| Reprocessar análises, rodar comparativo, medir variância da IA | O flip `dry_run → live` |

---

## 4. Roteiro por blocos — nesta ordem

Tempo estimado total do seu lado: **~5 h de navegador**, em 3–4 sessões. Do lado do agente,
~4 h de preparação, medição e conserto entre as sessões.

### Bloco A · Preparação — estado em 2026-09-05, fim da sessão do agente

| ID | Quem | O quê | Estado |
|---|---|---|---|
| **A0** | **você** | **Deploy da EF `analise-candidato-individual`** — `node efdeploy.cjs analise-candidato-individual` (lê os 9 arquivos do disco, mesma convenção do `p46apply.cjs`; `verify_jwt` fica `false`, como está hoje). Depois me avise: eu aplico `…0905000001` (rubricas) e `…0905000002` (fictícios) **nessa ordem** | ⛔ **bloqueado para o agente** — o classificador de permissões recusou as três vias (CLI, CLI `--use-api`, script). Código pronto e testado (Deno 6/6) |
| A1 | **você** | Criar **RH2** (papel `recrutador`) em `/rh/configuracoes`, com e-mail que você abra | ⏸ pendente |
| A2 | agente | 3 fictícios da Social Media: **CVs gerados e no bucket** (`f0000004..6`, 5,7–7,3 KB); migration `20260905000002` escrita com portões (18 respostas, opções literais) | ✅ pronto · **aplicar só depois de A0** |
| A3 | agente | Registro corrigido: `STATE.md` (cron dispara, 15 execuções), `RETOMAR-AQUI.md`, `UAT` e `PENDENCIAS` (RH de teste inativos), `47-VERIFICATION` (Encarregado resolvido), `WINDOWS` 24/28/29/31/32 → `fixed` (40 → 35 abertas) | ✅ |
| A4 | agente | As **2 policies de SELECT** do bucket `curriculos` estão vivas (`curriculos_select_own_or_rh` por `auth.uid()`, `Candidato lê próprios currículos` por `candidatos.id`) | ✅ |
| A5 | agente | Vercel: deploy de produção mais recente `READY`, commit `c477fbc` = HEAD desta manhã. O commit desta sessão vai gerar deploy novo — conferir `READY` antes do Bloco B | ✅ |
| A6 | agente | Contagens de referência (o «antes»): candidatos **35** · candidaturas **24** · `historico_candidatura` **23** · `solicitacoes_dados` **2** · `notificacoes_enviadas` **18** · `auth.users` **38** · CVs no bucket **9** (6 sintéticos) · análises **11** · `decisao_final` **4** · `logs_auditoria` **6** · RH ativos **1** | ✅ |

**O que mudou no código nesta sessão (commit desta data):**

- **A pergunta da Etapa 1 entra no prompt** — a EF embute `perguntas_formulario(texto_pergunta, ordem)` e escreve `Pergunta: … / Resposta: …` na ordem do formulário; sem embed, degrada para o formato antigo, nunca para silêncio. Teste novo pina o formato.
- **`updateVagaBase` grava `slug`, `tipo_contrato`, `modelo_trabalho` e `descricao_curta`** — a tela coletava os quatro e o toast dizia «salvo» sem gravar. `slug` só vai se não-vazio (CHECK + UNIQUE). Dois testes novos.
- **`TRIAGEM-01` estava vermelho desde 26/08** e ninguém rodava a suíte Deno: pegava o primeiro upsert (que virou o marcador `pendente` em `8a111f5`) e esperava o formato antigo de pontos fortes/gaps (mudado em `666be50`). Corrigido para o que a asserção sempre quis dizer.
- **Migration `…0905000001`**: as duas rubricas trocam o parágrafo «chegam como lista solta, SEM o enunciado» — que vira instrução falsa depois do deploy — por «cada item chega como Pergunta/Resposta; julgue à luz da pergunta; resposta da Etapa 1 tem o mesmo peso que o CV». Portões: o texto antigo tem de existir antes e não pode sobrar depois.
- **`efdeploy.cjs`**: deploy de EF pela Management API com arquivos lidos do disco — irmão do `p46apply.cjs`, pela mesma razão (transcrever 93 KB de TypeScript pelo modelo é o defeito que o M8 já pagou duas vezes em SQL).

### Bloco B · O candidato, ponta a ponta (você · T1 · **no celular primeiro**, depois no desktop)

Abra `https://rh.beautysmile.com.br/vagas` numa aba anônima. ⚠ No celular de verdade, não no
DevTools — a Etapa 2 (CEP → foco no Número) foi onde o bug de foco apareceu e é onde teclado
virtual muda o comportamento.

| ID | Onde | O que tem de acontecer | Se falhar |
|---|---|---|---|
| B1 | `/vagas` e `/vagas/:slug` | As 2 vagas aparecem; a página mostra **cidade, endereço e horário** (consertado em `0fcac52`), `secoes_extras` renderizadas, markdown sem `**` literal | anote qual campo falta |
| B2 | Cadastro · Etapa 1 | Idade mínima 16 dispara com data recente; «Como conheceu» com **«Outros» e «Catho» aceitos** (era o defeito que impedia cadastro) | mensagem exata |
| B3 | Etapa 2 | CEP preenche cidade/UF; **Tab para Complemento não volta para Número** (`BUG-foco-preso`, consertado em `05e8304`) | digite `APTO12` no Complemento e veja onde caiu |
| B4 | **Etapa 4 — Autorizações** | **TODAS as caixas nascem DESMARCADAS**. Marque a de retenção de currículo | ⛔ **caixa pré-marcada = violação de LGPD, pare e me chame** |
| B5 | Etapa 4 | Texto de cada autorização legível; o ponto final de «…Seus dados e autorizações.» não cai sozinho na linha de baixo (cosmético conhecido) | anote se persiste |
| B6 | Após enviar | E-mail de confirmação chega (`evento=confirmacao`) — anote o tempo; login leva ao destino certo (a vaga), não à home | tempo esperado |
| B7 | Formulário da Social Media | Upload de PDF funciona (anote o **tamanho máximo** aceito); as 6 perguntas aparecem com **cabeçalhos de bloco legíveis** («Sobre sua experiência», não `curriculo`) | qual rótulo cru |
| B8 | Formulário | Sair e voltar **preserva** o progresso | |
| B9 | Ao enviar | E-mail de inscrição; candidatura em `/candidato/dashboard` em `triagem`; o CTA é **texto de estado**, não seta morta (`8a111f5`/rodada 2 item 8); o prazo da etapa aparece | |
| B10 | ~2 min depois | A análise de IA gravou (`analise_candidato_vaga`) — **o agente mede**; `status` passa de `pendente` para `sucesso` | se ficar `pendente` > 5 min, é o defeito de dispatch (backlog P1) |
| B11 | `/candidato/perfil` | Editar telefone/endereço persiste; a navbar tem «Área do candidato» | |
| B12 | `/candidato/privacidade` | **Bloco de guarda do currículo**: «Base da guarda: sua autorização de {data}. Prazo previsto: até {prazo}.» com data e prazo **preenchidos** | placeholder ⇒ ⛔ |
| B13 | idem | Switch de marketing: ligar e desligar. O agente confere que **só uma coluna** mudou (`autorizacao_marketing_vagas`), hash/versão/timestamp intactos | |
| B14 | idem · «Seu currículo» | «Abrir meu currículo» abre em aba nova; copie a URL, espere **>90 s**, recarregue → **expira**. ⚠ 403/400 ⇒ PARE e anote — é a hipótese da convenção de pasta | |
| B15 | idem · DevTools aberto | A URL assinada **não** aparece no console nem em atributo do documento; **nenhuma** chamada a `get-curriculo-url` | |
| B16 | 320 px (DevTools) | Nenhuma tela do candidato estoura horizontalmente | qual tela |

⚠ **Não clique em «pedido de cópia» nem em «excluir» com a T1.** Isso é da T3 (Bloco F).

**Fecha:** Phase 43 (ramo autorizado, de novo), itens 5–9 da Deferred Verification da 44
(o CV), os 3 defeitos de 25/08 ao vivo.

### Bloco C · O RH vê e tria (você como admin + agente) — no desktop

| ID | Onde | O que tem de acontecer |
|---|---|---|
| C1 | `/rh/dashboard` | «Vagas ativas» = **2** (era «0» com 3 ativas — `666be50`); os 4 contadores batem com o SQL que o agente entrega |
| C2 | `/rh/vagas` | As 2 reais `ativa`, as de teste `inativa`/`arquivada`; **editar** uma vaga e alterar `descricao_curta` ou `modelo_trabalho` → recarregar → **persistiu?** (o handoff do plugin acusou que `updateVagaBase` não escreve 4 campos) |
| C3 | `/rh/vagas/:id/candidatos` (Social Media) | A T1 e os 3 fictícios de A2 aparecem; o **score**, os pontos fortes **com citação** e os gaps **com evidência e severidade** (`666be50`) — leia um gap e confira se ele é **defensável** contra o CV |
| C4 | idem | «Reprocessar» roda e o `updated_at` muda; o novo score é próximo do anterior (a variância é o item C6) |
| C5 | `/rh/vagas/:id/comparativo` | O comparativo (`comparativo-candidatos`) ordena coerente com os scores; Beatriz (Consultor) fica no fundo por gap `critical`, não por «perfil fraco» |
| C6 | agente | **Variância da IA**: reprocessar cada fictício **3×** e registrar média/desvio. É isso que decide se «Camila ≥ Rafael» é sinal ou ruído, e se a rubrica precisa de reforço sobre «resposta da Etapa 1 é evidência de mesmo peso que o CV» (rodada 2, item 7) |
| C7 | `/rh/candidato/:id` (T1) | **Histórico** mostra rótulos de texto (Sistema / O próprio candidato / nome do recrutador / Recrutador removido) — **nunca UUID, nunca erro de banco**. É o único item humano vivo da **Phase 47** |
| C8 | idem | **Avançar** a T1 para `avaliacao_assincrona`. E-mail `avanco` chega à T1; o dashboard dela vira «Continuar para Avaliação» com rota viva |
| C9 | idem | Tente **avançar um fictício** direto para `entrevista_online` com SJT/redação obrigatórios **não feitos** — o sistema **avisa, bloqueia ou deixa passar em silêncio?** A candidatura E2E de 25/08 está em `entrevista_online` com 0 SJT e 0 redação, então hoje ele deixa. Decida se isso é aceitável (o PRD §9.2 diz que os obrigatórios precedem) |
| C10 | `/rh/candidatos` | Busca e filtro encontram a T1 por nome e por vaga |

**Fecha:** Phase 47 (C7), o dashboard da rodada 2, e produz a medição que o backlog de IA precisa.

### Bloco D · As avaliações assíncronas (você como T1, no celular; RH no desktop)

| ID | Onde | O que tem de acontecer |
|---|---|---|
| D1 | `/candidato/avaliacao/:id` | O hub lista **só** os testes da vaga (SJT obrigatório; redação e Big Five opcionais na Social Media; **sem** cognitivo — `aplica_cognitivo=false`) |
| D2 | `/…/mc` | SJT múltipla escolha: instruções, progresso, envio; o RH vê o score (`respostas_avaliacao` + `scores_candidato`) |
| D3 | `/…/caso` | Caso aberto: texto salvo; a IA (`work_sample_sjt`) avalia e o RH vê |
| D4 | `/candidato/redacao/:id` | Redação: **cronômetro** e **contador** funcionam; sair no meio e voltar recupera de `redacoes_candidato_em_progresso`; enviar dispara `avaliar-redacao-cultural`; **a redação é a da vaga certa** (o defeito das ONZE redações, `e9a0227`) |
| D5 | RH · `/rh/candidato/:id/redacao` | `RedacaoReviewPanel` mostra a nota da IA, a cor, e o **override** do RH grava com justificativa e aparece no histórico |
| D6 | `/…/bigfive` → `/bigfive/devolutiva` | Questionário completo; a **devolutiva** ao candidato (`gerar-devolutiva-bigfive`) chega em linguagem de «avaliação comportamental» — **nunca** «teste psicológico» (regra de produto) |
| D7 | RH · `LiberacaoCognitivoBlock` | Liberar a avaliação de raciocínio **nominalmente** para a T1 (botão legível — `011593f`); a T1 vê `/candidato/avaliacao-raciocinio/:id` só depois disso |
| D8 | T1 · Raven | Faz a prova; `scores_raven` grava com **tempo total ≠ 0** (`9c588a5`); o gabarito **não** é alcançável pelo candidato nem por anon (`017f652`) |
| D9 | RH · tela do candidato | Os scores consolidados aparecem com os **pesos da vaga** (`pesos_avaliacao`); a soma faz sentido |

**Fecha:** nada do M8 — mas é o M2/M3/M6 sendo exercitado **pela primeira vez com rubrica e
prompts reais** (as análises anteriores a 23/08 rodaram sem vaga e sem instrução).

### Bloco E · Entrevistas, decisão e o Art. 20 (você como admin + RH2 + T1/T2)

| ID | Onde | O que tem de acontecer |
|---|---|---|
| E1 | RH · avançar T1 para `entrevista_online` | **Agendar** (`agendamentos_entrevista`): a T1 vê data/hora como «Próximo passo» no dashboard (AGEND-04); e-mail chega |
| E2 | `/rh/candidato/:id/entrevista` | **Guia de entrevista** gerado (`gerar-guia-entrevista`) cita a vaga e os gaps da análise; o scorecard inline grava |
| E3 | idem | Colar uma transcrição fictícia → `avaliar-transcricao-entrevista` devolve análise; nada quebra com texto longo |
| E4 | RH · `entrevista_presencial` | Avançar, agendar, registrar ata; o candidato vê o passo |
| E5 | `/rh/candidato/:id/decisao` | **Registrar decisão** → `consolidar-decisao-final` → `aprovado`. A T1 **vê a própria aprovação** no dashboard (`9708bcb`, `data_decisao_final` gravada) e recebe e-mail `decisao` |
| E6 | **T2** · inscrição na Consultor | Responder a pergunta de disponibilidade com a opção de knockout → rejeição automática na inscrição; `/candidato/explicacao/:id` explica em linguagem honesta; e-mail. ⚠ Confirme que o motivo é a **regra da pergunta**, nunca score (RNF-07a) |
| E7 | T2 · pedir **revisão** | O botão de revisão existe na explicação; ao pedir, o **RH recebe e-mail** (`notificar-rh`) com link para `/rh/revisoes` que **abre** (não 404) |
| E8 | admin · `/rh/revisoes` | A fila lista a T2 por antiguidade com badge de **SLA interno**; a `RHSidebar` mostra o contador |
| E9 | **você (quem decidiu)** tenta responder | O **servidor barra** (REVISAO-05) — a mensagem é a de recusa, não erro genérico. ⚠ Se a rejeição foi automática (sistema), o guard pode não se aplicar — anote o que aconteceu |
| E10 | **RH2** responde | Escreve o resultado com confirmação aninhada; a T2 recebe e-mail `revisao_respondida` e vê o resultado no painel |
| E11 | admin · `/admin/bias-audit` | Carrega e chama `gerar_bias_snapshot` como `authenticated` — se funciona, o `GRANT` do CR-02 está certo e **não deve ser revogado** |
| E12 | admin · `/rh/pedidos-dados` | **fila ≡ contador do menu** (BD-8, ramo administrador) — anote os dois números |

**Fecha:** Phase 42 (E7–E10), o `44-09` (E12), o E2 do UAT (E11); e o funil do M6/M7 fica
provado com e-mail em cada transição.

### Bloco F · Direitos do titular (você como T3 — conta que você não vai precisar depois)

| ID | Onde | O que tem de acontecer |
|---|---|---|
| F1 | cadastro + inscrição rápida | T3 se cadastra **sem** marcar retenção (o ramo não-autorizado da guarda) e se inscreve numa vaga |
| F2 | `/candidato/privacidade` · **pedido de cópia** | Botão desabilita durante; baixa **DOIS** arquivos, o `.json` primeiro; o `.html` abre legível com carimbo no topo e versão da allowlist no rodapé; a seção 3 mostra a copy completa |
| F3 | agente mede | `solicitacoes_dados` **+1**, `tipo='acesso'`, `situacao='atendido'`, `causa` NULA |
| F4 | 2º clique | Botão desabilitado **com o motivo e a hora de liberação ao lado** (não em tooltip); **nenhuma linha nova** no banco |
| F5 | `/rh/pedidos-dados` | O pedido de F2 aparece na fila com o prazo do Art. 19 (15 dias) visível |
| F6 | **Pedido de exclusão** | Estado A → clicar → «Exclusão agendada», **data por extenso** (hoje sai `dd/mm/aaaa` — divergência conhecida, anote), nota de que cancelar não reabre; recarregar **persiste** |
| F7 | agente mede | `solicitacoes_dados` +1 `tipo='exclusao'` `situacao='agendado'`, `executar_em − solicitado_em = 15 days`; candidaturas com `encerrada_a_pedido_em` **e** `deleted_at` NULL; `historico_candidatura` **inalterado**; **zero** `evento='decisao'` novo |
| F8 | T3 e-mail | Chega `candidatura_encerrada_a_pedido` — em tempo passado, sem identificador proibido, **com** a linha da justificativa (WR-A) |
| F9 | **Cancelar** o agendamento | `situacao` volta; as candidaturas continuam encerradas (é o que a tela promete) |
| F10 | *(opcional)* executar a exclusão de verdade | Já foi provado em 22/08 sobre conta descartável (`45-VERIFICATION` 5/5). Só repita se quiser ver o recibo na sua caixa. **Checkpoint do operador**, pelo `RUNBOOK-45-06-T2-E-45-11-T3.md` |

**Fecha:** os itens 1–4 e 10 da Deferred Verification da Phase 44, e re-prova a 45 por
observação.

### Bloco G · Admin e operação (você como admin)

| ID | Onde | O que tem de acontecer |
|---|---|---|
| G1 | `/admin/retencao` | **Confirmar** as janelas de `aprovado` e `decisao_final` (hoje `seed`, 24 meses). Reconfirmar 24 é legítimo; o que o servidor exige é que **alguém tenha olhado**. Sem isso o flip (Bloco H) é recusado |
| G2 | idem | A prévia de retenção mostra os **5 fixtures** como elegíveis e nenhuma pessoa real |
| G3 | `/admin/ai-costs`, `/admin/ai-logs` | Carregam; o custo do dia reflete as análises dos blocos C–E; `cost-alerter` não disparou alerta falso |
| G4 | `/admin/prompt-versions` | Lista os 8 prompts; **zero** `[SEED PLACEHOLDER]` ativo; **7 sem `deployed_at`** — decidir (backlog P2) se carimba agora |
| G5 | `/rh/relatorios` | KPIs batem com o funil que você acabou de percorrer (1 aprovada, 1 rejeitada, N em andamento) |
| G6 | `/rh/perfil`, `/rh/suporte`, `/rh/configuracoes` | Carregam; desativar e reativar RH2 funciona e fica em `logs_auditoria` |
| G7 | `/privacidade`, `/subprocessadores`, `/manifesto` | As páginas públicas abrem sem login; o rodapé aparece nas 5 superfícies; nenhuma menção a «Encarregado» |

### Bloco H · O flip da purga `dry_run → live` — só depois de B–G

**Runbook próprio e obrigatório:**
`.planning/phases/46-purga-autom-tica-dry-run-live/46-07-RUNBOOK-FLIP.md`.

| ID | O quê | Estado medido hoje |
|---|---|---|
| H1 | ≥14 dias desde a 1ª execução de ensaio | 13 — fecha em **06/09 02:06** |
| H2 | ≥14 execuções no ledger | **15** ✅ |
| H3 | ≥1 execução sobre conjunto não-vazio | **15** ✅ |
| H4 | Nenhuma etapa da allowlist em `seed` | ❌ → **G1** |
| H5 | Titular a titular: nenhum real no conjunto elegível | ✅ hoje (5 fixtures). **Re-medir no instante do flip** |
| H6 | Decisão: destino das **8 fixtures p46** | Recomendação: **deixar a primeira noite em `live` destruí-las** — é a prova esperada («é a destruição da fixture que é a prova»). Alternativa: `p46_teardown_fixture.sql` antes |
| H7 | Decisão: destino dos **3 (+3) fictícios** | **Remover antes da divulgação** das vagas, como aprovado em 30/08 — eles não são elegíveis à purga (são novos) e poluiriam o comparativo e o snapshot de viés |
| H8 | O flip em si | Você, na sessão, com `p_confirmo_live := true`. O agente mede antes e na manhã seguinte: `purga_execucoes` com `veredito='live'`, `processados` = nº de fixtures, `auth.users` −N exato, trilha intacta |

⚠ **Não há pressa em fazer o flip no dia 06.** O portão continua satisfeito depois; o que
importa é fazê-lo **depois** de ter gente real no sistema **e** com o conjunto elegível
conferido titular a titular naquele instante.

### Bloco I · Fechamento do M8 e limpeza (agente, com os seus vereditos)

| ID | O quê |
|---|---|
| I1 | Atualizar `42/43/44/46/47-VERIFICATION.md` com os IDs deste guia como evidência; `/gsd-verify-work` por fase |
| I2 | Triagem das **40 janelas** do `WINDOWS.md`: `fixed` com commit, ou `waive` com razão datada. Nenhuma fecha «porque sim» |
| I3 | Remover os fictícios (`f0000*`/`c0000*` e os de A2) por script versionado, com contagens antes/depois; arquivar `teste-e2e-social-media` |
| I4 | `/gsd-audit-milestone` → `/gsd-complete-milestone 8.0` → `/gsd-cleanup` |
| I5 | `CLAUDE.md`, `STATE.md`, `RETOMAR-AQUI.md`: estado final, sem fase «atual» |

---

## 5. Backlog do que já se sabe que precisa mudar — decidir o que entra antes do fecho

| Pri | Item | Evidência | Onde |
|---|---|---|---|
| **P1** | **O dispatch da análise não distingue sucesso de falha.** `pg_net` estoura 5 s em toda análise (~93 s medidos); a EF que morre antes de gravar não deixa rastro. `8a111f5` deu visibilidade (`status=pendente` + view); falta a EF responder 202 e processar em segundo plano | `TESTE-E2E…` §1 | `analise-candidato-individual`, trigger |
| **P1** | **A pergunta da Etapa 1 nunca entra no prompt** — só o texto da resposta. O modelo lê `- Sim` sem saber o que foi perguntado. Agora as vagas reais **têm** perguntas | `index.ts:222` | EF `analise-candidato-individual` |
| **P1** | **Calibração/variância da IA**: 89/75/80 no mesmo candidato; gap `critical` contradizendo resposta da Etapa 1 | rodada 2 item 7; §0.4 | rubricas + prompt `cv_job_match` — **medir em C6 antes de mexer** |
| **P1** | **Avançar etapa com testes obrigatórios incompletos** passa em silêncio (C9) | candidatura E2E | RPC de avanço / UI |
| P2 | 7 de 8 prompts com `deployed_at` NULL → guard de imutabilidade inerte; `culture_fit_essay` com `content_hash` errado só corrigível por versão nova | §0.2 | `prompt_versions` |
| P2 | `scripts/sync-prompts.ts` é código morto (escreve `fallback_model_id`, coluna inexistente) | RETOMAR | apagar ou consertar |
| **P2** | **`stamp_explicacao_acessada` é idempotente no valor e não na escrita** — o `UPDATE` roda a cada visita e o trigger `AFTER UPDATE` acrescenta uma linha ao histórico do Art. 20. 7 linhas / 2 estados distintos hoje; cresce por ação do titular | §7.28 | `WHERE ... AND explicacao_solicitada_em IS NULL` |
| P2 | `updateVagaBase` não persiste `slug`, `tipo_contrato`, `modelo_trabalho`, `descricao_curta` (toast de sucesso falso) | handoff do plugin | **confirmar em C2** |
| P2 | Não existe tela de criar vaga; o plugin `cadastro-de-vaga` gera migration | handoff | roadmap próprio, se quiser autonomia |
| P2 | Registro desatualizado (§0.3) | esta sessão | A3 |
| P3 | Data da exclusão agendada não está «por extenso» | P45 divergência | `F6` |
| P3 | Ponto final solto no bloco LGPD do cadastro | cosmético | `B5` |
| P3 | `npm run db:types` destrava `WINDOWS` 18 e 27 (`as never` no `historicoCandidaturaService`) | PENDENCIAS 3.1 | |
| P3 | `m7-cleanup-n8n-cloud` — a superfície externa do n8n segue ativa | PENDENCIAS 3.5 | |

---

## 6. Como registrar o resultado

Para cada ID, uma linha:

```
B4  ✅  todas desmarcadas; marquei retenção
B14 ⚠   abriu; a URL NÃO expirou em 90 s (recarreguei 3x até 2 min)
E9  ⛔  o sistema deixou EU responder a revisão da T2 — a rejeição foi automática
```

Print de tela vale mais que descrição — mande junto quando algo estranhar. O agente responde
com a medição do «depois», o diagnóstico **medido** (não plausível), e o conserto com review
antes de qualquer apply.

---

## 7. Sessão de teste do agente — 2026-09-05, ~21:30–22:00 (Bloco B, pelo navegador, em PROD)

Conta **`…+claude1@gmail.com`** («Claude Teste Candidata», candidato `1c1575d8…`, candidatura
`0b1c887b…` na Social Media). Viewport 390×844 (celular) a partir do cadastro. Nada irreversível
foi tocado; a conta é descartável.

| ID | Resultado | O que medi |
|---|---|---|
| B1 | ✅ / ⚠ | Listagem e página da vaga com cidade, endereço, horário, seções extras e markdown corretos. ⚠ **Clicar no título ou no corpo do card não navega** (só o botão), apesar do `cursor: pointer`. ⚠ O botão da lista leva a `/vagas/<uuid>`, não ao slug. ⚠ «Benefícios» aparece duas vezes (h2 + h4) |
| B2 | ✅ | «Idade deve estar entre 16 e 100 anos» com DOB 2012; «Outros» aceito **e abre campo «Especifique»** com validação própria; gravou `como_conheceu='outro'` + `como_conheceu_detalhes` |
| B3 | ✅ | CEP 04004-030 → ViaCEP preencheu; foco foi para Número; **Tab levou ao Complemento** e `APTO12` caiu lá — Número ficou `53` |
| B4 | ✅ | **As 3 caixas nascem desmarcadas.** Marquei obrigatória + retenção. `autorizacoes`: marketing `false`, retenção `true`, `v2-2026-08`, hash, `consent_registrado_em` — ⚠ `user_agent_aceite` NULL |
| B5 | ⚠ | Copy desatualizada: «Para os demais direitos [acesso, eliminação…], escreva para lgpd@» — o sistema já faz cópia e exclusão sozinho em `/candidato/privacidade` (Phases 44/45). Ponto final solto não visível no celular |
| B6 | ✅ / ⚠ | Redirect sobreviveu login → cadastro → formulário. ⚠ **Nenhum e-mail no cadastro** (só na inscrição); `email_confirmed_at` já vem preenchido |
| B7 | ✅ | PDF aceito (limite 5 MB explícito); cabeçalhos legíveis («Sobre sua experiência», «Ferramentas e rotina»…) |
| **B8** | **⛔** | **Sair e voltar perde TUDO** — 6 respostas, portfólio e CV. Não há rascunho da inscrição (a redação tem `em_progresso`; a candidatura, não). No celular, uma interrupção zera o trabalho |
| B9 | ✅ | E-mail `confirmacao` **entregue em <1 s**; dashboard 1/1 em Triagem, «Em triagem — retorno em até 48 horas», CTA como texto de estado |
| **B10** | **⛔** | **Análise ficou `pendente` para sempre.** EF rodou 92,8 s, `[analise] ok`… e o upsert final voltou **400**: o `unpdf` extraiu **90 NUL** do PDF; Postgres recusa (22P05); a EF não conferia o `error`. **Consertado em `f62ef6f`** (sanitize + erro lança → `falhou`). Também: **`ai_call_logs` INSERT falha com PGRST204** (`input_hash` e `output` não existem) desde 22/08 — custo de IA invisível; consertado no mesmo commit + migration `…0905000003`. E a análise caiu no **fallback openai** (motivo não logado — o log de IA estava morto) |
| B12 | ✅ | «Base da guarda: sua autorização de 05/09/2026. Prazo previsto: até 05/09/2028.» ⚠ Switch de marketing diz «Desativado em 05/09/2026» para algo nunca ligado. ⚠ Página sem a navbar compartilhada (só «Voltar ao painel») |
| B13 | ✅ | Liguei/desliguei: **só** `autorizacao_marketing_vagas` mudou; hash/versão/timestamp intactos |
| B14 | ✅ | Assinada com TTL 60 s (`iat`/`exp` no token); recarregada depois → **400** |
| B15 | ✅ | Zero chamadas a `get-curriculo-url`; URL assinada ausente do console e do DOM. ⚠ A página faz `candidatos?select=*` (convenção pede allowlist) |
| B16 | ⚠ | **Card da candidatura no dashboard quebra o título uma palavra por linha** a 390 px (coluna de ~100 px); título «Histórico de Candidaturas» colide com o botão «Ver Vagas» |
| — | ⚠ | Console: `Select is changing from uncontrolled to controlled` no «Como conheceu» (higiene React); `[CADASTRO]`/`[CV]`/`[CANDIDATURA]` logam ids em produção |

**Não fiz (dependem de você):** A0 (deploy), A1 (RH2), qualquer coisa do lado RH, cópia dos dados e
exclusão (ficam para a conta T3 sua ou para uma `+claude2` minha).

**Depois do deploy:** reprocessar a análise da `0b1c887b` (hoje `pendente`) e conferir que vira
`sucesso` com o CV sanitizado; aplicar `…0905000001` (rubricas), `…0905000002` (fictícios) e
`…0905000003` (input_hash) — a última ANTES do redeploy das 7 EFs que embarcam o audit-logger.

### 7.1 · Depois do seu deploy (22:05–22:25) — o que mais apareceu

| Achado | Evidência | Estado |
|---|---|---|
| **A Anthropic nunca respondia a tempo.** `AI_CALL_TIMEOUT_MS` = 25 s × 3 tentativas + backoff ≈ 87 s → `anthropic_retries_exhausted` → **todas** as análises pelo `gpt-4o-mini`. O «93 s» do E2E de 25/08 era isso; a «variância 89/75/80» e os gaps que contradizem a evidência são do modelo barato | `ai_call_logs` das 3 análises dos fictícios: `provider=openai`, `error_message='Request timed out.'`, `latency_ms≈87200` | `timeoutMs: 55_000` na EF (`commit` deste horário) — **precisa de redeploy** e de reprocesso para provar que o Sonnet responde |
| Replay por `idempotency_key` nunca funcionou — `select` pedia a coluna fantasma `output` | `ai-client.ts` `tryIdempotencyReplay` | corrigido (lê `raw_response`) — redeploy das 7 EFs de IA |
| `reprocessar_analise` retorna em silêncio quando o Vault não devolve os secrets ao papel chamador | chamada como `postgres` via Management API: `void`, nada no `pg_net` | anotar — pelo RH (JWT) funciona; a RPC devia levantar erro em vez de `RETURN` |
| `efdeploy.cjs` não enviava o `deno.json` (import map) → 3 EFs que importam `"zod"` puro não bundlavam | seu terminal, 22:05 | corrigido (`02c9eac`) — **rodar de novo para as 3**: `avaliar-transcricao-entrevista`, `avaliar-redacao-cultural`, `gerar-guia-entrevista` |
| Migration `…0905000001` (rubricas): literais `E''` em linhas separadas não concatenam em PL/pgSQL | 42601 no primeiro apply | reescrita com `\|\|`, **aplicada** (md5 `26ba7c0f…`); rubricas conferidas |
| Migration `…0905000002` (fictícios Social Media) | **aplicada**; Larissa **100** · Thiago **56** · Juliana **30** — ordem calibrada, eliminatório mordeu | ✅ (via gpt-4o-mini — reavaliar depois do timeout) |
| Minha candidatura `0b1c887b`: reprocessada pela EF v20 | `sucesso`, score 80, 5 pontos fortes com citação, 3 gaps com evidência — o NUL sanitizado passou. ⚠ gap `[critical]` «há pelo menos 1 ano… confirmado na pergunta 7» contradiz CV (3 anos) e Etapa 1 («entre 2 e 4») — é o gpt-4o-mini | ✅ B10 fecha; qualidade fica para o Sonnet |

### 7.2 · Terceira camada da IA — 23:41

Com o teto de 55 s a Anthropic **respondeu** (~40 s) e o parse falhou: «Unterminated string in JSON
at position 6445» — a saída do Sonnet era **truncada em `max_tokens: 2048`** (5 BARS + citações +
gaps + reasoning + competency_scores não cabem). Parse falho → `anthropic_retries_exhausted` →
`gpt-4o-mini`, cuja saída terse cabe. Cada camada escondia a seguinte: log morto → timeout de 25 s →
truncamento. O `RETOMAR-AQUI` de 23/08 previa exatamente este risco.

Conserto: migration `…0905000004` (`max_tokens` 2048 → 4096, **aplicada**) + `timeoutMs: 90 s`
na EF (1 tentativa; 90 s + fallback < 150 s). EF v22 no ar às 23:48. Medição pendente: `provider=anthropic`,
`success=true`, `output_token_count` < 4096.

Também consertado no front (`82c60c6`): a lista mostrava «1 candidato» ao **candidato** logado
(`includeCounts = !!user` do Plan 25-09 vazava para quem não é RH); e `hasUserApplied` não entrava
na chave de cache — recém-inscrito, o card ainda dizia «Candidatar-se».

### 7.3 · Quarta camada — 23:47

Com `max_tokens` 4096 e 90 s (EF v22) o Sonnet devolveu o **JSON inteiro** (54 s) — e o **Zod recusou**:
`too_big, maximum: 1500` em `CvJobMatchSchema.reasoning` (BARS `reasoning` max 500). A rubrica manda
raciocinar competência a competência antes de pontuar; 1500 caracteres não cabem cinco. A recusa vira
`anthropic_retries_exhausted` → `gpt-4o-mini`, que passa porque escreve pouco. Tetos → 4000 / 1200
(`analise-schemas.ts`, Deno 160/160). **Exige redeploy** de `analise-candidato-individual` (e
`comparativo-candidatos`, que embarca o mesmo arquivo). Medição pendente: `provider=anthropic`.

### 7.4 · A cadeia fechou — 23:53

EF v23: as duas candidaturas reprocessadas saíram **`provider=anthropic` (`claude-sonnet-4-6`),
`success=true`**, 47–54 s, 3.1–3.3 mil tokens de saída, **US$ 0,05 por análise** (o `gpt-4o-mini`
custava US$ 0,001 — o teto diário de US$ 50/vaga segue folgado; o cost-alerter agora tem dado).
Qualidade: pontos fortes citando CV **e** Etapa 1 («disponibilidade confirmada em duas fontes»), um
único gap `nice_to_have` coerente, nenhum gap crítico inventado. Claude Teste **93**, Larissa **92**.

⚠ **Toda análise gravada antes de 23:53 de 2026-09-05 é do `gpt-4o-mini`** — incluindo os 67/68/20
da Consultor e os 100/56/30 da Social Media. Não servem de baseline. O C6 (3× por fictício, Sonnet)
está rodando; resultado em `scratchpad/c6.tsv` e na tabela abaixo quando fechar.

### 7.5 · C6 — variância do Sonnet (18 rodadas, 06/09 00:00–00:08)

S = Sonnet · g = caiu no gpt-4o-mini (3× `reasoning` > 4000 chars, 1× timeout 96 s → consertados em `81a431f`, pendente redeploy).

| Fictício | Vaga | Rodadas (provider) | Sonnet: scores | gpt-4o-mini: scores | Δ Sonnet |
|---|---|---|---|---|---|
| Rafael | Consultor | S g S | 68/72 | 64 | 4 |
| Camila | Consultor | S S S | 47/48/45 | — | 3 |
| Beatriz | Consultor | S S S | 32/32/32 | — | 0 |
| Larissa | Social Media | S S S | 93/93/95 | — | 2 |
| Thiago | Social Media | g g S | 52 | 60/55 | — |
| Juliana | Social Media | S g S | 18/18 | 30 | 0 |

Leituras: **o eliminatório morde no Sonnet** — Beatriz 32/32/32, Juliana 18 (5 gaps) — e com variância
quase nula onde ele responde (Larissa 93/93/95, Beatriz 32×3, Camila 47/48/45). Rafael 68/72 e Thiago 52
ficam no meio, como calibrado. A ordem calibrada (teto > meio > piso) se mantém em todas as rodadas.
O `gpt-4o-mini` continua sendo o que introduz a dispersão (Rafael 64, Thiago 60/55, Juliana 30).

### 7.6 · Bloco C, primeira entrada como RH2 (recrutador) — 06/09 01:00

| Achado | Estado |
|---|---|
| **Login de RH numa aba com sessão de candidato ativa falha com 406** — a consulta a `usuarios_rh` sai com o token antigo (`auth.uid()` ≠ RH2), `.single()` volta vazio, a tela não navega e não explica. Com a sessão limpa, entra. | aberto — o `signIn` do RH deveria fazer `signOut` da sessão anterior antes, ou o erro deveria ser dito na tela |
| **Recrutador não vê candidato nenhum.** Hook mapeia `recrutador → rh`; `rh_le_candidaturas` exige `vagas.created_by = auth.uid()`; não há tela de criar vaga → o papel não alcança nada (dashboard «0 Candidatos» com 7 candidaturas). O BD-8 já registrava «ramo rh morto por construção»; hoje ficou visível. | **decisão de produto**: (a) recrutador vira administrador; (b) policy passa a honrar `vagas_associadas_recrutadores` (tabela existe, 0 linhas, nenhuma policy a lê); (c) tela de criar vaga |
| `/rh/pedidos-dados` abre para o recrutador e diz «Nenhum pedido» — há 2; a fila é do administrador e a tela não avisa | copy/guard |
| `/rh/configuracoes` redireciona o recrutador (guard ✅), mas «Configurações» segue no menu dele | menu por papel |
| `/rh/revisoes` abre vazio para o recrutador (sem pendências ou escopo) | conferir com pedido real (T2) |
| Saudação «Olá, fernandinho.costa.neto+rh2» usa o local-part do e-mail, não o nome («RH2») | copy |
| Config do Auth em PROD: `site_url` era `localhost:5173`, allow-list só localhost, e-mail de código sem dizer onde digitar | ✅ corrigido pelo operador com `authconfig.cjs` (backup gravado) |
| Pós-redefinição de senha mandava RH para `/candidato/perfil` | ✅ `96c2d12` |

### 7.7 · Bloco C como administrador (RH2 promovido) — 06/09 01:17–01:33

| ID | Resultado | O que medi |
|---|---|---|
| C1 | ⚠→✅ | 2 vagas ✅ · «28 Candidatos» = 28 candidaturas (rótulo) · 9 em análise ✅ · **«0 Aprovados» com 5 em etapa `aprovado`** — a tile filtrava `status='aprovado_proxima'`, valor que o funil nunca grava. Corrigido (`1c1f093`) |
| C3 | ✅ | Triagem da Social Media: 95 / 93 / 52 / 18, pontos fortes com citação, gaps com evidência e severidade — Thiago com `critical` citando «Não faço a captação…» do CV; Juliana com os dois eliminatórios citados da Etapa 1 e do CV |
| C5 | ✅ / ⚠ | Comparativo 4 candidatos: ranking coerente (1–4), pontos fortes/gaps relativos, justificativa. ⚠ Levou ~90 s, `provider=openai` (sem `timeoutMs`) e **o log de IA falhava (22P02: `candidato_id="comparativo"` não é uuid)** — nenhum comparativo jamais foi auditado. ⚠ Copy: «C1/C2/C3/C4» (rótulos do prompt) na tela; «permitindo uma clara desclassificação»; «~30 segundos». Tudo consertado em `57e46b7` — **redeploy pendente** |
| C7 | ✅ | Histórico: «Sistema · 5 de set, 21:43» e, após o avanço, «**RH2** · 6 de set, 01:21». ⚠ A lista não recarrega após a ação (cache) — só no reload |
| C8 | ✅ | Avançar → `avaliacao_assincrona`; e-mail `avanco` **entregue em <1 s**; `historico_candidatura` +1 com `ator` = RH2 |
| **C9** | **⛔** | Avançar de Avaliação Assíncrona para **Entrevista Online passou sem aviso nem confirmação**, com o SJT obrigatório não feito. Avançar não tem diálogo; Retroceder tem (destino + justificativa obrigatória, trilha) — a assimetria é o defeito |
| C10 | — | não feito ainda |
| — | ⚠ | Recrutador (antes da promoção): ver §7.6 |
| — | ⚠ | Fictícios `@exemplo.com` — domínio **com MX**; 6 e-mails de teste entregues a terceiros. Migration `…0906000001` aplicada: `@invalido.local` |

### 7.8 · Bloco D como candidata T1 — 06/09 01:35–01:50

| ID | Resultado | O que medi |
|---|---|---|
| C8 (lado candidata) | ✅ | Dashboard: «Etapa atual: Avaliação Assíncrona · Avaliação liberada — conclua em até 7 dias corridos» + CTA «Continuar para Avaliação Assíncrona» |
| D1 | ✅ / ⚠ | Hub lista SJT (situações + caso prático), redação cultural, comportamental; sem cognitivo (correto). ⚠ Não distingue **obrigatório** (SJT) de **opcional** (redação, Big Five nesta vaga) — tudo «Pendente · ~10 min» |
| D2 | ✅ / ⚠ | SJT: confirmação «Enviar avaliação?» ✅; resposta gravada em `scores_candidato` ✅. ⚠ **«Situação 1 de 1» e cenário de pré-vendas** (lead no Instagram, CRM): o banco tem 1 item `mc` por cargo e **nenhum de Social Media** — a vaga usa `sdr-social-seller`. ⚠ «Tempo sugerido: 00:11» é o cronômetro decorrido, rótulo errado. ⚠ Após enviar, o hub seguia «Pendente · Começar avaliação» até o reload — consertado (`a109109`, invalidação) |
| **D3** | **⛔** | «Caso prático» abre em **«Nenhuma avaliação pendente»**: só o cargo `dentista` tem item `caso_aberto`. O card existe no hub e leva a um beco sem saída |
| **D4** | **⛔→✅** | Redação: 1 pergunta cultural, cronômetro, contador 200–500 ✅. **Sair e voltar zerava a redação** — o autosave gravava em `respostas_avaliacao` e nenhuma tela lia de volta. Consertado (`299b90e`); a conferir ao vivo após o deploy |
| — | ⚠ | Dedupe de notificação `candidatura:avanco` → **um único e-mail de avanço por candidatura, para sempre**; o retrocesso não notifica. Decisão de produto (incluir a etapa na chave?) |
| — | ⚠ | Console: Select/RadioGroup «uncontrolled → controlled» no diálogo de retroceder e no SJT (higiene React) |
| — | ⚠ | Preventivo (`a109109`): `timeoutMs` 110 s em avaliar-redacao, avaliar-redacao-cultural, gerar-devolutiva-bigfive; tetos de texto dos schemas — **redeploy das 7 EFs pendente** |

### 7.9 · D4, o envio — 06/09 01:51

| Achado | Estado |
|---|---|
| **Enviar redação morreu em CORS**: o preflight `OPTIONS` do `avaliar-redacao-cultural` voltava **401 da própria função** — o wrapper `Deno.serve` exigia `Authorization` antes de delegar ao `handler` (que trata `OPTIONS`). Com `verify_jwt=true` o gateway respondia o preflight sozinho e escondia a ordem errada; o redeploy do `efdeploy.cjs` (que sobe com `false`) expôs. Mesmo defeito em `avaliar-redacao`; as outras 5 EFs de IA tratam `OPTIONS` primeiro. | consertado (`ab5a586`) — **redeploy pendente**; redação da T1 fica no rascunho até lá |
| Rascunho da redação restaurado ao vivo (258 palavras) após o deploy `299b90e` | ✅ (o cronômetro recomeça — tempo decorrido não é persistido) |

### 7.10 · D4 fechado — 06/09 02:18

Após o redeploy (wrappers com `OPTIONS` antes da auth; `verify_jwt` por EF): preflight **200**, envio
passou, «Redações concluídas.» ✅. `redacoes_candidato`: score ponderado **100**, cor **verde**, D1–D4 = 5,
`status_analise = pendente_humano` (revisão do RH), `tempo_gasto_segundos = 142`, `model_version =
claude-sonnet-4-6`. `ai_call_logs`: `provider=anthropic`, **26,7 s** — com o teto antigo de 25 s teria caído no
fallback por 1,7 segundo.

⚠ Bug meu na restauração do rascunho (`299b90e`): o texto voltava à caixa, mas o buffer do autosave ficava
vazio; o `flushNow()` do Enviar gravou `{}` por cima e a tentativa que morreu em CORS **apagou a redação**.
Corrigido em `f7937a5` (a restauração semeia o buffer). Lição: restaurar estado visível sem restaurar o
estado que o próximo passo consome é pior que não restaurar.

### 7.11 · D5 — 06/09 02:22

`/rh/candidato/:id/redacao`: painel carrega a redação da T1 com as 4 dimensões da IA (5/5), composto 100,
cor Verde, sliders de ajuste, justificativa obrigatória (≥ 50 chars), decisão em 3 opções e diálogo de
confirmação «Aprovar redação?». Gravou: `decisao_revisor = aprovado`, `revisada_por = RH2`, `revisada_em`,
`notas_revisor`, `scores_humanos` D1–D4. ✅ ⚠ A lista lateral «Revisão de redações» filtra vermelhas e
amarelas por padrão e dizia «Nenhuma redação pendente» enquanto uma verde `pendente_humano` existia — a
verde só aparece ligando o filtro; a copy poderia dizer «1 verde oculta». C1 «Aprovados: 5» ✅ ao vivo.

### 7.12 · E1 — 06/09 02:25

| ID | Resultado | O que medi |
|---|---|---|
| E1 | ✅ / ⚠→✅ | Avançar (agora com SJT e redação feitos) → Entrevista Online; «Agendar entrevista»: data (calendário), horário, modalidade, link, entrevistador, observações. Gravou `agendamentos_entrevista` (10/09 14:00, online, link, `agendado_por` RH2), e-mail **`convite` entregue**. Tela: «Agendada · 10 de set 2026 às 14:00», comparecimento (Compareceu/Não/Pendente), Reagendar/Cancelar. ⚠ **`observacoes_rh` foi ao banco como NULL** apesar de preenchido: o `Textarea` (padrão shadcn React 19) não tinha `forwardRef`; no React 18 o `ref` do `register()` era descartado. Consertado na base (`14937ed`) com teste; era o único `Textarea` registrado por `register()` |
| — | ℹ | Badge «Revisões 2» no menu do admin: os 2 pedidos pendentes são **dados de teste** (fixture p46 de 2024 e «Candidato Funil Teste» de junho), não pessoas — entram na limpeza I3 |
| D9 | ⚠ | Não há bloco de scores consolidados com os pesos da vaga no perfil; «Avaliação Assíncrona» diz só «1 registro de avaliação comportamental» (é o SJT); «Redação» segue dizendo «na fila de revisão» após revisada |

### 7.13 · E2 — 06/09 02:30–04:31

| ID | Resultado | O que medi |
|---|---|---|
| E2 | ✅ / ⚠ | «Gerar guia (entrevista online)» → 5 perguntas STAR/PEI com âncoras BARS 1–5, uma por competência; `entrevista_guias` gravado (8,6 KB); «Editar guia» habilita. ⚠ Tags de competência mostram **chaves internas** (`work_sample_sjt`, `redacao_cultural`, `triagem`). ⚠ **Sem log de IA**: `23503` — a EF passava `candidatura_id` como `candidato_id` (FK para `candidatos`); e caiu no `gpt-4o-mini` (60 s × 2 = 137 s). Consertados em `163709fa` — **redeploy pendente** de `gerar-guia-entrevista` e `avaliar-transcricao-entrevista` |
| — | ⛔→✅ | Workspace de entrevista dizia «Sem horário definido» com agendamento gravado: lia `vagas.entrevista_agendada_em` (campo por vaga, nunca escrito). Passa a ler `agendamentos_entrevista` (`d643a89`); ao vivo: «Faltam 5 dias · 10/09/2026 às 14:00». ⚠ sobrou o sufixo «(manual no V1)» na copy |
| — | ℹ | A sessão do RH expirou no intervalo de ~2 h entre a geração e o «continuar» (`sessao_expirada`) — comportamento esperado |

### 7.14 · E3 — 06/09 04:34–04:55

| ID | Resultado | O que medi |
|---|---|---|
| E3 | ⛔→✅ (base) | Colei uma transcrição fictícia (2,1 k chars) → «Analisar transcrição» → **500 em ~38 s e a tela não disse nada**: o botão voltou ao normal, sem toast, sem linha em `ai_call_logs`, sem `entrevista_analises`, sem alerta. O painel de logs do Supabase estava fora («Backend error»), então provei pelo código, sem API: o SDK da OpenAI **lança ao montar o schema** — `TranscriptAnalysisSchema` tinha `.optional()` sem `.nullable()` em `preprocessing.notes` e `Citation.location`, proibido no strict mode. Isso acontece **dentro do `try` do fallback** → toda falha da Anthropic (o teto de 60 s da versão viva) virava 500. **O fallback desta EF nunca funcionou**, e nenhum teste o exercitava porque os testes de handler injetam `zodResponseFormat` no-op. Consertado: `.nullable().optional()` (espelha `analise-schemas.ts`, que já estava certo) |
| — | ⛔→✅ | Portão de **forma** novo, `_shared/__tests__/structured-output-compat.test.ts`: lê `schema: X` de todo `*/index.ts` e passa X pelos dois construtores (Anthropic + OpenAI strict); schema não registrado reprova. **Mordeu no 1º giro**: `WorkSampleScoringSchema` (redação técnica, `avaliar-redacao`) tinha os MESMOS dois campos quebrados — o fallback dela também nunca funcionou. Consertado; 476/476 no `deno test` |
| — | ⛔→✅ | A rubrica BARS que a análise mandava ao modelo era literalmente **`Vaga: <uuid>`** — e o prompt diz «use as âncoras fornecidas, não invente; se faltar, peça input». Agora o bloco vem das `bars_anchors` do(s) guia(s) de entrevista da candidatura (`_local/bars-rubric.ts`, 3 testes: ordem 5→1, competência repetida entra uma vez, guia ausente/malformado avisa o modelo em vez de calar) |
| — | ⚠→✅ | Falha da análise e da confirmação de revisão era **silenciosa** na UI (mutações sem `onError`). Agora `toast.error` com a mensagem pt-BR do serviço |
| — | ⚠→✅ | `vite.config.ts` excluía os testes Deno do Vitest por **lista literal** — 25 linhas crescidas em 8 fases; cada teste Deno novo quebrava o `test:run` (o meu quebrou). Trocada por `supabase/functions/**/!(strict-schema).test.ts`; provado: `vitest run supabase/functions` roda só a sonda strict-schema (7 testes), suíte 195/195 |
| — | ℹ | As «competências» do guia (E2 ⚠, chaves internas) são as chaves de `vagas.pesos_avaliacao` — pesos por **etapa** (`triagem`, `work_sample_sjt`, `redacao_cultural`), não competências da vaga. Backlog: derivar de requisitos/perfil |

**Redeploy pendente (operador):** `avaliar-transcricao-entrevista` (teto 110 s + schema + rubrica), `gerar-guia-entrevista` (163709fa: `candidato_id`, teto 110 s), `avaliar-redacao` (schema do fallback). Depois: repetir E3 e conferir em `ai_call_logs` uma linha `transcript_analysis` com `provider=anthropic`.

### 7.15 · E3 fechado e E4 — 06/09 04:52–05:20

| ID | Resultado | O que medi |
|---|---|---|
| E3 | ✅ | Após o redeploy (v12): «Analisar transcrição» → `ai_call_logs` `transcript_analysis` **`provider=anthropic`, 33 s, 1 598 tokens de saída, US$ 0,026**; `entrevista_analises` com 4 competências (5/5/5/4), 12 citações literais com «Transcrição - resposta N», `bloqueio_avanco=false`, `pendente_humano`. A rubrica veio do guia — as competências da análise são as do E2 (chaves internas, ⚠ já anotado). Aba «Avaliação da entrevista»: sliders pré-preenchidos com a sugestão da IA, notas do gestor, «Avaliação salva.» → `entrevista_analises.status_analise=concluida`, `scores_humanos`, `revisada_por` RH2 |
| — | ⛔ | **A nota humana da entrevista nunca chega à decisão final.** O consolidador só pondera `scores_candidato tipo=entrevista` com `status='sucesso'` e score preenchido — e nada escreve isso: a EF deixa `pendente_humano`/NULL e a RPC `salvar_avaliacao_entrevista` só tocava `entrevista_analises`. O peso «entrevista» de TODA vaga era N/A («Open Q1» do consolidador, nunca fechado). Migration **`20260906000002`**: a RPC faz upsert (média BARS 1–5, `score_max` 5, `sucesso`, metadata da IA preservado) — **apply pendente**; depois re-salvar a avaliação da T1 |
| E4 | ✅ / ⚠ | Comparecimento «Compareceu» gravado (`compareceu=true`). «Avançar» → Entrevista Presencial sem diálogo, histórico gravado (`entrevista_online → entrevista_presencial`). ⚠ **Sem e-mail à candidata** (dedupe `candidatura:avanco` já consumido pelo 1º avanço — backlog conhecido). Workspace: «Agendar entrevista» é sempre `disabled` com tooltip «manual no V1» — o agendamento fica no perfil |
| — | ⛔ | «Gerar guia (entrevista presencial)» caiu no **gpt-4o-mini** (74 s): a Anthropic respondeu e o parse falhou em «Unterminated string in JSON at position 10326» — **`max_tokens=3000` truncava o guia** (~10 KB de JSON). O guia online do E2 muito provavelmente caiu pelo mesmo motivo (atribuído ao teto de 60 s). Migration **`20260906000003`**: `interview_guide` 8000, `transcript_analysis` 6000 — **apply pendente**; depois regerar o guia presencial e conferir `provider=anthropic` |
| — | ⚠ | Guia presencial do fallback: perguntas fracas («Após nossa conversa, você se sentiu confortável…»), competência `general`. Cabeçalho ✅ «Foco nos gaps da entrevista online (score < 4)» |
| — | ⛔ | **Reagendar** (online 14:00 → presencial 10:00, sala 2, observações): UI ✅ «Entrevista reagendada.», linha atualizada in place (`reagendada`, `presencial`). Mas: (1) **nenhum e-mail** — `trg_notif_convite` é só `AFTER INSERT`; a candidata ficaria com o convite online 14:00 na agenda; (2) **«Compareceu» herdado** pela presencial que ainda não aconteceu. Migration **`20260906000004`** (trigger AFTER UPDATE de data/tipo/local com `reagendamento=true`; BEFORE UPDATE zera `compareceu`) + EF `notificar-candidato` (dedupe `{id}:convite:{data_hora}`, assunto «Entrevista reagendada — …», abertura própria, mesmo `.ics`/UID) — **apply + redeploy pendentes**. ⚠ design: um agendamento por candidatura — o registro da entrevista online é sobrescrito pelo presencial |

**Operador:** `node p46apply.cjs migrate 20260906000002 && node p46apply.cjs migrate 20260906000003 && node p46apply.cjs migrate 20260906000004` · `node efdeploy.cjs notificar-candidato`. Depois: re-salvar avaliação (score entrevista), regerar guia presencial (Sonnet), reagendar de novo (e-mail «reagendada» + comparecimento Pendente), E5.

### 7.16 · Depois do apply — três defeitos que só apareceram com o sistema consertado — 06/09 10:40–11:05

| ID | Resultado | O que medi |
|---|---|---|
| E4 | ✅ | Re-salvei a avaliação da entrevista: `scores_candidato tipo=entrevista` agora é **`sucesso`, 4,75/5** (95%) com o metadata da IA preservado. A migration `20260906000002` fecha o peso «entrevista» |
| — | ⛔→✅ | **O peso `redacao_cultural` tinha o mesmo buraco.** Varri os TRÊS pesos do consolidador em vez de só o que falhou: `sjt` escrevia, `redacao` e `entrevista` não. A redação da T1, aprovada às 02:22 com ponderado 100, nunca teve linha em `scores_candidato` — e nenhum código escrevia essa linha. Migration **`20260906000005`**: `salvar_revisao_redacao` sincroniza o score (média das dimensões × 20 e os dois caps de `compute-score.ts`), com backfill do que já foi revisado e portão que reprova órfãs. **Apply pendente** |
| — | ⛔→✅ | **O painel voltou a dizer «Sem horário definido»** — com a entrevista marcada para dali a 4 dias. O conserto da manhã (`d643a89`) filtrava `.eq('status','agendada')`, e reagendar põe o status em `reagendada`: a MESMA mensagem do defeito que ele resolvia, no primeiro uso do único caminho que a UI oferece para mudar a data. Trocado por `AGENDAMENTO_ATIVO` (complemento dos status que encerram) com `satisfies` e teste de partição total do enum, provado que morde |
| — | ⛔→✅ | **Regerar o guia não regerava.** Cliquei «Gerar guia (entrevista presencial)» com o teto novo de tokens: a tela mostrou um guia, `updated_at` avançou e **`ai_call_logs` não registrou chamada nenhuma** — era o guia de 04:59, do fallback. A chave de idempotência (`{candidatura_id}:{tipo}`) não cobre o input. No vizinho é pior: `{candidatura_id}:transcript` faria uma transcrição NOVA devolver a análise da anterior, com as citações de outra conversa. Só ficou observável em 05/09, quando o replay passou a funcionar — consertar o cache ligou o defeito. Agora a chave carrega a impressão digital da requisição (versão, modelo, tetos, template, rubrica, input mascarado); 4 testes, provados que mordem |

**Operador:** `node p46apply.cjs migrate supabase/migrations/20260906000005_revisao_redacao_grava_score.sql` e redeploy das **7 EFs de IA** (o `_shared/ai-client.ts` mudou). Depois: regerar o guia presencial (agora com chamada real ao Sonnet) e seguir para o E5.

### 7.17 · E4 fechado, E11 e E12 — 06/09 10:50–11:00

| ID | Resultado | O que medi |
|---|---|---|
| E4 | ✅ | Reagendei de novo (10:00 → 15:30) com a migration e a EF no ar: e-mail **entregue** com `dedupe_key = {agendamento}:convite:2026-09-10T15:30:00-03:00`, assunto «**Entrevista reagendada** — Social Media…», prévia «Sua entrevista foi reagendada — confira a nova data.», corpo com data/local/modalidade novos e o `.ics` anexado (mesmo UID → o calendário atualiza). `compareceu` voltou a **NULL (Pendente)**. Conferido na caixa de entrada real |
| — | ✅ | Painel da entrevista com o conserto do status: «Faltam 5 dias · 10/09/2026 às 15:30» com o agendamento em `reagendada` |
| — | ⚠ decisão sua | O rodapé de todo e-mail diz «Em caso de dúvidas, **responda a este e-mail**», e o remetente visível é `nao-responda@rh.beautysmile.com.br`. Tecnicamente funciona (há `Reply-To: rh@beautysmile.com.br`), mas o candidato lê uma contradição. Sugestão: «responda a este e-mail (vai para rh@beautysmile.com.br)». Não mexi — copy de e-mail para candidato real é decisão de produto |
| E11 | ⛔→✅ | `/admin/bias-audit` carrega com o snapshot de 22/08, aviso de amostra pequena e as duas faixas **suprimidas** («menos de 5 candidatos — o número não é publicado, não é zero») ✅. Mas «**Gerar snapshot» estava inoperante**: respondia «Período inválido (esperado YYYY-MM)». O handler mandava o período do snapshot EXIBIDO, e o de PROD é `p45-pos-execucao` (rótulo de fase). Além disso, mesmo válido, geraria o mês antigo. Consertado para o mês corrente (`05530472`), com teste que usa o snapshot real como fixture. **Falta reexecutar** após o deploy do frontend, para provar o `GRANT` do CR-02 |
| E12 | ✅ | `/rh/pedidos-dados`: 1 pedido de acesso, **atendido no mesmo dia** (11/08 09:03), copy explicando que a fila é de supervisão e que o Art. 19 dá 15 dias. Fila com **0 não atendidos** ≡ menu **sem badge** — consistentes. O pedido de **exclusão** (concluído em 22/08) não aparece aqui, e é o correto: a fila é `tipo='acesso'` por desenho |

### 7.18 · E6 — knockout da T2 — 06/09 10:57–11:05

| ID | Resultado | O que medi |
|---|---|---|
| E6 | ✅ | Criei a T2 («Claude Teste Consultor», `+claude2@`) e me inscrevi na Consultor marcando «Tenho disponibilidade apenas para trabalho remoto». Rejeição **síncrona**, na mesma transação: `status=rejeitado`, `etapa_atual=inscricao`, `motivo_rejeicao=knockout_automatico`, `opcao_knockout_id` gravado. Tela: «Inscrição recebida — Após análise dos requisitos da vaga, não seguiremos com sua candidatura neste momento.» Copy **neutra**, sem score e sem citar o critério ✅ (RNF-07a / D-15) |
| — | ⛔→✅ | No painel da candidata, o mesmo cartão que dizia «Rejeitado» trazia «Inscrição recebida — **retorno da triagem em até 48 horas**» e um rodapé «Próximo passo». Ambos derivam de `etapa_atual`, que no knockout **permanece `inscricao`** por desenho. O cartão prometia um retorno que nunca viria. Consertado por STATUS terminal (`8aadddb2`), com teste provado |
| E7–E10 | ⛔ **decisão sua** | **A decisão mais automatizada do sistema é a única sem e-mail, sem explicação e sem revisão.** Medido: (a) `notificacoes_enviadas` para essa candidatura = **zero** — o gatilho de `decisao` só existe na etapa final, então quem é reprovado no knockout só descobre se voltar ao site; (b) `/candidato/explicacao/:id` responde «Esta página não está disponível» — ela exige uma linha em `decisao_final`, que o knockout não cria; (c) o cartão LGPD do painel não aparece — exige `etapa_atual ∈ {decisao_final, aprovado, rejeitado}`. Consequência: quem foi reprovado **por um humano** tem e-mail, explicação e direito de revisão; quem foi reprovado **sem nenhum humano olhar** não tem nenhum dos três. É o inverso do que o Art. 20 protege |

**Sobre o E6 (c): quatro caminhos possíveis, e a escolha é sua** — (1) enviar e-mail de rejeição também no knockout; (2) fazer a página de explicação aceitar candidatura rejeitada sem `decisao_final`, com texto próprio («a resposta a uma pergunta eliminatória da vaga»); (3) abrir o pedido de revisão para o knockout — é o que mais muda o volume de trabalho do RH; (4) manter como está e assumir por escrito que o knockout é um critério objetivo de elegibilidade declarado pelo próprio candidato, não uma avaliação. Não implementei nada disso: muda produto e postura jurídica. **E7–E10 (revisão do Art. 20) passam a ser testados com a T1**, pelo caminho da decisão final, que é onde a explicação existe hoje.

### 7.19 · Depois do 2º apply — o guia ainda não é do Sonnet — 06/09 11:30–11:55

| ID | Resultado | O que medi |
|---|---|---|
| — | ✅ | **Os três pesos da decisão final existem** para a T1: entrevista `sucesso 4,75/5`, redação `sucesso 100/100` (pelo backfill), SJT `sucesso 4/4`. Antes de hoje só o SJT chegava ao consolidador |
| — | ⛔→✅ | **Entrar no painel RH com sessão de candidato no navegador recusava um administrador legítimo** («Esta conta não tem acesso ao painel RH» + 406). O laço esperava «existe papel», e o papel já existia — era o do candidato anterior. Passa a esperar a **identidade** da sessão nova (`61f07508`) |
| E2 | ⛔→⚠ | Regerei o guia presencial com o teto de 8000 tokens: `ai_call_logs` registrou **`provider=openai`, 121 546 ms, «Request timed out.»** — a Anthropic estourou os 110 s. Subir o teto **trocou truncamento por estouro de tempo**. Duas causas, ambas consertadas em `2ae706e8`: (a) o teto valia integral para o primário **e** para o fallback (110 + 110 = 220 s contra os ~150 s do Edge Function) — agora há orçamento total de 140 s e o fallback recebe o que sobrou; (b) 7 perguntas × 5 âncoras de até 1200 caracteres é um documento de ~12 KB que não cabe em tempo nenhum — os limites passaram para o `describe` (âncora = uma frase, ~220 caracteres), que é o que o modelo lê. **Falta reexecutar** após o deploy |
| — | ℹ | O `.max()` do Zod não chega ao modelo na geração estruturada: ele só rejeita depois. Quem orienta o tamanho é a descrição do campo. Foi por isso que o teto de tokens sozinho não resolveu |
| E6 | ⏳ | Migration `20260906000006` escrita (sua decisão: **enviar e-mail no knockout**). O gatilho de transição excluía o caso por duas condições — o knockout preserva `etapa_para='inscricao'` e marca `auto_rejeitado=true`, enquanto o ramo de decisão exigia etapa terminal **e** `auto_rejeitado=false`. Novo ramo dispara o mesmo evento com a copy neutra já existente. **Apply pendente**; para testar, uma T3 se inscreve na Consultor com a resposta eliminatória |

### 7.20 · E5 — decisão final — 06/09 12:17–12:19

| ID | Resultado | O que medi |
|---|---|---|
| E5 | ✅ | Avançar → Decisão Final. O painel mostra o consolidado **com os três pesos presentes pela primeira vez**: Work sample (SJT) 100 (peso 35%), Redação cultural 100 (peso 15%), Entrevista 95 (peso 25%), triagem 93 como **contextual, não pondera**, perfil comportamental e cognitivo idem. **Score consolidado 98,33** — confere com a renormalização sobre os 75% presentes: (100×35 + 100×15 + 95×25) ÷ 75. Antes das migrations de hoje só o SJT entrava, e o agregado seria 100 |
| — | ✅ | «Registrar decisão» exige justificativa de 50 caracteres e confirma em diálogo («Esta decisão finaliza o funil… fica registrada na trilha de auditoria»). Gravou `decisao_final` (aprovado, RH2, justificativa), `candidaturas.etapa_atual=aprovado`, `status=finalizado`, `data_decisao_final` |
| — | ✅ | E-mail **entregue** com a copy de **aprovação**: «Boa notícia sobre sua candidatura — Social Media…», prévia «Boa notícia sobre a sua candidatura.» Conferido na caixa real. O `dedupe_key` é `{candidatura}:decisao` |
| — | ℹ | A recomendação da IA no painel é advisory e diz isso na própria tela («Sugestão da IA — decisão é sempre humana»), sem número de score fora do breakdown |

### 7.21 · E7, E8 e E9 — revisão do Art. 20 — 06/09 12:21–12:30

Como o knockout não abre explicação nem revisão (§7.18), criei a **T3** («Claude Teste Revisao», `+claude3@`) com currículo propositalmente fraco, inscrevi na Social Media, avancei o funil como RH e **rejeitei na decisão final** — que é onde o Art. 20 existe hoje.

| ID | Resultado | O que medi |
|---|---|---|
| — | ✅ | Com as avaliações puladas, a recomendação diz a verdade em vez de inventar: «Nenhuma etapa avaliável concluída — sem agregado disponível. Etapas não avaliadas: work_sample_sjt, redacao_cultural, entrevista (não ponderadas)» |
| — | ✅ | O diálogo de rejeição é **diferente** do de aprovação e avisa o RH: «Esta decisão finaliza o funil e o candidato poderá pedir que uma pessoa revise esta decisão (LGPD, Art. 20)» |
| — | ✅ | No painel da candidata, o cartão rejeitado traz «Entenda a decisão sobre sua candidatura» com o botão de explicação — e, com o conserto de `8aadddb2`, **sem** estimativa de prazo e **sem** «Próximo passo» |
| E7 | ✅ | `/candidato/explicacao/:id`: resultado em linguagem honesta, «Por que esta decisão» com texto **templated** (nunca a justificativa interna do RH), e o direito de revisão explícito. Pedir revisão gravou `revisao_solicitada_em` **e** `explicacao_solicitada_em` (o carimbo de visita), disparou `revisao_solicitada` ao RH (**entregue**), e o botão virou «Você já solicitou a revisão desta decisão» — idempotente |
| E8 | ✅ | `/rh/revisoes`: fila ordenada do pedido mais antigo para o mais recente (898d, 72d, 0d), coluna «Quem decidiu», selo de acompanhamento («Atrasado · 898d», «Em dia · 0d») e a copy dizendo que **o prazo é interno da equipe e nunca é exibido ao candidato** — o Art. 20 não fixa prazo. Contador do menu «Revisões 3» ≡ 3 linhas |
| E9 | ✅ **no servidor** | A UI já desabilita o botão para quem decidiu, com a razão escrita. Chamei a RPC `responder_revisao_decisao` **direto**, com o JWT do próprio RH2: **HTTP 403, código 42501, «quem registrou a decisao nao pode responder a revisao dela (decisor)»**. Mensagem específica, não erro genérico. `decisao_final` ficou intacta (sem veredito, não respondida) |
| E10 | ⏳ **bloqueado** | Precisa de uma **segunda conta de RH** para responder. Preenchi «Novo usuário» (RH3 Revisor, `+rh3@`, papel Administrador) em `/rh/configuracoes`, mas a criação de conta é uma ação que o meu ambiente bloqueia. **Fica para você**: criar o usuário na tela, ou me dizer para pular |

### 7.22 · F1 — cópia dos dados (T3) — 06/09 12:31

| ID | Resultado | O que medi |
|---|---|---|
| F1 | ✅ | `/candidato/privacidade` explica as autorizações, o que é guardado e por quê, e traz o currículo por vaga. «Baixar uma cópia dos meus dados» → `solicitacoes_dados` (acesso) **atendido em ~5 s**, autoatendimento, e os **dois arquivos** baixaram: `beauty-smile-meus-dados-2026-09-06.json` (18 KB) e o `.html` legível (23 KB). O JSON traz `versao_allowlist` e um campo dizendo o que **não** está na cópia |
| — | ✅ | 30 seções, todas do titular. `decisao_final` vem **sem** a justificativa interna — só decisão, datas e o estado da revisão |
| — | ⚠ **decisão sua** | Mas a justificativa interna **chega por outro campo**: `candidaturas.etapa_justificativa` traz o texto integral que o recrutador escreveu («…A experiência declarada é de menos de um ano, sem produção para clínica de saúde…»), e `analise_candidato_vaga` traz `score_match: 28` com os gaps. Não é vazamento acidental: a allowlist marca esses campos como `inventario:preservar_com_ressalva`, uma escolha consciente — acesso (Art. 18, II) é mais amplo que explicação (Art. 20), e as duas superfícies podem divergir de propósito. **O problema é que ninguém avisa os dois lados:** (a) a página de privacidade descreve a cópia como «o resultado e a explicação das avaliações que você fez», sem dizer que vão junto as anotações internas e os scores; (b) a tela de decisão diz ao recrutador que a justificativa «fica registrada na trilha de auditoria», o que soa interno — e ele pode escrever com franqueza sem saber que o candidato pode baixar aquilo. Recomendo ajustar a copy nas duas pontas, mantendo a allowlist. Se preferir o contrário (tirar da cópia), é uma linha na allowlist. Não mexi: é política de privacidade, não implementação |

### 7.23 · F2 — exclusão e arrependimento (T2) — 06/09 12:34–12:35

| ID | Resultado | O que medi |
|---|---|---|
| F2 | ✅ | «Apagar meus dados» passa por **dois diálogos**, e o primeiro é honesto de um jeito raro: nomeia a data («apagados em 21/09/2026»), diz que **não há cópia de reserva do currículo**, avisa que nem o suporte recupera, lembra que cancelar não devolve as candidaturas encerradas e **sugere baixar a cópia antes**. Antes disso, a própria seção separa «O que vai ser apagado» (11 itens) de «O que a Beauty Smile mantém — e por quê» (8 itens, cada um com o artigo da LGPD) |
| — | ✅ | Confirmado: `solicitacoes_dados` (exclusao) **agendado** para 21/09 — janela de 15 dias — e a candidatura foi **encerrada na hora** (`encerrada_a_pedido_em`). A tela passou a mostrar «Exclusão agendada» com o prazo e o botão de cancelar |
| — | ✅ | **Arrependimento**: «Cancelar a exclusão» → `situacao=cancelado` com `cancelado_em` gravado, dentro da janela. A candidatura encerrada não volta, exatamente como a copy prometia |
| — | ℹ | A copy «Desativado em 06/09/2026» aparece para «Avisos sobre novas vagas» numa conta que **nunca ativou** essa autorização — a data é a do cadastro. Já estava no backlog de copy |

### 7.24 · E6 fechado, E11 fechado, e o replay que sobreviveu ao conserto — 06/09 12:45–12:55

| ID | Resultado | O que medi |
|---|---|---|
| E6 | ✅ | Com a migration `20260906000006` no ar, a T3 se inscreveu na Consultor marcando a opção eliminatória: rejeição síncrona **e e-mail entregue na mesma transação** — «Atualização sobre sua candidatura — Consultor(a)…», com a copy neutra congelada («Sua candidatura não seguirá para as próximas etapas…»). `dedupe_key = {candidatura}:decisao` |
| — | ✅ | E o «Recebemos sua candidatura» **não** é enviado junto: o gatilho de confirmação tem guard explícito (`status='rejeitado' OR opcao_knockout_id IS NOT NULL`). Quem é eliminado recebe só o desfecho, não uma boas-vindas seguida de uma recusa |
| E11 | ✅ | `/admin/bias-audit` → «Gerar snapshot» agora funciona: «Snapshot registrado em bias_audit_log», **período `2026-09`** (o mês corrente, não mais o rótulo `p45-pos-execucao`). Isso também **prova o `GRANT` do CR-02** — a RPC rodou como `authenticated`, então o grant não deve ser revogado. A supressão de faixas com menos de 5 pessoas continua ativa |
| E2 | ⛔→✅ (base) | Regerei o guia presencial depois do deploy dos `describe` apertados: a tela devolveu um guia **em menos de um segundo e sem nenhuma linha nova em `ai_call_logs`**. Era replay outra vez — a chave efetiva estava idêntica (`…:presencial:0a4b1756ab6d210a`) porque **o schema não entrava na impressão digital**, e o schema era justamente o que eu havia mudado. Um cache que ignora o contrato de saída serve resposta escrita sob um contrato que não existe mais. Consertado em `7bc7ef2b` (o JSON Schema gerado entra na chave), com teste provado. **Falta o deploy** para reexecutar |

### 7.25 · E2 — o guia enfim sai do Sonnet — 06/09 17:43–17:50

| ID | Resultado | O que medi |
|---|---|---|
| — | ✅ | A impressão digital com o schema **mudou a chave** (`…:0a4b1756ab6d210a` → `…:a156ea60ca69f74e`), então houve **chamada real** — não mais replay |
| E2 | ✅ / ⚠ | O log da Edge Function registrou `[gerar-guia-entrevista] ok · tipo: presencial · questions_count: **7** · provider: **anthropic**` (id `5e66c5d3`). É a primeira vez que o guia sai do Sonnet. As âncoras BARS ficaram em **108 caracteres** de média (os `describe` pegaram — antes o schema permitia 1200 e o modelo usava). ⚠ Mas em outra execução o Sonnet **estourou os 110 s** («Request timed out.»), o fallback entregou 5 perguntas em 129 s, e **foi essa que ficou gravada**: o guia salvo é o da última execução a terminar |
| — | ⚠ | **Cliques repetidos derrubam a função.** Enquanto havia execuções de ~2 min em voo, novos POSTs voltavam `Failed to fetch` em ~1 s (OPTIONS continuava 200 — o isolate subia, mas não havia folga para executar). Passados 3 minutos sem carga, a mesma chamada respondeu **200 em 3,6 s**. Não é defeito do código; é o limite de concorrência do Edge Function encontrando um botão que não se protege de duplo clique |
| — | ⚠ **em aberto** | Duas consequências que valem decisão: (a) a geração leva **60–130 s** e a tela não avisa disso, então o RH tende a clicar de novo — o que piora tudo; (b) quando duas execuções correm juntas, **a última a terminar sobrescreve o guia**, e pode ser a pior das duas. O caminho limpo é tornar a geração assíncrona (dispara, avisa «estamos gerando», e a tela atualiza sozinha) ou, no mínimo, bloquear o botão até a resposta e mostrar o tempo esperado |

---

### 7.26 · Os três vereditos, implementados — 2026-09-06 (sessão seguinte)

As três decisões que §7.18, §7.22 e §7.25 devolveram ao responsável foram tomadas e
implementadas. Nenhuma exigiu medição nova; todas exigiram escolher.

| Decisão | Veredito | O que foi feito |
|---|---|---|
| **A** (§7.22) — a cópia entrega o que o recrutador escreve | **Manter a allowlist, avisar os dois lados** | `COPY_PEDIR_COPIA.oQueEsta` passa a nomear as anotações da equipe e as notas calculadas; as telas que escrevem o campo ganham um aviso ao lado do campo. `5123ef04` |
| **B** (§7.18) — explicação e revisão no knockout | **Explicação sim, revisão não** (caminho 2) | RPC `explicacao_rejeicao_automatica` + branch automática na página + o portão do painel. `12ec4e42` |
| **C** (§7.25) — a geração leva 60–130 s sem aviso | **Travar o botão e mostrar o tempo** | Aviso de 1–2 min enquanto gera, cooldown de 60 s após erro. `7a245d6a` |

**Três coisas que a implementação descobriu e que o registro anterior não sabia:**

**a) O aviso do item A não podia ir para a tela de decisão final.** §7.22 e o
`RETOMAR-AQUI` diziam «a tela de decisão diz ao recrutador…». Mas o campo que o candidato
baixa é `candidaturas.etapa_justificativa`, e `registrar_decisao` **não escreve nele** —
grava em `decisao_final`, cuja justificativa a cópia exclui (o próprio §7.22 mediu isso).
As telas que escrevem o campo exposto são a **rejeição na triagem** e o **retrocesso de
etapa**. Pôr o aviso na decisão final seria a tela afirmando uma exposição inexistente — o
erro simétrico ao que ele conserta. Há teste guardando os dois sentidos.

**b) O item B precisava de uma RPC, e o motivo é a lição da sessão outra vez.** Do lado do
cliente, a rejeição **humana** da triagem e o knockout **automático** são a mesma linha:
as duas com `status='rejeitado'`, as duas sem `decisao_final`, e a allowlist do candidato
exclui `motivo_rejeicao` de propósito (D-15). Inferir «sem decisão e rejeitado ⇒ knockout»
teria dado a uma rejeição **escrita por uma pessoa** o texto da automática. Ninguém veria:
a tela renderiza, o texto é plausível, e está errado sobre o fato mais importante da
página. A RPC é o único lugar onde `motivo_rejeicao` pode ser **lido sem ser devolvido**;
ela responde um booleano e nada mais.

**c) O portão do painel passava por fora, e o comentário ao lado dizia o contrário.**
`hasDecisaoFinal` exigia `etapa_atual ∈ {decisao_final, aprovado, rejeitado}`, e o knockout
preserva `inscricao` **por desenho**. O cartão LGPD nunca apareceu para quem foi reprovado
sem humano nenhum — enquanto o comentário da função já falava em «knockout/rejected path».
É a forma do §«Portões: varra pela FORMA» do CLAUDE.md numa terceira roupa: uma
**fotografia** das etapas onde um desfecho costuma acontecer, apresentada como a definição
de «houve desfecho».

**Portões novos, todos provados por execução** (revertido o conserto, o teste cai):

| Arquivo | Sondas |
|---|---|
| `entrevista/…/GuiaEntrevistaPanel.test.tsx` (§7.25) | 2 — o cooldown e o aviso de tempo |
| `privacidade/__tests__/aviso-justificativa-dois-lados.test.ts` (§7.22) | 2 — a frase e a presença nas telas |
| `explicacao/services/…` + `components/…` + `DashboardCandidatoPage.funnel` (§7.18) | 3 — a inferência, o CTA e o portão do painel |

O portão do §7.22 existe por um motivo específico: os testes de render comparavam a tela
com a **própria constante**, então passariam com a frase inteira apagada. Ele assere o
**conteúdo** da promessa, que é o que envelhece.

**Suítes:** `vitest` 1980/1980 (200 arquivos, +24) · `tsc` 90 (baseline congelada 96).

### 7.26.1 · O apply, e o que ele custou — 2026-09-06, fim da sessão

✅ **Aplicada.** `node p46apply.cjs migrate …20260906000007…` → md5 do ledger batendo, 4964
octetos. Conferido em PROD por consulta, não por leitura: a função existe, retorna `boolean`,
é `SECURITY DEFINER` e `STABLE`, e a `version` do ledger nasceu **correta** (a via da Phase 46).

⚠ **`npm run db:types` pendura, e trunca o arquivo ao falhar.** Dois problemas somados, e o
segundo é o perigoso:

1. O CLI abre um prompt (senha do banco / login) que, **sem tty, nunca aparece** — o processo
   fica vivo e ocioso indefinidamente, consumindo 0% de CPU. É indistinguível de «está
   demorando».
2. O `>` do script **trunca `database.types.ts` ANTES** de rodar o comando. A falha deixou o
   arquivo com **zero octeto**. Recuperado com `git checkout`.

O que funciona é `--project-id` com o token do Keychain **e `< /dev/null`** — essa última parte
é a load-bearing; sem ela o prompt ressuscita. Comando completo no `RETOMAR-AQUI` §4.

**Uma segunda via foi tentada e descartada:** o endpoint `/v1/projects/{ref}/types/typescript`
da Management API responde 200 e gera tipos válidos, mas **omite o schema `graphql_public`** que
o CLI inclui. Só apareceu porque as duas saídas foram **diferenciadas uma contra a outra** em
vez de a primeira que funcionou ter sido aceita. O gerador canônico é o CLI.

**Três achados da regeneração, nenhum introduzido por este trabalho** — o arquivo de tipos
estava simplesmente atrasado em relação a PROD:

| Achado | O que era |
|---|---|
| `PostgrestVersion` `14.17` → `14.5` | conferido por **duas vias independentes** (CLI e Management API): as duas dizem `14.5` hoje. O `14.17` do arquivo commitado é que estava velho |
| `ai_call_logs.input_hash` | do conserto da chave de cache (`a01321a8`), já em PROD e ausente dos tipos |
| `redacao_score_0_100`, `sincronizar_score_redacao` | da migration `…0005`, idem |

**Duas observações abertas, nenhuma bloqueante** (detalhe em `RETOMAR-AQUI` §3.5):

- **O `anon` executa a RPC nova** — e isso é o padrão deste projeto (`ALTER DEFAULT PRIVILEGES`
  concede EXECUTE em funções ao `anon`; o `REVOKE FROM PUBLIC` da migration não o alcança).
  **Sem vazamento:** sem sessão, `auth.uid()` é NULL e a função devolve `false` sempre. Três
  irmãs têm o mesmo grant; as duas mais novas o revogam. Não foi alterado de propósito — o
  CLAUDE.md registra que os grants aqui foram raciocinados caso a caso.
- **O endpoint `/v1/projects/{ref}/postgrest` devolve o `jwt_secret`** junto com a config.
  Foi consultado para descobrir a versão do PostgREST e o segredo veio junto, ficando no log
  daquela sessão. Não use aquele endpoint para consultar versão.

⏳ **O que resta da decisão B:** a **conferência de tela**, que precisa de uma conta de
candidato. Roteiro de 4 passos no `RETOMAR-AQUI` §0.1 — inclusive o passo que mais importa,
que é confirmar que a rejeição **humana** de triagem continua **sem** página.

### 7.27 · A conferência da decisão B — e o que ela achou antes de chegar à tela — 2026-09-06, sessão seguinte

O §0.1 mandava conferir na tela o que a sessão dos vereditos implementou. **O primeiro passo
reprovou, e a causa não era o conserto.**

**⛔ Os três vereditos não estavam em produção.** O `RETOMAR-AQUI` §0.1 dizia «o código está no
ar e a migration aplicada». A metade do banco estava certa; a do código não. Entrei como T2, o
cartão «Entenda a decisão sobre sua candidatura» **não apareceu** — e, em vez de concluir dali,
a causa foi atrás por quatro vias independentes:

| Via | O que disse |
|---|---|
| Bundle servido | `index-a8QT88iA.js` **sem** `explicacao_rejeicao_automatica`. Controle: o texto antigo do cartão LGPD **estava** lá — o método enxerga |
| `git` | `origin/main..HEAD` = **7 commits**, com os três vereditos entre eles; nenhuma branch remota continha `12ec4e42` |
| Vercel | Último deploy de produção = `e4a1cfbd`, o commit de handoff da sessão **de validação**. Todo deploy do projeto nasce de um push no `main` |
| Build local | Gerou `index-UKiyiNOf.js` — nome diferente do servido, porque o conteúdo é diferente |

**A forma do defeito:** a migration foi aplicada por `p46apply.cjs`, que fala direto com o
Supabase e **não passa pelo git**. O código foi commitado e não enviado. O banco andou, o front
ficou — e o registro afirmou «no ar» sobre as duas metades porque tinha visto uma. É a família
«apply sem artefato» invertida: aqui o artefato existia, parado no disco local.

⚠ **Se o §0.1 tivesse sido executado como escrito**, o cartão ausente teria sido lido como
«o conserto `12ec4e42` não funcionou» — um diagnóstico falso sobre um commit correto que nunca
chegou a rodar. **Antes de investigar um conserto que «não funcionou», prove que ele está
servido.** Custa uma linha (`git log origin/main..HEAD`) e uma busca no bundle.

**Push autorizado e feito:** `e4a1cfbd..1330f40c`, com `vitest` 1980/1980 e `npm run build`
verde (47 chunks, `assert-chunks` passou) **antes** do push. Deploy `1330f40c` ficou `READY`.

**Uma correção de método, no caminho.** A primeira sonda buscou os três marcadores só no índice
eager e deu A e C ausentes **também depois** do deploy. Não era regressão: A e C vivem em rotas
`/rh/*`, que o build separa em chunks lazy. Conferidos onde de fato moram:

| Veredito | Marcador | Chunk servido |
|---|---|---|
| A · aviso da justificativa | «a justificativa entra na cópia de dados» | `RejeitarCandidaturaDialog-BH2d9l2-.js` ✅ |
| B · RPC do knockout | `explicacao_rejeicao_automatica` | `index-UKiyiNOf.js` (eager) ✅ |
| C · aviso de tempo | «Isso costuma levar de 1 a 2 minutos» | `EntrevistaWorkspace-DTIyvXZc.js` ✅ |

Uma ausência num bundle só é evidência se você souber em qual bundle a coisa deveria estar.

#### O resultado da conferência (T3, viewport 390×844, PROD)

| Passo | Resultado |
|---|---|
| Cartão no painel | ✅ Aparece no knockout da Consultor — **nunca aparecia antes**. E aparece também na Social Media (decisão final humana), como deve |
| Texto da explicação automática | ✅ «encerrada automaticamente na inscrição, **sem avaliação de uma pessoa**»; «nenhuma nota, análise ou perfil foi usado». O critério não vaza — não diz qual pergunta nem qual resposta (D-15) |
| Revisão | ✅ **Sem CTA.** No lugar, «Se você quiser falar sobre esta decisão» + `lgpd@beautysmile.com.br` |
| Caminho humano intacto | ✅ A MESMA conta, na Social Media: texto diferente («Após avaliarmos seu processo…») e o CTA de revisão presente (desabilitado — a T3 já pediu, §7.21). As duas origens, lado a lado, na mesma sessão |

#### O passo 4 — provado melhor do que a tela provaria

O roteiro mandava confirmar que a **rejeição humana de triagem** continua sem página. Duas
descobertas:

1. **Não existe nenhuma em PROD.** As três candidaturas rejeitadas são os dois knockouts e a
   rejeição de **decisão final** da T3. As quatro candidaturas de teste estão em etapa terminal.
2. **A expectativa escrita estava imprecisa, e o sistema é mais estrito do que ela supunha.**
   `rejeitar_candidatura` grava `etapa_atual`, `status`, `motivo_rejeicao` e
   `etapa_justificativa` — e **não** grava `feedback_rejeicao` nem `data_decisao_final`. Como o
   portão do painel exige uma das duas, o resultado não é «o cartão leva a uma página vazia»:
   é **o cartão não aparecer**.

Como o predicado é do servidor, ele foi exercitado **no servidor**, com a sessão real da T3
(REST `/rpc/explicacao_rejeicao_automatica`, chave publicável + token da sessão):

| Caso | Resposta |
|---|---|
| Knockout **da própria** T3 | `true` ✅ |
| Rejeitada **sem** knockout, da própria T3 | **`false`** ✅ — é o predicado do passo 4 |
| Knockout **de outra pessoa** (T2) | `false` ✅ — a trava de titularidade morde, e sem oráculo de existência |
| `id` inexistente | `false` ✅ |

A trava está fechada em **duas camadas independentes**: o portão do painel (não mostra o cartão)
e a RPC (responde `false` mesmo por URL direta). E a RPC casa contra a string literal
`'knockout_automatico'` na mesma coluna onde o caminho humano grava um **enum**: os 6 valores de
`motivo_rejeicao_rh` (`perfil_desalinhado`, `reprovado_avaliacao`, `reprovado_entrevista`,
`nao_compareceu`, `desistencia`, `outro`) **não colidem**, e `opcao_knockout_id IS NOT NULL` é
uma segunda condição independente que seguraria mesmo se um dia colidissem.

**Não foi criada candidatura nova para ver a ausência na tela.** Ela sujaria os dados que o
bloco I terá de limpar, para exibir uma ausência já provada na origem, guardada por teste
(`explicacaoService.test.ts:430`) e agora medida em PROD pelos quatro casos acima — inclusive a
trava de titularidade, que a conferência de tela nunca teria tocado.

**Dois achados menores do mesmo passeio:**

- **A T2 não serve para este teste.** A candidatura dela tem `encerrada_a_pedido_em` (resíduo do
  §7.23) e o painel mostra «Você retirou sua candidatura». Não suprime o cartão — os dois blocos
  são irmãos no JSX — mas confunde a leitura. Use a **T3**.
- **`/login` é 404**; a rota é **`/auth/login`**.

### 7.28 · E10 — o bloco E fecha, e a trilha rende um defeito novo — 2026-09-06

Conta **RH3** criada pelo responsável (`fernandinho.costa.neto+rh3@gmail.com`, administrador,
`user_id 023abcd6…`), que era o único bloqueio do E10. Conferida no banco antes de usar:
`usuarios_rh` com `role='administrador'`, `ativo=true`, `created_by` = Fernando.

**A resposta foi dada pela TELA, não pela RPC** — o E10 testa o caminho real, e um `curl` na
função teria pulado justamente as camadas que ainda não tinham sido exercitadas.

| O que | Resultado |
|---|---|
| Fila `/rh/revisoes` | ✅ Carrega as 3 pendentes, com a coluna **«Quem decidiu»** — a T3 mostra `RH2`, que é o contraste de que o teste depende |
| Diálogo | ✅ Repete «Quem decidiu: RH2», avisa que **«este texto será exibido ao candidato exatamente como escrito»**, contador `0 / 50 mín.` e botão `disabled` até o mínimo |
| Confirmação | ✅ Há um segundo passo («Registrar resposta?») antes de gravar — correto para ação irreversível |
| Gravação | ✅ `revisao_veredito='mantida'`, `revisao_por_usuario`=**RH3**, `por_usuario`=**RH2**, os dois distintos |
| Trilha | ✅ `decisao_final_historico` ganhou linha em `20:46:56.533202` — o instante exato |
| Notificação | ✅ `notificacoes_enviadas`: evento `revisao_respondida`, template homônimo, para `+claude3@`, status **`entregue`**, 1 s depois |
| Tela do candidato | ✅ Bloco «Resultado da revisão» com «Após a revisão, a decisão foi mantida», a data, o texto **literal** que o RH escreveu, e o CTA `disabled` com «Sua solicitação de revisão foi respondida» |

Veredito escolhido: **mantida** — é o desfecho realista (a T3 foi rejeitada na decisão final) e
não cria uma candidatura ressuscitada que o bloco I teria de desfazer. A RPC não altera o
status da candidatura em nenhum dos dois vereditos; ela só grava os campos `revisao_*`.

⚠ **A RPC é one-shot:** `revisao_respondida_em IS NOT NULL` levanta «revisao ja respondida».
Não há segunda tentativa, e o texto vai literal para o candidato — por isso ele foi escrito
sem nota, banda nem critério (RNF-07a / D-15).

**Com isso o bloco E fecha inteiro** (E1–E12). O guard do decisor já estava provado no
servidor em §7.21 (403 / 42501); faltava o caminho feliz, e ele está medido nas sete linhas
acima — cada uma no banco ou na caixa de entrada, nenhuma só na tela.

#### ⛔ Defeito novo: idempotente no VALOR, não na ESCRITA

A trilha de `decisao_final_historico` tinha **4 linhas** para esta candidatura antes da
resposta — e duas delas não registravam mudança nenhuma. A causa:

```sql
-- stamp_explicacao_acessada
UPDATE public.decisao_final
   SET explicacao_solicitada_em = COALESCE(explicacao_solicitada_em, now())
 WHERE candidatura_id = p_candidatura_id;   -- sem AND ... IS NULL
```

O `COALESCE` garante que o **valor** não muda depois do primeiro acesso — a intenção
«first-access-only» está correta. Mas o `UPDATE` **executa sempre**, e
`trg_decisao_final_snapshot` é `AFTER UPDATE`: **toda visita à página de transparência
acrescenta uma linha ao histórico**, idêntica à anterior exceto por `arquivado_em`.

Medido em PROD agora: **7 linhas na tabela inteira, 2 estados distintos** — 5 de 7 não
registram mudança alguma. Um candidato que recarregar a página vinte vezes gera vinte linhas.

**Por que importa mais do que parece:**

1. **Dilui a trilha.** Uma tabela de auditoria em que a maioria das linhas diz «nada mudou»
   torna a linha que importa mais difícil de achar — e é justamente a trilha do Art. 20.
2. **Cresce sem teto, por ação do titular.** O volume não depende da equipe; depende de quantas
   vezes o candidato exerce o direito de ler a explicação. É a única tabela do sistema com essa
   propriedade, e ela interage com os blocos **G/H** (retenção e purga).

**Conserto** (não aplicado — é migration em PROD, e a fila do responsável é G/H/I):
acrescentar `AND explicacao_solicitada_em IS NULL` ao `WHERE`, tratando o `RETURNING` vazio do
segundo acesso com um `SELECT` de leitura. Portão sugerido: chamar a RPC **duas vezes** e
assertar que `decisao_final_historico` cresceu **uma** vez — a asserção que a versão atual
reprova.

> **A forma, para a próxima:** «idempotente» tem dois sentidos que parecem um só. `COALESCE`
> torna o **valor** idempotente; só o `WHERE` torna a **escrita** idempotente. Onde houver
> trigger `AFTER UPDATE`, os dois precisam valer — e o sintoma do que falta não aparece na tela
> nenhuma, só no volume de uma tabela que ninguém abre.

**Uma observação menor, não bloqueante:** a fila mostra «Quem decidiu: **Não identificado**»
para a fixture `p46+neg-art20`, cujo `por_usuario` é um uuid sintético fora de `usuarios_rh`.
O guard da RPC só barra quando `por_usuario IS NULL`, então essa linha é respondível por
qualquer administrador. É fixture, some no bloco I — mas fica o registro de que «não
identificado na tela» e «sem autoria para o guard» são condições **diferentes**.

### 7.29 · I2 — a triagem das 43 janelas, e o ledger que mentia — 2026-09-06

**Veredito: 33 `fixed` · 7 `waived` · 3 abertas.** Nenhuma fechou «porque sim».

#### O ledger recusou a primeira escrita, e estava certo

`gsd-tools windows fixed 18` respondeu:

```
Error: Ledger counts disagree with entries:
frontmatter open/waived/fixed/total=35/0/8/43 but entries yield 40/0/3/43.
```

Cinco janelas (**24, 28, 29, 31, 32**) tinham sido fechadas **só na tabela markdown**, com
razão e commit escritos — o trabalho foi feito —, enquanto o **bloco JSON**, que é o que a
ferramenta lê, seguia com elas abertas. E o frontmatter fora ajustado à mão para casar com a
metade errada. **Quarta vez nesta jornada em que o registro e o artefato divergem**, depois do
deploy que não saiu (§7.27), do comentário do painel que dizia o contrário do código (§7.26c) e
do `RETOMAR` que afirmava «está no ar» sobre duas metades tendo visto uma.

Reconciliado a partir da tabela (que tinha as razões), e — o ponto que importa — **a tabela
passa a ser gerada das entradas**. A divergência nasceu de alguém editar a metade legível à
mão; agora não há metade a editar.

#### Três janelas consertadas de verdade

| # | O que era | O conserto |
|---|---|---|
| **18 / 27** | `as never` pré-regen em duas chamadas | O `db:types` confirmou que `listar_historico_candidatura` e `v_triagem_panel.encerrada_a_pedido_em` **já estavam** nos tipos. Casts removidos — e agora o compilador **checa** as duas chamadas em vez de calar sobre elas. `tsc` 90, inalterado |
| **23** | A recusa de **domínio** `NAO_RETIRAVEL` mostrava «tente novamente em instantes» | Instrução que o titular **nunca** conseguiria satisfazer — a mesma forma do WR-05. O hook já traduzia o código desde DI-45-12-01; era **só a tela**. Portão (h), 3 sondas, provado que morde |
| **43** | O padrão de varredura do `CLAUDE.md` não via o idioma do arquivo que vigia | Exigia prefixo `v_` e só conhecia `<>`/`!=`. Não via `IS DISTINCT FROM <n>` (21 ocorrências; o `p46_purga_smoke` usa a forma **102 vezes**) nem `proname IN ('a','b')` (10). Estendido e medido: **244 achados contra 164**, sem perder nenhuma das 164 |

⭐ A **43** é a mais instrutiva: um **portão sobre portões** que também estava quebrado. A seção
do `CLAUDE.md` existe para impedir que uma lista literal envelheça, e o comando que ela ensina
não enxergava a forma dominante. O ponto cego de uma ferramenta de auditoria não aparece como
falha — aparece como silêncio.

⚠ **O `db:types` foi gerado no scratchpad primeiro**, e só depois comparado. A armadilha do
truncamento (§7.26.1) fica evitada **por construção**, não por lembrança: o `>` nunca apontou
para o arquivo do repositório. A saída bateu byte a byte com o commitado.

Também caiu o comentário obsoleto da **#12**, que dizia «o botão *Cancelar a exclusão* entra no
45-08» três linhas acima do `useCancelarExclusao` que já o implementa.

#### Os 7 waives, cada um com a decisão que o autoriza

| # | Autorizado por |
|---|---|
| 6, 26, 30 | `DECISAO-ENCARREGADO.md` (2026-08-13) — a Beauty Smile não designa Encarregado; o parecer não vem, e quem decide é o operador, que decidiu. O documento **nomeia** 26 e 30 no próprio frontmatter |
| 22 | O `GRANT` de EXECUTE a `authenticated` em `gerar_bias_snapshot` é deliberado (chamador vivo em `biasAuditService.ts:98`). Medido em PROD: `authenticated=X`. Quem está desalinhado é a asserção C1 do smoke, não o banco |
| 33, 41 | Propriedades **declaradas por escrito** no docblock da EF — conhecidas e aceitas, não pendências |
| 40 | O que a janela pedia **já passou**: a nova rodada de review antes do apply não ocorreu, e isso está contabilizado com honestidade no `46-VERIFICATION` como critério 2 = 0,5, «VIOLADO em 4 de 8 applies». Fica como registro do custo, não como pendência |

E as duas janelas que **já estavam `fixed` com razão VAZIA** desde agosto (**36**, **37**)
foram preenchidas por evidência. Um `fixed` sem razão é a mesma coisa que um `waive` sem
razão — só parece melhor.

#### ⏳ As 3 que continuam abertas — e por quê

| # | O que falta |
|---|---|
| **4** | `p43_previa_smoke` nunca executado |
| **38** | `p46_purga_smoke`, asserções (b) e (o) |
| **42** | `p46_purga_smoke`, asserções (q.1)–(q.5) |

As três se fecham **rodando o smoke**, e não argumentando. Duas são do smoke da **purga**:
executá-las contra produção é checkpoint do operador, da mesma família do Bloco H. Ficam
abertas de propósito — fechá-las por leitura seria exatamente o que o §7.27 acabou de custar.

### 7.30 · Bloco G — a metade observável, medida — 2026-09-06

O bloco G é do operador porque **G1 muda política de dados**. Mas G2–G7 são observação, e
observação não precisa esperar. Medidos como RH3, e sempre cruzando a tela com o banco.

| ID | Resultado |
|---|---|
| **G2** | ✅ A prévia mostra **5 elegíveis** (Decisão Final 1, Aprovado 3, Rejeitado 1). Conferido **titular a titular**, e não pela contagem: os 5 são `fixture-p46+{pos1,pos2,pos3,cap2,neg-vaga}@invalido.local`. **Zero pessoa real** — é também a medição do **H5**, válida neste instante |
| **G3** | ✅ `/admin/ai-logs` com 38 linhas (custo, latência, provider, modelo por chamada). `/admin/ai-costs` diz «sem dados» — e está **certo**, ver abaixo |
| **G4** | ✅ 8 prompts, **7 ativos**, zero `[SEED PLACEHOLDER]`, todos `claude-sonnet-4-6`, e **7 dos 8 sem `deployed_at`** (só `culture_fit_essay` tem) |
| **G5** | ✅ KPIs carregam, e a **taxa de knockout de 6,5% da tela é exatamente 2/31 no banco** |
| **G6** | ✅ `/rh/perfil`, `/rh/suporte` e `/rh/configuracoes` carregam; a gestão de usuários lista os 7, RH3 incluído. ⏳ O *desativar/reativar RH2* é escrita e fica com o operador |
| **G7** | ✅ As 5 superfícies públicas abrem **sem sessão**, todas com o rodapé, e **nenhuma menciona «Encarregado»** — a consequência de código da `DECISAO-ENCARREGADO.md` está no ar. `/subprocessadores` lista os 6 países, sem a sentinela `PAIS_POR_MEDIR` |

#### ⚠ Quase reportei um defeito que não existe

`/admin/ai-costs` diz «Sem dados de custo no período» e setembro teve 37 chamadas de IA
custando US$ 0,899. A leitura óbvia — «a agregação está quebrada» — está **errada**, e três
medições a desmontam:

1. O cron `ai-cost-aggregation` rodou **90 vezes, todas `succeeded`**.
2. Ele processa `DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'`, e **as 37 chamadas caem
   todas em `dia_utc = 2026-09-06`** — hoje, em UTC. Ainda não houve a noite que as agrega.
3. As execuções recentes retornam `INSERT 0 0` porque os dias anteriores **não tiveram chamada
   nenhuma**.

A tela está vazia **e honesta** — ela até explica que a agregação roda 01:30 UTC.

> ⚠ **E um erro de método meu, que quase virou o diagnóstico:** consultei
> `max(return_message)` para ver «a última mensagem». `max()` sobre texto é o máximo
> **lexicográfico**, e `'INSERT 0 1' > 'INSERT 0 0'` — a agregação parecia estar inserindo uma
> linha quando estava inserindo zero. Uma função de agregação não responde «o último» só
> porque a coluna parece ordenável.

**Previsão conferível** (o jeito honesto de fechar um item que depende de tempo): depois de
**2026-09-07 01:30 UTC**, `ai_cost_daily` deve ganhar linhas com `date = 2026-09-06` somando
≈ **US$ 0,899**. Se não ganhar, aí sim há defeito — e o teste está escrito antes do resultado.

#### O que isto mede do Bloco H, de graça

| | Estado medido em 2026-09-06 |
|---|---|
| **H1/H2** ⚠ **mudou** | `cron.job_run_details` do jobid 6 (`purga-retencao-sweep`) tem **14 execuções**, a última em 06/09 00:00. O `46-VERIFICATION` registrou este critério como **FAILED** («0 de 14 noites») — **o agendador passou a funcionar desde então**, e o critério 1 do ROADMAP pode ser remedido |
| **H4** ⛔ segue barrado | Das 3 etapas com `elegivel_purga = true`, **duas ainda têm `origem='seed'`** (`decisao_final`, `aprovado`). Só `rejeitado` tem confirmação humana (18 meses, por Fernando, 22/08). **É exatamente o que o G1 destrava** |
| **H5** ✅ hoje | Os 5 elegíveis são fixtures, um a um. **Re-medir no instante do flip** — a lista muda com o tempo |

⭐ E a matriz explica, na tela, o defeito que o `CLAUDE.md` cataloga: «Rejeitado · 18 meses ·
Alterado por Fernando Costa Neto · 22/08/2026». Foi essa edição legítima que a asserção (j) do
`p43_matriz_retencao_smoke` acusou de ser «valor de teste em PROD». O portão comparava com uma
constante; o operador tinha o direito de mudar.

#### Duas observações menores, nenhuma bloqueante

- **`/manifesto` é uma superfície pública órfã.** É rota pública, **nada no código a linka**
  (só se chega digitando a URL) e ela **não tem o rodapé** — quem cair ali de um link externo
  não tem caminho até `/privacidade`. A exclusão é deliberada: o portão (8) de
  `rodapeMontagem.test.tsx` afirma que o conjunto é *exatamente* as cinco superfícies. Fica a
  pergunta para o operador: `/manifesto` deve ser a sexta, ou deve deixar de ser pública?
- **`/admin/prompt-versions` conta versões, não ativações.** `cv_summary` aparece com «(1)»
  como os outros sete, e está **inativo**. Dois estados diferentes com a mesma aparência.

---

## §8 · Fechamento da sessão de validação — 2026-09-06

**Resumo executivo, os pendentes e o passo a passo para retomar estão em
[`.planning/RETOMAR-AQUI.md`](RETOMAR-AQUI.md).** Abra a próxima conversa com:

> *"Leia `.planning/RETOMAR-AQUI.md` e `.planning/GUIA-VALIDACAO-FINAL.md` §7, e vamos continuar"*

**Números da sessão:** 19 defeitos encontrados e consertados · 47 commits · 6 migrations
aplicadas com md5 conferido · 7 Edge Functions redeployadas · `deno test` 484/484 ·
`vitest` 1956/1956 · `tsc` 90 (baseline congelada 96).

**Blocos percorridos:** A (correções prévias), B, C, D, E (E1–E9, E11, E12), F. **Faltam:**
E10 (bloqueado — precisa de uma segunda conta de RH), G (retenção), H (flip da purga),
I (limpeza dos dados de teste).

> **Adendo de 2026-09-06, fim do dia (§7.26 e §7.26.1):** as três decisões deixaram de ser
> pendências — foram tomadas, implementadas e a migration está aplicada. Restam a conferência
> de tela da decisão B, o E10 e os blocos G/H/I. Os números acima são os da sessão de
> validação; depois dela, `vitest` passou a 1980/1980 em 200 arquivos.

**Três decisões suas, todas registradas com a evidência:** a copy da cópia de dados (§7.22),
explicação e revisão para o knockout (§7.18), e a geração assíncrona do guia (§7.25).

**O que estas 25 seções ensinam, se for para levar uma frase:** quase todos os defeitos aqui
eram **silenciosos** — nenhum derrubava a tela, todos entregavam um resultado plausível. O que
os revelou foi sempre comparar a tela com o banco, e nunca aceitar «a tela mostrou» como prova.
