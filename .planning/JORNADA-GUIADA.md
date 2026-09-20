# Jornada guiada — validação ponta a ponta com um candidato só

> **Como usar:** percorra um passo por vez. Em cada um há **o que fazer**, **o que tem de
> acontecer** e um espaço **📝 O que aconteceu** para você preencher. Quando terminar um
> passo, me avise — eu confiro no banco antes de liberar o próximo.

**Data de início:** 2026-09-19 · **Operador:** Fernando

### ✍️ Como marcar os seus comentários

Escreva em **qualquer lugar** do arquivo usando estes marcadores. Todos começam com `>>`,
então uma busca só acha tudo o que você escreveu:

| Marcador | Significa                         |
| -------- | --------------------------------- |
| `>>`     | observação sua                    |
| `>>?`    | **dúvida** — quer que eu responda |
| `>>!`    | **defeito encontrado**            |

```
>> o botão ficou escondido quando o teclado abriu
>>? isso é esperado ou é defeito?
>>! o e-mail de confirmação não chegou em 10 min
```

Não precisa ficar preso aos blocos `📝` — escreva ao lado do item, no meio da tabela, onde
fizer sentido. Eu leio o arquivo inteiro.

---

## 🤖 Para a sessão que assumir daqui

> Este bloco existe para uma conversa NOVA não precisar redescobrir nada. Os valores
> abaixo foram **medidos no banco em 2026-09-19**, não presumidos.

### Estado neste instante

| | |
|---|---|
| Etapas concluídas | **1 e 2** (inscrição · triagem/IA) — atualizado 2026-09-19 22:55 |
| `candidatos` em PROD | **42** — Marina: `747fa40c-49d3-4e10-b234-1e321241f86b` |
| `candidaturas` em PROD | **32** — a da Marina: `bf26ee3c-0ae3-4e92-a99b-6e05efc2a662` |
| Estado da Marina | `etapa_atual=triagem` · `status=aguardando_resposta` · `opcao_knockout_id=null` |
| Análise da IA | pronta em 46,3 s · `analise_candidato_vaga.id=ba372107-…` · score 96 · `status=sucesso` |
| Currículo de teste | `~/Desktop/curriculo-marina-alves-tavares.pdf` · 88.668 bytes · marcadores plantados (ver Etapa 2) |
| Árvore git | limpa, `origin/main` em dia |

⚠ A trava de contagem do `p47_teardown_dados_de_teste.sql` (41) **já recusa** — guard
funcionando, como previa a regra 2 abaixo.

### Regras de operação desta jornada

1. **Confira no banco, nunca só na tela.** Foi assim que 19 defeitos apareceram — todos
   renderizavam bem e entregavam resultado plausível.
2. **Não rode** `p47_teardown_dados_de_teste.sql` — ele apaga as contas da jornada. E a
   trava de contagem dele (41) vai **recusar** assim que Marina existir; isso é o guard
   funcionando, não defeito. Atualizar as constantes só no fim de tudo.
3. **Não rode** o bloco de `salvar_config_purga(... p_confirmo_live := true)` do
   `46-07-RUNBOOK-FLIP`: o portão está verde desde 06/09, então aquele SQL **executa o
   flip** em vez de provar que está fechado.
4. **Os resets das etapas 8 e 9 são escrita destrutiva em PROD.** Medir antes e depois,
   escopar ao `candidatura_id` da Marina, e confirmar com o operador.
5. **⚠ Feche este arquivo no editor antes de pedir para eu escrever nele.** Em
   2026-09-19 22:50 o bloco que você está lendo foi **apagado inteiro** do disco
   logo depois de uma escrita minha, junto com um realinhamento de todas as tabelas
   no estilo Prettier — assinatura de format-on-save. Foi restaurado de
   `git show HEAD`. É a segunda vez que o format-on-save corrompe este arquivo
   (a primeira virou o commit `fc8c15e2`). **Depois de cada escrita, confira
   `git diff --stat` e desconfie de deleções que você não pediu.**

### IDs fixados (medidos, não presumidos)

| O quê | Valor |
|---|---|
| Vaga **Consultor** | `fdbe1a4a-0c15-4659-a589-e9d8f2f9ff98` · slug `consultor-relacionamento-pre-vendas` |
| Vaga **Social Media** | `e897f709-d4e7-4f6c-a25b-a433d2eda525` · slug `social-media-producao-captacao-conteudo` |
| Pergunta de disponibilidade (Consultor) | `04b2b9da-a3c7-4704-b0cc-4f73d84ba1b0` |
| **Opção que elimina** (Consultor) | `1d8f94e0-0301-490b-b0df-b3955a22f80c` |
| **Opção que elimina** (Social Media) | `0f59f62b-d86b-416d-89cd-be7865e2965c` |

