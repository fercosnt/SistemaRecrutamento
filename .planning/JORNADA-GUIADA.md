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

### ✅ Previsão CONFIRMADA — «Caso prático» abre vazio

Resultado na tela: **«nenhuma avaliação pendente»** e um botão «Voltar ao painel».
O card não deveria ter sido oferecido. `deriveCardState` decide «Pendente» pelo status
da candidatura e **nunca pergunta se existe pergunta configurada** para o cargo.

### >>! Defeito 4 (NOVO) — bateria SJT com UMA questão só

«Avaliação de situações» tinha **1 de 1**. Bate com o banco: para `sdr-social-seller`
existe **uma única** `pergunta` ativa. O peso da vaga dá **15%** do score comparativo
a um instrumento de **uma questão** — e ainda com «Tempo sugerido: 00:48».
Não é bug de código: é **vaga mal configurada**, e o sistema não avisa ninguém.

>> Observação do operador: «precisamos trabalhar melhor as vagas». O sistema hoje
>> aceita publicar vaga com bateria de 1 questão e com card apontando para bateria
>> inexistente, sem nenhum aviso ao RH.

### >>! Defeito 5 (NOVO · **BLOCKER**) — o Big Five NÃO PODE ser enviado em produção

Ao clicar «Concluir», o navegador bloqueia a chamada:

```
Access to fetch at '.../functions/v1/submit-bigfive-final' from origin
'https://rh.beautysmile.com.br' has been blocked by CORS policy: Response to
preflight request doesn't pass access control check: It does not have HTTP ok status.
```

**Medido, não deduzido** — preflight `OPTIONS` real contra as três EFs:

| Função | `verify_jwt` | preflight |
|---|---|---|
| `submit-bigfive-final` | true | **HTTP 401** ❌ |
| `submit-candidatura` | true | HTTP 200 ✅ |
| `exportar-meus-dados` | true | HTTP 200 ✅ |

Não é `verify_jwt`, não é deploy velho (v10 ACTIVE, de 2026-07-09, posterior ao último
commit do arquivo em 2026-07-07). **É a ordem dentro do `Deno.serve`:**

```js
// submit-bigfive-final/index.ts:297-300  ← o gate vem ANTES do handler
const authHeader = req.headers.get("Authorization");
if (!authHeader) return errorResponse("UNAUTHORIZED", "Sessão inválida.", 401);
...
return await handler(req, { supabaseAdmin, supabaseUser });  // ← OPTIONS só é tratado AQUI (:125)
```

**Um preflight CORS nunca manda `Authorization`** — por especificação. O gate responde
401 antes de a checagem de `OPTIONS` (que existe e está correta, na linha 125) ser
alcançada. O navegador exige status 2xx no preflight, então nem tenta o POST.

**A função irmã que funciona faz o oposto, e o comentário dela diz por quê:**

```js
// submit-candidatura/index.ts:346-348 — sem early return
const authHeader = req.headers.get('Authorization')
const supabaseUser = createClient(URL, ANON, {
  global: { headers: { Authorization: authHeader ?? '' } },
})
// "A missing header yields no user inside the handler → 401 (same response as before)."
```

**Por que os testes não pegaram:** eles chamam `handler(req, deps)` direto, injetando
as dependências. O defeito vive **só no wiring de produção**, que teste nenhum exercita.

**Consequência medida:** `respostas_bigfive` tem **0 linhas para a Marina — e 0 linhas
em todo o banco**. Ninguém nunca concluiu um Big Five em produção por esta via.

>> E o autosave não salva no banco: é **`sessionStorage`**
>> (`useAvaliacaoDraft.ts:5`, deliberado por LGPD — «morre com a aba»). A tela promete
>> «pausar e voltar quando quiser — tudo é salvo automaticamente», o que é verdade
>> **dentro da aba** e mentira fora dela. Fechou a aba, as 116 respostas somem.