O texto da opção de knockout é o mesmo nas duas: **«Tenho disponibilidade apenas para
trabalho remoto»**, e é a **única** com `tag='knockout'` em cada vaga.

### Consultas de conferência

```sql
-- Depois de cada etapa: onde a Marina está
select cd.id, cd.etapa_atual::text, cd.status::text, cd.opcao_knockout_id is not null as knockout,
       exists(select 1 from decisao_final d where d.candidatura_id=cd.id) as tem_decisao
  from candidaturas cd join candidatos c on c.id=cd.candidato_id
 where c.email ilike '%claude4%';

-- E-mails que o sistema disparou para ela
select evento, template, status::text, criado_em
  from notificacoes_enviadas n join candidatos c on c.id=n.candidato_id
 where c.email ilike '%claude4%' order by criado_em desc;
```

### A forma do reset (etapas 8 e 9)

O grafo de FKs já foi medido — as que **bloqueiam** (`NO ACTION`) e precisam de `DELETE`
explícito, nesta ordem: `retencao_hold` → `decisao_final_historico` → `decisao_final` →
`historico_candidatura`. Depois, `UPDATE candidaturas SET etapa_atual=…, status=…`.

⚠ `decisao_final_historico` vem **antes** de `decisao_final`, e o `trg_decisao_final_snapshot`
acrescenta linha a **cada** UPDATE — inclusive o carimbo de visita à página de explicação.

### Onde está o resto

| Documento | O que tem |
|---|---|
| `RETOMAR-AQUI.md` | o estado geral e a fila do que falta no M8 |
| `CHECKLIST-VALIDACAO-MANUAL.md` | os 12 itens soltos que não entram nesta jornada |
| `GUIA-VALIDACAO-FINAL.md` §7 | o diário das 32 medições anteriores |

---

## A identidade de teste

Use **esta** em tudo. É um alias do seu Gmail, então os e-mails chegam na sua caixa.

| Campo              | Valor                                                |
| ------------------ | ---------------------------------------------------- |
| **E-mail**         | `fernandinho.costa.neto+claude4@gmail.com`           |
| **Senha**          | `Teste123!`                                          |
| Nome completo      | `Marina Alves Tavares`                               |
| Data de nascimento | `14/03/1996`                                         |
| Celular            | `(11) 98844-2317`                                    |
| CEP                | `01310-100` (Av. Paulista)                           |
| Número             | `1578`                                               |
| Complemento        | `Conj 42`                                            |
| Como conheceu      | **Outros** → «Indicação de uma amiga que é paciente» |

**Vaga escolhida:** `Consultor(a) de Relacionamento e Pré-vendas` — porque é a única com
**todas** as 5 perguntas e a opção de knockout, então serve para o caminho feliz **e** para
o caminho da eliminação automática depois.

> > Na pagina fda vaga, eparece um sub titulo, de tambem divulgada como, isso ok, agora tirar funcao interna e trilha, nao faz sentido, em diferenciais, nao seria diferenciais teriamos que pensar em outro nome

### Duas janelas

| Janela        | URL                                   | Conta                         |
| ------------- | ------------------------------------- | ----------------------------- |
| **Candidato** | `rh.beautysmile.com.br/vagas`         | Marina (acima)                |
| **RH**        | `rh.beautysmile.com.br/auth/login-rh` | `fernando@beautysmile.com.br` |

⚠ Use **janela anônima** para a do candidato. Sessões dos dois papéis no mesmo perfil já
causaram recusa de login legítimo (§7.19).

---

## Etapa 1 · Inscrição

### 🧑 Candidato

1. `rh.beautysmile.com.br/vagas` → abrir **Consultor(a) de Relacionamento e Pré-vendas**
2. «Candidatar-se» → criar conta com os dados acima
3. **Etapa 4 (autorizações):** marque a **obrigatória** e a de **retenção de currículo**.
   Deixe marketing **desmarcada**.
4. Formulário da vaga — **responda exatamente assim** (é o que passa no knockout):

| Pergunta                          | Resposta                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Disponibilidade                   | ✅ **«Tenho disponibilidade integral e presencial, de segunda a sexta, no horário comercial»** |
| Tempo em atendimento/vendas       | «Entre 2 e 5 anos…»                                                                            |
| Atendeu decisão de valor alto?    | «Sim, atendi cliente decidindo valor alto em clínica odontológica, estética ou de saúde»       |
| Atividades de rotina _(múltipla)_ | marque as **4 primeiras**                                                                      |
| O que te atrai                    | «Ser o primeiro contato de quem chega buscando resolver algo que carrega há anos»              |

⛔ **NÃO marque «Tenho disponibilidade apenas para trabalho remoto»** — essa é a opção de
knockout, e ela encerra a candidatura na hora. Vamos usá-la de propósito na Etapa 9.

1. Anexe um PDF qualquer como currículo.

### 👀 O que observar

- [ ] **Defeito 1 (B8):** antes de enviar, **saia e volte** no formulário. O progresso **se perde** — é defeito conhecido, confirme que ainda acontece.
- [ ] As 3 caixas de autorização nascem **desmarcadas**.
- [ ] O e-mail de confirmação chega. **Anote o tempo.**

📝 **O que aconteceu:** — executado 2026-09-19, **conferido no banco**

**Resultado: PASSOU, com 1 defeito confirmado e 2 observações.**

IDs que nasceram aqui e valem para o resto da jornada:

| O quê | Valor |
|---|---|
| `candidatos.id` | `747fa40c-49d3-4e10-b234-1e321241f86b` |
| `auth.user_id` | `778bf8b4-2ace-4e17-900b-2e0655d9834c` |
| `candidaturas.id` | `bf26ee3c-0ae3-4e92-a99b-6e05efc2a662` |

**Cadastro.** `candidatos` 41 → 42. Nome, nascimento, celular, número e complemento
exatos. CEP `01310100` resolveu sozinho para Avenida Paulista / Bela Vista / São Paulo / SP.

**As três autorizações, lidas na tabela `autorizacoes` (não na tela):**

| Coluna | Valor | |
|---|---|---|
| `autorizacao_uso_dados` | `true` | a obrigatória |
| `autorizacao_retencao_curriculo` | `true` | marcada |
| `autorizacao_marketing_vagas` | **`false`** | deixada desmarcada ✅ |

Prova do aceite gravada junto: `policy_version=v1.0-2026-04`,
`consent_text_version=v2-2026-08`, `consent_text_hash=dd8f573b…`, `ip_aceite`,
`consent_registrado_em`.

>> Duas colunas parecem defeito e **não são** — fui ao código antes de acusar:
>> `autorizacao_comunicacao=true` sem ninguém marcar nada é `CANAL_TRANSACIONAL_ATIVO`
>> (`autorizacoes-registro.ts:148`), fato do sistema e não consentimento — a Phase 43
>> separou marketing exatamente para essa coluna não ser lida como consentimento.
>> E `user_agent_aceite` nulo com IP preenchido é omissão **deliberada e documentada**
>> (`autorizacoes-registro.ts:39-41`): «uma fase sobre consentimento honesto não é
>> licença para começar a coletar um dado a mais de passagem».

**>>! Defeito 1 (B8) — CONFIRMADO, e pior do que estava escrito.** O progresso do
formulário se perde de **duas** formas: sair-e-voltar **e** recarregar a página.
Não existe rascunho em lugar nenhum — `is_rascunho=false`, nenhuma linha de rascunho
no banco. O formulário só existe na memória do navegador; não há autosave.

**A ordem das perguntas na tela NÃO é a coluna `ordem`** — e essa correção é minha, não
do sistema. O formulário **agrupa por `bloco`** (`FormularioCandidaturaPage.tsx:99-114`,
regra D-13), com um título por seção:

| Seção na tela | Pergunta | `ordem` no banco | Posição na tela |
|---|---|---|---|
| Disponibilidade | disponibilidade | 1 | 1 |
| Sobre sua experiência | tempo em atendimento | 2 | 2 |
| Sobre sua experiência | valor alto | **4** | **3** |
| Ferramentas e rotina | atividades de rotina | **3** | **4** |
| Motivação | o que te atrai | 5 | 5 |

Não é defeito — é o agrupamento funcionando. Fica registrado porque enganou a mim.

**As 5 respostas** chegaram com os textos exatos, e as **4 opções** da múltipla escolha
vieram inteiras. **`opcao_knockout_id = null`** ✅ — passou no knockout, como planejado.
Estado final: `etapa_atual=triagem`, `status=aguardando_resposta`.