**Correção proposta** (uma linha de ordem, espelhando a irmã que funciona):
tratar `OPTIONS` **antes** do gate de `Authorization` no `Deno.serve` — ou trocar o
early-return por `Authorization: authHeader ?? ''` e deixar o `handler` decidir.

✅ O SJT **foi** gravado — mas **não onde eu disse**. Corrijo: a linha única que vi em
`respostas_avaliacao` às 23:30 era o **rascunho do Big Five** (gravado 23:21, antes do
envio das 23:46). O SJT vive em `scores_candidato` (`tipo='sjt'`, `score 4/4`,
`23:19:28`), e as respostas dele ficam dentro de `metadata.respostas`.

>> **E corrijo também o que escrevi sobre o autosave do Big Five.** Eu disse que era
>> só `sessionStorage` e que «fechou a aba, as 116 respostas somem». **Errado, e do lado
>> perigoso** — eu teria feito você refazer 116 afirmações à toa. O `sessionStorage` é
>> um buffer imediato, mas há **flush periódico para o banco**: a linha
>> `respostas_avaliacao teste='big_five'` foi gravada às **23:21**, 25 minutos antes do
>> envio. As respostas estavam a salvo o tempo todo.

### ✅ Defeito 5 CORRIGIDO e verificado em PROD (2026-09-19 23:40)

Correção: removido o early-return de `Authorization` no `Deno.serve`, espelhando
`submit-candidatura:346` (`authHeader ?? ""`, deixa o `handler` decidir). 10 testes Deno
passam. Deploy pelo CLI (v11).

| Asserção | Antes | Depois |
|---|---|---|
| preflight `OPTIONS` | 401 | **200** ✅ |
| `submit-candidatura` (controle) | 200 | 200 ✅ |
| POST **sem** `Authorization` | 401 | **401** ✅ — o portão NÃO enfraqueceu |

E o envio funcionou de verdade: `scores_candidato` ganhou a linha `tipo='big_five'`,
`status='sucesso'`, com as 30 facetas e as 5 dimensões, às `23:46:53`.

>> **Eu conferi a tabela errada e quase reportei falha onde não havia.** `respostas_bigfive`
>> e `scores_bigfive` existem no banco e têm **0 linhas em toda a história** — a EF nunca
>> escreve nelas. O que ela grava é `scores_candidato`. Duas tabelas mortas a mais.

### Redação cultural — texto salvo íntegro, avaliação NÃO saiu

Enviada `2026-09-20 00:17:37`. O texto chegou **perfeito** em
`respostas_avaliacao teste='redacao'`: acentuação, quebras de parágrafo e aspas
preservadas, 257 palavras, com o `pergunta_id`. Tela: «Redações concluídas.»

✅ **Defeito 3 confirmado visualmente:** a tela da redação diz **«Tempo estimado:
15-25 min»** enquanto o card do painel prometia **`~10 min`**. O app se contradiz para
o candidato, como o código já indicava. A tela também exige **mínimo de 200 palavras**
e mostra um cronômetro «Tempo nesta redação».

✅ **A avaliação da IA SAIU, e é boa.** `POST | 200 | avaliar-redacao-cultural` às
`00:21:16`. Eu havia suspeitado de falha silenciosa — **suspeita errada, e pela terceira
vez pelo mesmo motivo: olhei a tabela errada.** A redação vive em
**`redacoes_candidato`**, não em `scores_candidato`.

>> ⚠ **O log da plataforma ATRASA.** Às 00:23 consultei a janela 03:10–03:45 UTC e o
>> `POST` das 03:21 **não estava lá**; apareceu minutos depois. Ausência no log não é
>> prova de que não aconteceu — esperar e remedir antes de concluir.

**O resultado:**