**Currículo.** Bucket `curriculos`, `88.668 bytes` — **idêntico byte a byte** ao PDF
gerado para o teste. `mimetype=application/pdf`, nome original preservado.

**E-mail — a cadeia inteira medida, não só «chegou»:**

| Momento | Hora |
|---|---|
| candidatura gravada | `22:37:32.866` |
| notificação criada | `22:37:33.745` |
| enviada ao provedor | `22:37:34.068` |
| **entregue** (webhook do provedor) | `22:37:38.561` |

**5,7 s ponta a ponta.** `status='entregue'` (o provedor confirmou, não é só «mandamos»),
`modo='producao'`, `dedupe_key` presente, **0 tentativas de retry**.

>> Metadado morto: `tempo_preenchimento_segundos` está **null em 32 de 32** candidaturas
>> de toda a história do banco, e `origem_candidatura` em 31 de 32. As duas colunas são
>> **lidas** pelo `candidaturasService` (linhas 291 e 296) e **nunca escritas por nenhum
>> código**. Não quebra nada hoje; qualquer relatório futuro de «tempo de preenchimento»
>> ou «canal de origem» vai sair vazio e ninguém vai saber por quê.

>>? O texto livre «Indicacao de uma amiga que e paciente» chegou sem acento ao banco.
>>? **Resolvido: foi digitado sem acento.** Não há defeito — confirmei que não existe
>>? normalização nesse caminho, e «São Paulo» na linha ao lado manteve o acento.

---

## Etapa 2 · Triagem e a análise da IA

### 👔 RH

1. `/rh/candidatos` → achar Marina
2. Abrir o perfil dela → ver a **análise da IA** (leva ~2 min depois da inscrição)

### 👀 O que observar

- [ ] A análise cita as respostas dela, não genéricos
- [ ] **Nenhum** score decide sozinho — o sistema nunca rejeita por nota (RNF-07a)

📝 **O que aconteceu:** — executado 2026-09-19, **conferido no banco**

**Resultado: a IA passou com folga. O que falhou foi a TELA DO RH.**

**A análise ficou pronta em 46,3 s** (`created_at 22:37:33.807` →
`updated_at 22:38:20.127`), `status='sucesso'`, `erro=null`. O roteiro dizia ~2 min —
é mais rápido do que o documentado.

>> **Ela NÃO está onde o roteiro presumia.** `candidaturas.analise_ia_formulario` e
>> `candidaturas.score_geral` continuam **null**. A análise vive em
>> `analise_candidato_vaga` (`id=ba372107-…`). Quem for conferir análise de IA no banco
>> tem de olhar essa tabela, não as colunas de `candidaturas`.

**A IA leu o PDF — provado por marcadores plantados.** O currículo foi gerado de
propósito com fatos que **não existem nas respostas do formulário**. A análise citou
**cinco deles, textualmente**: cadência de 7 toques em 21 dias (D+1…D+21) · R$ 8.000 a
R$ 45.000 · GoHighLevel com motivo de perda · no-show de 31% para 12% em 11 meses ·
WhatsApp escrito à mão. E o `resumo_respostas` cita ainda **Studio Lumen**,
**Clínica Vértice**, **Belém Log** e **Senac**. Zero confabulação: **nenhum** empregador,
número ou curso fora do que estava no PDF.

**E cruzou as duas fontes**, que era o teste mais difícil. O `resumo_respostas` traz um
raciocínio (a)–(d) que confronta CV **contra** formulário item a item — ex.: «Etapa 1
declara 'Entre 2 e 5 anos'. CV confirma: Vértice ~22 meses + Studio Lumen ~18 meses.
Total ~40 meses. Atendido com folga.» Confirmei no código: o prompt recebe o CV
**inteiro** mais as respostas rotuladas (`analise-candidato-individual/index.ts:393`).

**RNF-07a: respeitado.** Score 96 e a tela rotula «Sugestão da IA — decisão é sempre
humana». Nada mudou de estado sozinho: `etapa_atual` segue `triagem`,
`status` segue `aguardando_resposta`. Nenhuma rejeição automática.

>> `gaps` e `flags` vieram **vazios** (`[]`). Plausível para um perfil desenhado para
>> ser aderente — mas quer dizer que **esses dois caminhos continuam não testados**.
>> Precisam de um candidato fraco para exercitar.

### >>! Defeito 2 (NOVO) — o RH não consegue ler o que a candidata respondeu

Encontrado na tela, **confirmado no código**. São duas ausências, e a segunda é pior:

| O quê | Situação |
|---|---|
| Respostas da triagem (`respostas_formulario`) | **Nenhuma tela do RH lê essa tabela.** A única referência a ela em `src/` é o recibo de exclusão LGPD |
| Perfil/cadastro da candidata | `HubCandidatoRH` (459 linhas) **não renderiza nenhum dado pessoal** — nem nome, nem e-mail, nem cidade |

Os dados **estão no banco e estão corretos** — as 5 respostas, com os textos exatos.
A **candidata** consegue exportar as próprias respostas pelo canal LGPD. A **IA** lê
todas. Só quem precisa **decidir** não vê nenhuma.

É o inverso do modo de falha de sempre: não é tela vazia por dado ausente, é **dado
presente sem caminho de leitura**.

>>? Decisão de produto a tomar: `resumo_respostas` (o raciocínio (a)–(d) da IA, a parte
>>? mais rica da análise) é **excluído de propósito** da tela pelo
>>? `ANALISE_HUB_ALLOWLIST` — que entrega só `score_match, pontos_fortes, gaps, flags,
>>? status`. O comentário justifica como «raw AI internals the surface does not need»
>>? (`analiseCandidatoService.ts:37-43`). Faz sentido como guarda anti-vazamento de PII,
>>? mas o efeito é que o RH vê 5 bullets e uma nota **sem ver o raciocínio por trás**.
>>? Vale decidir se isso é o desejado ou se o RH deveria ver o cruzamento.

>> Truncamento em cascata, a vigiar na Etapa 11. `resumo_cv` é gravado com
>> `cvText.slice(0, 2000)` — exatamente 2000 caracteres, cortando no meio de uma frase
>> («…parcelamento de planos em aberto,»). A análise individual não sofre com isso
>> (o prompt recebe o CV inteiro), **mas o comparativo sofre**:
>> `comparativo-candidatos/index.ts:237` corta essa cópia já truncada em **mais 1000**.
>> Ou seja: o comparativo entre candidatos enxerga só o **primeiro terço** do currículo.
>> Conferir na Etapa 11.

**O que abrir o currículo fez:** funcionou. ✅

---

## Etapa 3 · Avaliações assíncronas

### 👔 RH

Avançar Marina para **Avaliação Assíncrona**.

### 🧑 Candidato

Fazer o que aparecer no painel (SJT / redação cultural / Big Five).

### 👀 O que observar

- [ ] **Defeito 2:** a devolutiva do Big Five fala em «avaliação comportamental» e **nunca** «teste psicológico»
- [ ] O e-mail de liberação chega

📝 **O que aconteceu:** — 2026-09-19, **EM ANDAMENTO** (a candidata ainda está respondendo)

**O avanço do RH: gravado certo.**

| | |
|---|---|
| `historico_candidatura` | `triagem → avaliacao_assincrona`, `ator=4fceff36-…` (o usuário RH), `auto_rejeitado=false` |
| Novo estado | `etapa_atual=avaliacao_assincrona` · `status=aguardando_resposta` |
| Hora | `23:01:04.700` |

**E-mail de liberação — cadeia completa:** criado `23:01:05.230` → enviado `.386` →
**entregue `23:01:09.22`**. **4,5 s**, `status='entregue'` (confirmado pelo provedor),
template `avaliacao_liberada`.

>> **«Sem dados nesta etapa» nos cards de Avaliação Assíncrona / Cognitiva / Redação
>> está CORRETO** — a candidata ainda não respondeu nada. Não é tela quebrada.

>> **Correção de uma previsão minha.** Eu disse que, com `aplica_cognitivo=false`, o
>> cognitivo «não devia aparecer» e que aparecer seria defeito. **Errado.** O flag
>> governa o lado do CANDIDATO — a prova só monta se for `true`
>> (`ProvaCognitivaScreen.tsx:121,210`). O card no RH é o controle de **liberação
>> nominal, candidato a candidato**, e aparecer ali é o comportamento certo.

>>? **A testar mais tarde, sem desviar do caminho feliz agora:** o que acontece se o RH
>>? clicar «Liberar avaliação» no cognitivo com `aplica_cognitivo=false` na vaga? Ou a
>>? liberação nominal vence o opt-in da vaga, ou o candidato recebe uma liberação que
>>? não abre. As duas saídas são interessantes e nenhuma foi exercitada.

>> `criterio_texto` ficou **null** no avanço feito pelo RH, enquanto a transição do
>> sistema (`inscricao → triagem`) gravou texto. O histórico do RH nasce sem
>> justificativa — conferir se a tela chega a oferecer o campo.