| | |
|---|---|
| `score_ponderado_0_100` | **95,00** · `classificacao_cor = verde` · `strong_fit` |
| D1 Cuidado e Empatia | **5** exemplary |
| D2 Ownership e Protagonismo | **5** exemplary |
| D3 Aprendizado e Melhoria | **5** exemplary |
| D4 Trade-offs e Perspectivas | **4** proficient |
| `status_analise` | **`pendente_humano`** ✅ RNF-07a |
| `bloqueio_avanco` | `false` |

**Leu o texto — provado por citação literal.** Cada dimensão traz `cited_evidence` com
trechos exatos e a localização («Parágrafo 3»). Não é elogio genérico.

**E discriminou.** O texto foi escrito com uma tensão deliberada: a candidata decide
*não* empurrar o fechamento, contra a própria meta. **D4 foi a única nota 4** — e o
raciocínio é justamente sobre isso: «tomou o risco consciente de deixar a paciente ir
sem fechar». A IA não deu 5 em tudo.

**Auditoria de viés embutida:** `formality_did_not_affect_score`,
`regional_markers_treated_as_neutral`, `grammar_errors_did_not_affect_content_score`,
e `detected_writing_style: informal` com `style_neutralized_in_scoring: true`.

>> **Dado para a pendência P1 (custo/modelo):** `model_version = claude-sonnet-4-6`,
>> `prompt_version = 1.0.0`. E **`cost_tokens_input` / `cost_tokens_output` estão NULOS**
>> — as colunas de custo existem e não são preenchidas. Sem elas não há como medir o
>> gasto por avaliação, que é exatamente o que a P1 quer decidir.

>> **Divergência menor, mesma linha:** `word_count = 257` no topo e
>> `preprocessing_check.word_count = 278` dentro da análise. Duas contagens do mesmo
>> texto, na mesma linha, com 21 palavras de diferença. Verificar qual alimenta a regra
>> do mínimo de 200.

### >>! Defeito 7 (NOVO · GRAVE) — rubrica fantasma: o RH lê rótulos que a IA nunca avaliou

O painel do RH mostra, para a redação da Marina:

| Rótulo na tela | Nota |
|---|---|
| Experiência UAU | 5/5 |
| Inovação | 5/5 |
| Atitude de Dono | 5/5 |
| Sede de Crescimento | 4/5 |

**A IA não avaliou nada disso.** O que ela devolveu, em `redacoes_candidato.analise_ia`:

| Chave | `dimension_name` que a IA gerou |
|---|---|
| D1 | «Cuidado e Empatia com o Outro» |
| D2 | «Ownership e Protagonismo Individual» |
| D3 | «Aprendizado e Melhoria Contínua» |
| D4 | «Consideração de Trade-offs e Perspectivas Divergentes» |

O front rotula por posição (`RedacaoReviewPanel.tsx:48-51` e `RedacaoOverrideForm.tsx:46-49`
mapeiam `D1 → 'Experiência UAU'` etc.). **O número é real; o rótulo é falso.** O RH lê
«Experiência UAU 5/5» sobre um raciocínio que falava de cuidado e empatia. E «Sede de
Crescimento 4/5» sobre um raciocínio de *trade-offs comerciais*.

**Causa raiz medida no banco.** O prompt ativo `culture_fit_essay` v1.0.0 diz:

> «atribuir scores 1-5 por **dimensão cultural definida**»

…e **nunca define dimensão nenhuma**. Conferido por busca no template inteiro:

| Termo procurado no prompt ativo | Presente? |
|---|---|
| UAU | **não** |
| Inovação | **não** |
| Atitude de Dono | **não** |
| Sede de Crescimento | **não** |

Mandado pontuar «as dimensões definidas» sem receber definição, o modelo **inventa as
próprias** — e acerta o tom, porque a pergunta é sobre cuidado. Por isso passa
despercebido.

E o contrato de schema afirma o contrário do que acontece
(`_shared/essay-schemas.ts:19-20`):