### O painel da candidata — 4 cards, e estão certos

Apareceram **quatro**, não três, e é o comportamento correto: `work_sample_sjt` se
desdobra em **dois** cards no contêiner
(`AvaliacaoContainer.tsx:72-79` · `templateTesteToContainerCards`).

| Card na tela | id interno | vem de |
|---|---|---|
| Avaliação de situações | `sjt_mc` | `work_sample_sjt` |
| Caso prático | `sjt_caso_aberto` | `work_sample_sjt` |
| Redação cultural | `redacao` | `redacao_cultural` |
| Avaliação comportamental | `big_five` | `big_five` |

✅ **O cognitivo NÃO apareceu** para a candidata — correto, `aplica_cognitivo=false`
na vaga, e `deriveCards` só emite esse card quando a coluna é `true`
(`AvaliacaoContainer.tsx:384`). Confirma a leitura corrigida da seção acima.

✅ **Linguagem de produto respeitada no card:** «Avaliação comportamental».
Nada de «teste psicológico». Falta conferir a **devolutiva**, que é onde o roteiro
manda olhar.

### >>! Defeito 3 (NOVO) — «Tempo estimado: ~10 min» é um placeholder, não uma estimativa

Os **quatro** cards mostram o mesmo `~10 min`. Não é coincidência: é uma **constante
de fallback** no código, usada quando o valor real é nulo.

```
card.tempoEstimadoMin != null ? `~${card.tempoEstimadoMin} min` : '~10 min'
                                                    AvaliacaoContainer.tsx:240
```

E o valor real **é sempre nulo**, porque `deriveCards` lê o tempo de
`vagas.testes_aplicaveis` (o JSONB), onde **nenhuma entrada tem `tempo_est_min`**.

**O agravante: o dado real existe, com valores diferenciados, e ninguém lê.** A tabela
`perguntas` tem `tempo_est_min` preenchido por cargo e formato:

| cargo | formato | `tempo_est_min` |
|---|---|---|
| **sdr-social-seller** (o desta vaga) | mc | **7** |
| recepcionista | mc | 12 |
| dentista | caso_aberto | 18 |
| dentista | mc | 30 |

Para esta vaga o certo seria **7 min**; a tela diz **10**. Para uma vaga de dentista
diria 10 onde o real é **30** — erro de **3x**, e para menos, que é o lado que faz o
candidato abandonar no meio.

**E o próprio app se contradiz:** o card diz `~10 min` para a redação, e a tela da
redação diz **«Tempo estimado: 15-25 min»** (`RedacaoEditorScreen.tsx:342`). O
candidato programa 10 minutos e encontra 25.

### >>? Previsão a testar em um clique — «Caso prático» pode estar vazio

O serviço monta a bateria SJT filtrando `perguntas` por `cargo` (`avaliacaoService.ts:199`).
Para `sdr-social-seller` existe **uma única** pergunta ativa, `formato='mc'` —
**não há nenhuma `caso_aberto`** (só `dentista` tem). Mas o card «Caso prático» aparece
como **«Pendente»**, com botão **«Começar avaliação»**, porque `deriveCardState` deriva o
estado do **status da candidatura**, não de haver conteúdo.

**Previsão:** clicar em «Caso prático» leva a uma etapa sem questão nenhuma. Se isso se
confirmar, o defeito não é a tela vazia — é o **hub oferecer ação para algo sem conteúdo**,
sem saber distinguir «pendente» de «não configurado».

---

## Etapa 4 · Entrevista online — agendar e reagendar

### 👔 RH

Agendar entrevista online para Marina.

### 👀 O que observar

- [ ] O convite chega com `.ics` — abra no seu calendário
- [ ] **Reagende** para outro dia: a candidata é avisada, e o painel dela mostra o horário **novo** (não «sem horário definido»)

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 5 · Guia de entrevista (IA) — e a espera

### 👔 RH

No perfil de Marina → **«Gerar guia»**.

### 👀 O que observar

- [ ] O botão **trava** e a tela avisa que leva **1–2 minutos**
- [ ] **Julgamento seu:** a espera é tolerável?
- [ ] ⚠ **Não clique de novo.** Cliques repetidos esgotaram o limite de concorrência e fizeram _todas_ as funções de IA responderem «Failed to fetch» (§4 do RETOMAR)

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 6 · Entrevista presencial e análise da transcrição

### 👔 RH

Agendar a presencial → marcar comparecimento → colar uma transcrição qualquer →
**«Analisar transcrição»**.

### 👀 O que observar

- [ ] A análise cita trechos **daquela** transcrição
- [ ] Cole uma transcrição **diferente** e gere de novo: a análise **muda** _(foi defeito grave — o cache servia a análise anterior — e está consertado)_

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 7 · Decisão final — **APROVAR** (contratar)

### 👔 RH

`/rh/candidato/:id/decisao` → **Aprovar** com justificativa ≥50 caracteres.

### 👀 O que observar

- [ ] O consolidado usa **os 3 pesos** (SJT + redação + entrevista), não um terço
- [ ] E-mail de aprovação chega para Marina
- [ ] No painel dela: cartão **«Entenda a decisão sobre sua candidatura»**

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 8 · RESET → **REJEITAR** na decisão final

> **Me avise aqui.** Eu apago a decisão no banco e a candidatura volta para a etapa
> anterior — sem criar conta nova.

### 👔 RH

Refazer a decisão, agora **Rejeitando**.

### 👀 O que observar (aqui moram 2 defeitos)

- [ ] Marina recebe e-mail, vê a explicação e **pode pedir revisão** (Art. 20)
- [ ] **Defeito 3:** **recarregue a página de explicação 3×**. Cada visita cria uma linha no histórico do Art. 20. Eu conto no banco depois e te mostro
- [ ] Peça a revisão como Marina → responda como RH. ⚠ **Quem decidiu não pode responder** — se você decidiu com a sua conta, precisa responder com **RH2** ou **RH3**

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 9 · RESET → **rejeitar na triagem** (rejeição humana, cedo)

> **Me avise.** Eu volto a candidatura para `triagem`.

### 👔 RH

Rejeitar direto na triagem, com justificativa ≥50 caracteres.

### 👀 O que observar — **o portão que mais importa**

- [ ] **NÃO** aparece cartão de explicação no painel de Marina. É diferente da Etapa 8 de propósito: aquela foi decisão avaliada; esta é triagem
- [ ] ⚠ O texto que você escrever **entra na cópia de dados** que ela pode baixar — a tela avisa isso ao lado do campo. Confira que o aviso está lá

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 10 · Knockout automático

### 🧑 Candidato

Marina se candidata à **Social Media** e, na disponibilidade, marca
**«Tenho disponibilidade apenas para trabalho remoto»**.

### 👀 O que observar

- [ ] Encerra **na hora**, sem avaliação humana
- [ ] E-mail chega
- [ ] A explicação diz **«automaticamente, sem avaliação de uma pessoa»** e **não** oferece revisão — no lugar, `lgpd@beautysmile.com.br`
- [ ] ⚠ **O critério nunca é revelado** — ela não pode descobrir qual resposta a eliminou

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 11 · Comparativo com os candidatos fictícios

### 👔 RH

`/rh/vagas/:id/comparativo` na Consultor.

### 👀 O que observar

- [ ] Os 6 fictícios aparecem ranqueados
- [ ] **Julgamento seu:** a ordem faz sentido? (a variância da IA é backlog P1 — 89/75/80 no mesmo candidato em rodadas diferentes)\*

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 12 · Direitos do titular (como Marina)

`/candidato/privacidade`

### 👀 O que observar

- [ ] Pedir cópia dos dados → chega
- [ ] Pedir **2ª vez** → botão desabilitado **com o motivo e a hora ao lado**
- [ ] Pedir exclusão → **Defeito 4:** a data sai `dd/mm/aaaa`, e a especificação pede **por extenso**
- [ ] Cancelar → volta ao normal

📝 **O que aconteceu:**

```
(preencha)
```

---

## Etapa 13 · Telas de admin (os 4 defeitos restantes)

- [ ] **Defeito 5:** `/rh/configuracoes` → RH2 e RH3 dizem «**Nunca acessou**» e «Aguardando 1º acesso», e as duas já entraram no sistema
- [ ] **Defeito 6:** `/admin/prompt-versions` → `Resumo de currículo` aparece com «(1)» como os outros, mas está **inativo** — a tela conta versões, não ativações
- [ ] **Defeito 7:** `/admin/ai-costs` → «sem dados». **Está correto** (agrega o dia anterior); anote se a mensagem deixa isso claro
- [ ] **Defeito 8:** deixe a aba do admin parada, espere a sessão expirar, recarregue → cai no login que diz «**Acesse sua conta de candidato**»
- [ ] **Suspeita C2:** `/rh/vagas` → editar uma vaga, mudar **descrição curta** ou modelo de trabalho**, salvar, **recarregar\*_. Persistiu? _(há indício de que não, com toast de sucesso falso)\*