> «As 4 dimensões D1-D4 mapeiam os 4 valores Beauty Smile (Experiência UAU, Inovação,
> Atitude de Dono, Sede de Crescimento)»

**Nada falha.** A saída valida contra o schema — são 4 dimensões com notas 1-5. Só o
significado está trocado. É saída válida sem evidência de critério.

>> **Isso explica a pergunta do operador** («nessa redação realmente conseguimos avaliar
>> os 4 valores?»). A resposta medida é **não**. Não é limitação do texto dele nem do
>> tamanho da redação: é que ninguém nunca pediu esses 4 valores à IA.

**Conserto:** escrever as 4 dimensões BARS no prompt, com âncoras comportamentais por
nota, e **travar por teste** que os `dimension_name` devolvidos batem com os 4 valores —
senão o defeito volta em silêncio na próxima versão de prompt.

### >>! Defeito 8 (NOVO) — a revisão salva, a tela não mostra

O operador preencheu justificativa, marcou **Aprovado** e salvou. Voltou à página do
candidato: **tudo igual**, como se nada tivesse acontecido. Clicou de novo e caiu na
mesma tela de revisão.

**No banco a gravação foi perfeita:**

| Campo | Valor |
|---|---|
| `status_analise` | **`concluida`** (era `pendente_humano`) |
| `decisao_revisor` | **`aprovado`** |
| `notas_revisor` | o texto dele |
| `revisada_em` / `revisada_por` | `00:42:04` · usuário RH |
| `scores_humanos` | `{D1:5, D2:5, D3:5, D4:4}` |

Não é perda de dado — é **cache não invalidada** na volta. O sintoma («salvei e não
salvou») é indistinguível de perda real para quem opera, e leva a salvar de novo.

### >>! Defeito 9 (NOVO · menor) — a fila de revisão esconde as verdes sem dizer

O painel diz «Mostrando vermelhas e amarelas» e, logo abaixo, «**Nenhuma redação pendente
de revisão**» — enquanto a redação da Marina está aberta ao lado. Ela é **verde**, e verde
está fora do filtro padrão. As duas frases juntas afirmam que não há nada, quando há.

### 🎨 Propostas de produto do operador (não são defeitos — são decisões)

| # | Proposta |
|---|---|
| **PP-1** | **Página do candidato em abas**: principal (análise da IA + currículo + resumo dos demais), e uma aba por etapa — perfil, triagem, perguntas, caso, big five, cognitiva, redação, entrevista, decisão final, histórico. Hoje o RH não vê dado nenhum das avaliações na página (liga ao Defeito 2) |
| **PP-2** | **O workspace de redação deveria ser uma aba** da página do candidato, não uma página separada. Sair da ficha para revisar e ter de voltar e reabrir é o atrito que gerou o Defeito 8 |
| **PP-3** | **O «ajuste por dimensão» deveria ser definido na criação da vaga**, não na revisão. Cada vaga decide o que pesa |
| **PP-4** | **A redação deveria avaliar também**: gramática, capacidade de raciocinar e sustentar uma linha, qualidade da escrita — e **detecção de texto gerado por IA**. Hoje avalia só conteúdo cultural (e nem isso, ver Defeito 7) |
| **PP-5** | **A justificativa obrigatória deveria valer para a fase inteira**, não só para a redação |
| **PP-6** | **«Dúvidas (gestor)» não faz sentido** como está |
| **PP-7** | **A análise da IA deveria ser reprocessada** depois da avaliação assíncrona. Hoje ela congela no que foi gerado na triagem (score 96, só CV + formulário) e ignora SJT, Big Five e redação |

>> **P1 (custo):** o uso subiu para **11.970 tokens** nesta sessão de validação.

### >>! Defeito 6 (NOVO) — a devolutiva do Big Five não é gerada desde 2026-07-07

A tela diz «Sua devolutiva ainda está sendo preparada». Não está: `devolutivas_candidato`
não tem linha para a Marina. Os logs da plataforma mostram os dois eventos no mesmo
milissegundo:

```
02:46:54.725  POST | 401 | .../gerar-devolutiva-bigfive     ← morre aqui
02:46:54.728  POST | 200 | .../submit-bigfive-final          ← e o submit devolve 200 assim mesmo
```

`submit-bigfive-final` invoca a devolutiva **inline**, com `supabaseAdmin.functions.invoke`,
e engole qualquer falha num `try/catch` best-effort (linhas 241-258). O candidato recebe
`{ ok: true }` e uma tela que promete algo que não vem.

Do outro lado, `gerar-devolutiva-bigfive` exige um Bearer igual ao `SUPABASE_SERVICE_ROLE_KEY`
(`guardDevolutivaBearer`, SEC-04, fecha um IDOR). O que o chamador manda **não bate**.

**A datação é conclusiva:**

| Evento | Data |
|---|---|
| Guarda SEC-04 introduzida (`595727da`) | **2026-07-07** |
| **Única** devolutiva existente no banco | **2026-06-30** |
| Devolutivas nos últimos 30 dias | **0** |

Ou seja: **a guarda que fechou o IDOR quebrou o único chamador legítimo**, e o
`try/catch` best-effort escondeu isso por **2 meses e meio**.

E o comentário da própria função descreve esse modo de falha — aplicado a OUTRA chave:

> «a separate `DEVOLUTIVA_INVOKE_SECRET` override was removed — it was a footgun (the
> caller never sent it, so setting the env var would **silently 401 every devolutiva,
> swallowed by submit-bigfive-final's best-effort try/catch**)»

Identificaram o modo de falha, removeram uma das causas e embarcaram a mesma falha
com o `service_role` no lugar.

>>? **O QUÊ está provado; o PORQUÊ não.** Falta medir qual Bearer o
>>? `supabaseAdmin.functions.invoke` realmente envia numa chamada função-a-função.
>>? Sem isso, qualquer conserto é chute. O passo seguinte é instrumentar (log do
>>? PREFIXO do Bearer recebido, nunca o valor) ou trocar a invocação por `fetch`
>>? explícito com `Authorization: Bearer ${SERVICE_KEY}`.

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
| **4** | 3 | **Bateria SJT com 1 questão só**, valendo 15% do score, e o card «Caso prático» oferecido sem bateria configurada | `perguntas` tem 1 linha ativa para `sdr-social-seller`, nenhuma `caso_aberto`; a tela abriu «nenhuma avaliação pendente» |
| **5** | 3 | 🔴 **BLOCKER — Big Five não pode ser enviado.** O gate de `Authorization` roda antes da checagem de `OPTIONS` no `Deno.serve`, e preflight CORS não manda `Authorization` → 401 | `curl -X OPTIONS`: bigfive **401**, `submit-candidatura` 200, `exportar-meus-dados` 200. `respostas_bigfive` tem 0 linhas em TODO o banco |
| **6** | 3 | 🔴 **Devolutiva do Big Five nunca é gerada desde 2026-07-07.** A guarda Bearer SEC-04 401-a o único chamador legítimo, e o `try/catch` best-effort do submit esconde a falha | Logs: `401 gerar-devolutiva-bigfive` 3 ms antes do `200` do submit. Guarda criada em 07/07; única devolutiva do banco é de 30/06; **0** nos últimos 30 dias |
| **7** | 3 | 🔴 **Rubrica fantasma.** O RH lê «Experiência UAU 5/5» sobre um raciocínio que avaliou «Cuidado e Empatia». O prompt manda pontuar «as dimensões definidas» e nunca as define; a IA inventa as suas; o front rotula por posição | Prompt ativo `culture_fit_essay` v1.0.0 não contém UAU/Inovação/Atitude de Dono/Sede de Crescimento. `analise_ia.dimension_name` traz 4 nomes totalmente outros |
| **8** | 3 | **A revisão salva e a tela não mostra.** Operador salvou «Aprovado», voltou e estava tudo igual | `status_analise='concluida'`, `decisao_revisor='aprovado'`, `revisada_em 00:42:04` — gravado certo, cache não invalidada |
| **9** | 3 | Fila de revisão diz «nenhuma pendente» porque filtra só vermelhas/amarelas, com a verde aberta ao lado | tela |
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

### 🔧 Fila de consertos — para o plano de correção

Decisão do operador em 2026-09-20: **documentar tudo primeiro, consertar em bloco depois.**
Cada linha já traz o que a correção exige, para o plano não precisar rediagnosticar.

| # | O que consertar | Onde | O que a correção exige | Risco |
|---|---|---|---|---|
| **6** 🔴 | Devolutiva do Big Five 401 desde 07/07 | `submit-bigfive-final:243` + `gerar-devolutiva-bigfive:661` | **O porquê NÃO está provado.** Ou (A) instrumentar o prefixo do Bearer recebido e medir, ou (B) trocar `functions.invoke` por `fetch` explícito com `Authorization: Bearer ${SERVICE_KEY}`. Recomendação: B, depois A se falhar | Deploy de EF. Não mexer na guarda SEC-04 — ela fecha um IDOR real |
| **6b** | O best-effort que escondeu o 6 por 74 dias | `submit-bigfive-final:241-258` | O `try/catch` pode continuar não derrubando o submit, mas **a falha tem de ficar visível** — gravar o erro, ou não prometer devolutiva na tela quando `devolutiva_id` vier `null` | Baixo |
| **1** | B8 — formulário sem autosave | `FormularioCandidaturaPage` | Rascunho por etapa. Decidir onde: `sessionStorage` (como o Big Five) ou banco. **Se for banco, é decisão de LGPD** — dado de candidato antes do consentimento final | Médio |
| **2** | RH não lê respostas nem perfil | `HubCandidatoRH` | Tela nova lendo `respostas_formulario` + dados do candidato. Allowlist explícita de colunas, **nunca `select *`** (o comentário do `analiseCandidatoService` explica por quê) | Baixo |
| **2b** | `resumo_respostas` escondido do RH | `ANALISE_HUB_ALLOWLIST` | **Decisão de produto antes de código:** o RH deve ver o raciocínio (a)–(d) da IA? Hoje vê 5 bullets e uma nota, sem o cruzamento | — |
| **3** | «~10 min» é placeholder | `AvaliacaoContainer:240` | Propagar `perguntas.tempo_est_min` até o card. Hoje `deriveCards` lê de `vagas.testes_aplicaveis`, onde o campo não existe. E alinhar com o «15-25 min» da tela de redação | Baixo |
| **4** | Vaga com bateria de 1 questão e card sem conteúdo | config de vaga + `deriveCardState` | Duas coisas: (i) o card não deve ser oferecido quando não há pergunta configurada; (ii) o RH precisa de **aviso ao publicar** vaga com bateria magra (1 questão valendo 15%) | Médio |
| **U1–U4** | Atrito de interface | vários | Ver a seção «Atrito de interface» acima | Baixo |
| **P1** | Modelo/custo das funções de IA | — | Avaliar troca de modelo | — |

⚠ **Duas tabelas e duas colunas MORTAS achadas até aqui** — não quebram nada, mas quem
for consertar precisa saber para não procurar dado onde não há:
`respostas_bigfive` (0 linhas na história) · `scores_bigfive` (0) ·
`candidaturas.tempo_preenchimento_segundos` (0/32) · `candidaturas.origem_candidatura` (1/32).
O Big Five grava em **`scores_candidato`**.

### Caminhos ainda NÃO exercitados

- `gaps` e `flags` da IA vieram `[]` — precisam de um candidato fraco para serem testados
- o comparativo lendo CV duplamente truncado (Etapa 11)