📝 **O que aconteceu:**

```
(preencha)
```

---

## Como eu faço o RESET

Nas etapas 8 e 9 eu apago no banco, **só para esta candidata**:

| Reset                   | O que apago                                                 |
| ----------------------- | ----------------------------------------------------------- |
| Voltar da decisão final | a linha de `decisao_final` + volta `etapa_atual` e `status` |
| Voltar para a triagem   | idem + limpa `etapa_justificativa` e `motivo_rejeicao`      |

Sempre com contagem antes e depois, e **nunca** tocando em outro candidato.

---

## Registro final

### Defeitos — acumulado

| # | Etapa | Defeito | Como foi provado |
|---|---|---|---|
| **1** | 1 | **B8 — o formulário não guarda progresso.** Perde por sair-e-voltar **e** por recarregar. Não existe autosave | `is_rascunho=false` e zero linhas de rascunho no banco |
| **2** | 2 | **O RH não consegue ler o que a candidata respondeu** — nem as respostas da triagem, nem o perfil do cadastro | Nenhuma tela em `src/` lê `respostas_formulario`; `HubCandidatoRH` (459 linhas) não renderiza dado pessoal algum |
| **3** | 3 | **«Tempo estimado: ~10 min» é constante de fallback**, igual nos 4 cards. O real existe em `perguntas.tempo_est_min` (7 min nesta vaga, 30 em outra) e nunca é lido. A tela da redação diz 15-25 min e contradiz o próprio card | `AvaliacaoContainer.tsx:240` + `vagas.testes_aplicaveis` sem o campo + valores reais medidos na tabela `perguntas` |

### Incomoda, mas não é defeito

| Etapa | O quê |
|---|---|
| 1 | `tempo_preenchimento_segundos` (0/32) e `origem_candidatura` (1/32): colunas **lidas** pelo serviço e **nunca escritas**. Metadado morto |
| 1 | A ordem na tela vem de `bloco`, não da coluna `ordem` — as duas divergem e nada avisa quem edita a vaga |
| 2 | A análise da IA **não** fica em `candidaturas.analise_ia_formulario` (null); vive em `analise_candidato_vaga` |
| 2 | `ANALISE_HUB_ALLOWLIST` esconde `resumo_respostas` do RH — o raciocínio (a)–(d) da IA existe e ninguém vê |
| 2 | `resumo_cv` truncado em 2000 chars e o comparativo trunca **de novo** em 1000 → conferir na Etapa 11 |
| — | **Format-on-save apagou o bloco de handoff** em 22:50 (restaurado do git). Ver regra 5 |

### Atrito de interface (não quebra, atrapalha quem usa)

Relatados pelo operador durante a jornada. Não são bugs — são custo de uso.

| # | Onde | O quê |
|---|---|---|
| **U1** | RH · hub do candidato | «Liberar avaliação» (cognitivo) e «Abrir workspace de redação» têm **formato e posição diferentes** entre si. Botões de liberar deveriam ser o mesmo padrão, no mesmo lugar de cada card — hoje a leitura da página exige procurar |
| **U2** | E-mail transacional | **Nenhum link para a página de login do candidato.** O e-mail diz «acesse seu painel» e não leva a lugar nenhum. O candidato tem de achar a URL sozinho |
| **U3** | Candidato · Área do candidato | **Beco sem saída.** A página de perfil (editar nome/e-mail/senha) tem «Sair», mas **não tem como voltar** ao dashboard nem «Ver vagas». Quem entra só sai deslogando |
| **U4** | Candidato · Dashboard | O selo «Aguardando Resposta» fica **apagado demais**, e o CTA «Continuar para Avaliação Assíncrona» **não chama atenção**. Risco real de o candidato não saber se deve agir ou esperar — aconteceu na própria validação |

### Pendências de projeto (fora do escopo da jornada)

| # | O quê |
|---|---|
| **P1** | **Avaliar troca de modelo.** Uma chamada consumiu 8.164 tokens de Sonnet 4.6, sem custo observado. Decidir se atualiza o modelo das funções de IA — pendência aberta em 2026-09-19 |

### Caminhos ainda NÃO exercitados

- `gaps` e `flags` da IA vieram `[]` — precisam de um candidato fraco para serem testados
- o comparativo lendo CV duplamente truncado (Etapa 11)
