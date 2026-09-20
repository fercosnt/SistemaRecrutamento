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
| Etapas concluídas | **1 a 9** — atualizado 2026-09-20 13:10 |
| Faltam | **10** knockout · **11** comparativo · **12** direitos do titular (LGPD) · **13** admin |
| Achados | **22 defeitos** · **14 propostas (PP-1..14)** · 1 pendência (P1) |
| **Estado da Marina** | `etapa_atual='rejeitado'` · `status='rejeitado'` · `motivo_rejeicao='reprovado_avaliacao'` — rejeitada na TRIAGEM |
| `decisao_final` / snapshots dela | **0 / 0** — removidos no reset da Etapa 9 |
| `candidatos` / `candidaturas` | **42 / 32** |
| Backups restauráveis | `~/Desktop/RESTAURAR-decisao-marina.sql` (aprovação) · `~/Desktop/BACKUP-art20-marina.sql` (trilha Art. 20 completa, verificada) |
| Conserto JÁ em PROD | `submit-bigfive-final` **v11** — preflight CORS (Defeito 5) |
| Artefatos de teste | `~/Desktop/` → currículo PDF · `transcricao-A-forte.txt` · `transcricao-B-fraca.txt` |
| Árvore git | limpa · **commits locais, `origin/main` ainda SEM push** |

### ⏭ Decisão tomada em 2026-09-20: PARAR e CONSERTAR antes de seguir

Motivo: os Defeitos **22** e **20** ferem candidato **hoje, em produção**, no caminho mais
comum do funil. Deixaram de ser «documentar e ver depois».

**Previsão em aberto, que decide o tamanho do conserto do Defeito 22:** na Etapa 10, o
cartão «Ver explicação» **deve** aparecer para o knockout (ele grava `feedback_rejeicao`).
Se aparecer, o conserto é de uma linha. Se não aparecer, a condição está mais quebrada do
que o diagnóstico indica. **Vale rodar a Etapa 10 antes de consertar** — custa pouco e
evita consertar às cegas.

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

📝 **O que aconteceu:** — 2026-09-20, **conferido no banco**

**Resultado: o fluxo funciona. O desenho dele é que precisa mudar (ver PP-8).**

| | |
|---|---|
| Agendamento criado | `00:54:24` · `agendamentos_entrevista.id=ba6ab416-…` |
| Reagendado | `00:56:17` · mesma linha, `status='reagendada'` |
| `data_hora` final | **`2026-09-24 09:00`** — o horário NOVO ✅ |
| Entrevistador / link / observações | `Fernando` · `dddd` · `dfasgfsdghsdggv` |

✅ **Os dois e-mails saíram, e o reagendamento NÃO sobrescreveu em silêncio:**

| Evento | Criado | Entregue | Δ |
|---|---|---|---|
| `convite` (agendamento) | `00:54:24.879` | `00:54:30.367` | **5,5 s** |
| `convite` (reagendamento) | `00:56:17.919` | `00:56:21.683` | **3,8 s** |

Ambos `status='entregue'`, confirmados pelo provedor. O segundo e-mail traz o texto
**«foi reagendada»** e a data nova. O painel da candidata mostrou o horário novo —
nada de «sem horário definido».

✅ **O `.ics` funcionou.** Anexo `entrevista-beautysmile.ics` nos dois e-mails. O operador
digitou `dddd` no campo de link; como não é URL, foi para **LOCATION** no `.ics` e para
«Onde: dddd» no corpo. Comportamento correto.

✅ **Defesa que passou no teste sem ninguém pedir:** `AgendamentoCandidatoCard.tsx:210`
só transforma `local_ou_link` em `<a href>` quando `isSafeHttpUrl` aprova (http/https).
O `dddd` renderizou como **texto**, não como link quebrado.

### >>! Defeito 10 (NOVO) — o reagendamento apaga o horário anterior

A linha é **atualizada no lugar**: mesmo `id`, `created_at 00:54:24`, `updated_at 00:56:17`.
O horário original (**23/09 09:00**) **não existe mais em lugar nenhum do banco** — só no
corpo do e-mail que já foi enviado.

Consequências práticas: não dá para responder «com quantas horas de antecedência a
candidata foi avisada?», nem «quantas vezes esta entrevista foi remarcada?», nem defender
a empresa se o candidato reclamar de remarcação em cima da hora. Para um sistema que
grava `historico_candidatura` de cada transição de etapa, perder a trilha do
**reagendamento** é incoerente.

### >>! `candidaturas.data_entrevista_online` está NULL com a entrevista agendada

**Quinta coluna morta.** O agendamento mora em `agendamentos_entrevista`; a coluna em
`candidaturas` existe, tem nome óbvio e **ninguém escreve nela**. Qualquer relatório ou
consulta que confie nesse nome vai dizer que a entrevista não foi marcada.

### ❓ «O sistema consegue gerar o link da reunião?» — **não**

Medido: não há geração de link em lugar nenhum (`src/features/agendamento`,
`supabase/functions`). `local_ou_link` é **texto livre**, e o único vestígio de intenção é
o placeholder do campo: `ex.: https://meet.google.com/...`
(`AgendamentoBlock.tsx:298`). O recrutador cria a reunião fora e cola o link à mão.

### 🎨 PP-8 — repensar o agendamento (acordado com o operador)

O fluxo atual **impõe** horário ao candidato. Errado por três motivos: desrespeita quem
tem emprego atual, queima a vaga com quem não pode naquele dia, e gera retrabalho de
reagendamento (que, como o Defeito 10 mostra, nem fica registrado).

**Desenho proposto:**

1. **O recrutador publica JANELAS, não horários** — «terças e quintas, 14h-18h, blocos de
   45 min». O sistema gera os slots.
2. **O candidato escolhe** um slot pelo painel. O `.ics` sai na hora, para os dois lados.
3. **Saída para quem não pode em nenhum** — botão «Nenhum destes horários funciona para
   mim» + campo curto («quando você consegue?»). Isso vira **pendência na fila do
   recrutador**, não um e-mail perdido. Sem isso, quem trabalha das 9h às 18h some, e a
   empresa nunca sabe que perdeu um bom candidato.
4. **Geração de link de reunião** — hoje inexistente (ver acima).

**Fluxo de confirmação definido pelo operador (2026-09-20):**

1. O candidato escolhe o horário entre os slots abertos.
2. **O recrutador recebe e-mail** e entra na plataforma para **aceitar** a reunião.
3. **Para aceitar, ele é obrigado a informar o link.** Só então o sistema cria o
   compromisso naquele dia/horário e envia ao candidato.

>> Esse desenho resolve o `dddd` **por construção**: não existe reunião confirmada sem
>> link, sem precisar de validação extra na escrita.

⚠ **Dois pontos a resolver no desenho, que este fluxo cria:**
- **O slot fica pendurado** entre a escolha do candidato e o aceite do recrutador. Precisa
  de um estado `pendente_de_confirmacao` e de **expiração**, senão dois candidatos escolhem
  o mesmo horário e o segundo descobre tarde.
- **E se o recrutador não aceitar?** Precisa de prazo e de aviso — para o candidato não
  ficar esperando confirmação que não vem, que é a versão silenciosa do mesmo problema.

⚠ **Sobre integrar Outlook/Google:** o próprio operador identificou o risco — «o
preenchimento no sistema do dia e horário seria manual». **Dado que entra por dois canais
diverge**, e esta jornada já achou três casos dessa família. Se integrar, a agenda externa
tem de ser **espelho** (o sistema cria o evento via API e guarda o id), nunca fonte
paralela. Meio-termo sem integração: o sistema gera os slots e o `.ics` já coloca o
compromisso no Outlook de quem aceitar — 90% do valor, sem o risco de divergência.

---

## Etapa 5 · Guia de entrevista (IA) — e a espera

### 👔 RH

No perfil de Marina → **«Gerar guia»**.

### 👀 O que observar

- [ ] O botão **trava** e a tela avisa que leva **1–2 minutos**
- [ ] **Julgamento seu:** a espera é tolerável?
- [ ] ⚠ **Não clique de novo.** Cliques repetidos esgotaram o limite de concorrência e fizeram _todas_ as funções de IA responderem «Failed to fetch» (§4 do RETOMAR)

📝 **O que aconteceu:** — 2026-09-20, **conferido no banco**

**O guia foi gerado. E não tem uma linha sobre a candidata.**

| | |
|---|---|
| `entrevista_guias.id` | `9c903ca2-…` · `tipo='online'` · `prompt_version 1.0.0` |
| Gerado em | `01:17:43` |
| Tamanho | 15.745 caracteres, 6 perguntas STAR/PEI com âncoras BARS 1-5 |
| Modelo | `claude-sonnet-4-6`, `temperature 0.10`, `max_tokens 8000` |

>> O botão **não se chama «Gerar guia»** e não está no perfil, como o roteiro dizia.
>> Fica em **«Abrir Entrevista Online»** → aba **«Guia de entrevista»**, com dois botões
>> («entrevista online» e «entrevista presencial»). O roteiro estava desatualizado.

### >>! Defeito 11 (NOVO) — o guia de entrevista ignora o candidato por completo

Busca literal no conteúdo gravado (15.745 caracteres):

| Marcador | No guia? |
|---|---|
| «Marina» (o nome dela) | **não** |
| «Neusa» (a redação inteira) | **não** |
| «no-show» / 31%→12% (a métrica do CV) | **não** |
| «Studio Lumen» / «Vértice» (empregadores) | **não** |
| «GoHighLevel» (o CRM que ela nomeou) | **não** |
| R$ 38.400 / R$ 45.000 | **não** |

**Não é falha do modelo — o dado nunca é enviado.** Lendo
`gerar-guia-entrevista/index.ts:205-260`, o que vai ao prompt é:

```
Vaga: <título> · Formato: <online|presencial>
Competências críticas (pesos): <chaves de pesos_avaliacao>
Perfil ideal: <primeiros 800 chars da VAGA>
Dimensões fracas (score<3): <derivadas só de scores_candidato>
```

A `candidaturas` é consultada **só** com `select("id, vaga_id, candidato_id")` — para o
cross-check de IDOR. **Currículo, redação, respostas da triagem, Big Five e a análise da
IA não entram.** O único sinal derivado da candidata é `weakDims`, e ele vem de
**notas**, não de conteúdo — para uma candidata forte ele vem **vazio**, e aí o guia é
100% da vaga.

**A consequência é concreta e cara.** A pergunta 2 do guia é *«Pense em um lead que não
respondeu após o primeiro contato. Como você conduziu o acompanhamento? Quantas
tentativas, em quais canais?»* — ela **já respondeu isso por escrito**, no currículo:
cadência de 7 toques em 21 dias (D+1, D+3, D+7, D+14, D+21). O entrevistador gasta uma
das 6 perguntas para ouvir o que já está documentado, e **não pergunta nada** sobre a
história da dona Neusa, que é onde há material real para aprofundar.

É um **roteiro do CARGO**, não um guia DAQUELE candidato — e a tela o apresenta dentro
da ficha dela, o que faz parecer personalizado.

>> Detalhe sem impacto hoje: o código traz `"gpt-4o-mini"` como modelo de fallback
>> (`index.ts:227`). Não é usado — a linha de `prompt_versions` existe e manda
>> `claude-sonnet-4-6`. Mas é um fallback para **outro provedor** num sistema Claude;
>> se a linha sumir, o fallback não falha alto, ele troca de modelo em silêncio.

>> A tela admite o estado do agendamento por escrito: «Entrevista agendada: 24/09/2026
>> às 09:00 **(manual no V1)**». Honesto, e reforça a PP-8.

### 🎨 Mais propostas do operador

| # | Proposta |
|---|---|
| **PP-9** | **Entrevista como abas dentro da ficha do candidato** — uma aba «online» e uma «presencial», cada uma com o botão de gerar guia e o campo de colar transcrição. Hoje é página separada, mesmo problema da PP-2 (workspace de redação) |
| **PP-10** | **Avaliação da entrevista: nota 0-10 do gestor + campo de notas**, em vez de avaliar competência por competência. Ao salvar, dispara a análise da IA |
| **PP-11** | **Uma análise da IA que EVOLUI por etapa**, em vez de congelar na triagem. A cada etapa concluída ela se atualiza e fala das etapas. (Alternativa discutida: uma análise separada por etapa — decisão em aberto) |

---

## Etapa 6 · Entrevista presencial e análise da transcrição

### 👔 RH

Agendar a presencial → marcar comparecimento → colar uma transcrição qualquer →
**«Analisar transcrição»**.

### 👀 O que observar

- [ ] A análise cita trechos **daquela** transcrição
- [ ] Cole uma transcrição **diferente** e gere de novo: a análise **muda** _(foi defeito grave — o cache servia a análise anterior — e está consertado)_

📝 **O que aconteceu:** — 2026-09-20, **conferido no banco**

**O melhor resultado da jornada. Três coisas provadas de uma vez.**

Método: duas transcrições da **mesma candidata**, escritas de propósito com marcadores
**sem nenhuma sobreposição** — A forte (Camila · Nayara · R$ 12.700 · 84 leads) e
B fraca (Rogério · Odontosys · «três meses parado»).

| | Análise A | Análise B |
|---|---|---|
| `id` | `99208dea-…` | `d5a6f75f-…` |
| Gerada | `01:37:30` | `01:42:03` |
| Velocidade/1º contato | 4 | **1** |
| Follow-up estruturado | 5 | **1** |
| Registro e disciplina em CRM | 5 | **1** |
| Conversação sobre valor | 5 | **`insufficient_evidence`** |
| Impacto pessoal / resultado | 4 | **2** |
| Reativação de base | 4 | **1** |
| Média | **4,5** | **1,2** |

### ✅ 1. O cache está consertado — provado, não presumido

As citações da B são **todas** da B, e **nenhuma** da A. Nem «Camila», nem «Nayara», nem
«R$ 12.700», nem «84 leads». O defeito grave de cache (a análise anterior sendo servida)
**não voltou**.

### ✅ 2. A análise discrimina de verdade

Queda de **4,5 para 1,2** na mesma candidata, nas mesmas 6 competências. E as citações
mostram *por quê*: «Nunca teve muito critério, para ser sincera», «Assim, de cabeça não»,
«Para mim no dia a dia não fazia muita diferença», «O Rogério falava que eu era uma das
melhores». O modelo pegou exatamente os pontos que o texto foi escrito para conter.

### ✅ 3. `insufficient_evidence` — o caminho que estava sem teste desde a Etapa 2

«Conversação natural sobre estética, saúde e investimento financeiro» veio **`—`** na
tela, e no banco é literalmente `"score": "insufficient_evidence"`. A transcrição B não
tinha nada sobre conduzir conversa de valor, e o modelo **se recusou a dar nota** em vez
de inventar um número. É o oposto exato do modo de falha «saída válida sem evidência de
critério» — aqui a ausência de evidência **apareceu**, não foi preenchida.

>> **Contraste que reduz o escopo do Defeito 7:** aqui as competências são as **6 reais
>> da vaga**, as mesmas do guia de entrevista. A rubrica fantasma é um problema
>> **específico da redação**, não uma doença do sistema de IA inteiro.

### >>! Defeito 12 (NOVO) — a transcrição não é guardada, e as análises se acumulam sem dono

`entrevista_analises` tem 13 colunas e **nenhuma guarda a transcrição** — nem o texto,
nem um hash. `entrevistas_online` e `entrevistas_presenciais` estão **vazias**. A fonte
que produziu a nota **não existe no banco**.

E agora há **duas linhas** para a mesma candidatura, sem `updated_at`, sem marca de
superada. A leitura pega a mais nova (`created_at desc, limit 1` —
`entrevistaService.ts:401`), o que está certo para exibir, mas:

- O RH vê notas e citações e **não pode conferir contra o original**. Se uma citação for
  inventada, não há como detectar.
- Para defender uma contratação — ou responder um pedido LGPD — a fonte sumiu.
- Um texto colado por engano **rebaixa a análise da entrevista real** e a antiga fica na
  tabela, indistinguível, para sempre.

### ✅ O cache é POR CONTEÚDO e funciona — provado pelo log de custo

A transcrição A foi reanalisada duas vezes depois da B. As quatro execuções, medidas em
`ai_call_logs` e nos logs da plataforma:

| # | Transcrição | Latência | Chamada de IA? | Custo |
|---|---|---|---|---|
| 1 | A | **60,3 s** | **sim** — hash `9adae98a` | US$ 0,0494 |
| 2 | B | **42,5 s** | **sim** — hash `b4234b6d` | US$ 0,0358 |
| 3 | A de novo | **2,4 s** | **não** | **US$ 0** |
| 4 | A de novo | **3,2 s** | **não** | **US$ 0** |

`ai_call_logs` tem **duas** linhas, não quatro. As execuções 3 e 4 foram **cache hit**:
saída byte-idêntica à da execução 1 (`md5(citacoes) = f31de35914f5` nas três), em 2-3
segundos, sem custo. Conteúdo diferente → hash diferente → chamada real. **É exatamente
o comportamento correto**, e explica por que a B mudou tudo: ela é outro hash.

### 💰 P1 respondida — o custo real de processar um candidato

| Chamada | Tok. entrada | Tok. saída | Custo | Latência |
|---|---|---|---|---|
| `transcript_analysis` (×2) | 1.772 | 5.401 | US$ 0,0852 | 51,4 s |
| `interview_guide` | **66** | 4.436 | US$ 0,0667 | 98,4 s |
| `cv_job_match` (triagem) | 1.232 | 2.625 | US$ 0,0431 | 45,6 s |
| `culture_fit_essay` | 457 | 1.253 | US$ 0,0202 | 26,6 s |

**Um candidato completo custa ~US$ 0,17** (≈ R$ 0,95), descontando a análise extra do
teste. Modelo `claude-sonnet-4-6` em todas.

>> **Correção do que registrei na Etapa 3.** Eu anotei que «não há como medir o gasto por
>> avaliação» porque `redacoes_candidato.cost_tokens_*` está nulo. **Meia verdade.**
>> `ai_call_logs` registra `input_token_count`, `output_token_count`, `cost_usd`,
>> `latency_ms` e `input_hash` de toda chamada. O que falta é a **desnormalização** para
>> a tabela da redação — o dado existe, só não está onde aquela tela olha.

### 📏 O Defeito 11 em números

`interview_guide` recebeu **66 tokens de entrada**. Sessenta e seis — contra 1.232 da
triagem, que lê currículo e respostas. Não há espaço em 66 tokens para currículo, redação
ou análise: é o título da vaga, o formato e pouco mais. **A medição de custo confirma,
independentemente, o que a leitura do código já dizia.**

### O Defeito 12 fica pior: cache hit TAMBÉM grava linha

Quatro execuções, **quatro linhas** em `entrevista_analises` — inclusive as duas que não
chamaram a IA. Duas delas nasceram com **17 segundos de diferença**, cada uma com seu
próprio `OPTIONS` (portanto duas ações distintas, não um retry interno). Uma tabela que
acumula uma linha por clique, sem `updated_at`, sem marca de superada e **sem a
transcrição**, não permite dizer qual análise corresponde a qual entrevista.

### >>! Defeito 13 (NOVO · GRAVE) — o card da lista mostra **0** para avaliação concluída

No card da Marina em `/rh/candidatos`: **Big Five 0** · DISC N/A · Intel N/A · **Cultura 0**.

A Marina tem Big Five **completo** (30 facetas, 5 dimensões, em `scores_candidato`) e
redação **95/100**. O card diz **zero** nas duas.

**Causa: o card lê exatamente as fontes mortas** (`CandidatosRHPage.tsx:345-348`):

| Prop | Fonte lida | Estado real |
|---|---|---|
| `bigFive` | `calculateBigFiveAverage(candidatura.scores_bigfive)` | **`scores_bigfive` tem 0 linhas em TODO o banco** |
| `cultura` | `getCultureScore(candidatura.analise_ia_cultura)` | **coluna morta** de `candidaturas` |
| `disc` | `candidatura.scores_disc` | nunca aplicado |
| `inteligencia` | `candidatura.scores_raven?.percentil` | nunca aplicado |

O componente até trata ausência: `{bigFive ?? 'N/A'}` (`ScoreCard.tsx:90`). Mas o que
chega não é `null` — é **`0`**, produzido pelos helpers ao receber lista vazia. O `??`
não tem o que defender.

**Por que é grave e não cosmético.** Zero não é «sem dado» — é **a pior nota possível**.
Esta é a tela de **lista**, onde o RH bate o olho em dezenas de candidatos para decidir
quem abrir. Uma candidata com 95/100 em cultura aparece com **0** ao lado de quem não fez
nada. O dado certo existe, em `scores_candidato` e `redacoes_candidato`; o card olha para
o lugar errado e ainda traduz vazio como zero.

>> É o fecho do inventário de tabelas mortas: elas não são só inertes — **há uma tela de
>> produção consumindo quatro delas**, e transformando ausência em nota mínima.

### ❓ Vale testar a entrevista PRESENCIAL? — medido, e a resposta é «ainda não»

O caminho presencial **não é cópia do online**: `gerar-guia-entrevista` com
`tipo='presencial'` lê `scores_candidato` onde `tipo='entrevista'` e usa
`weakThreshold = 4` para «focar nos GAPS da entrevista online»
(`index.ts:218-229`).

**A fiação está correta** — conferido: a linha `tipo='entrevista'` existe e o
`metadata.competencias` traz as 6 notas, que é de onde `weakDimsFromScores` lê
(`index.ts:121-135`). O `upsert` mantém a linha alinhada com a análise mais recente.

**Mas o recurso distintivo não tem o que exercitar agora.** Com as notas fortes
(4,5,5,5,4,4) e limiar 4, **nenhuma** competência fica abaixo — `weakDims` sai vazio e o
guia presencial nasce genérico, igual ao online. Para testar o que o presencial tem de
diferente é preciso uma análise **fraca** — que existia com a transcrição B e foi
substituída.

**Decisão:** pular o presencial agora e exercitá-lo quando houver cenário fraco (etapas
de rejeição). Fica na lista de caminhos não exercitados.

>> **P1 (tokens da sessão de validação):** 27.339 → **34.688**.

---

## Etapa 7 · Decisão final — **APROVAR** (contratar)

### 👔 RH

`/rh/candidato/:id/decisao` → **Aprovar** com justificativa ≥50 caracteres.

### 👀 O que observar

- [ ] O consolidado usa **os 3 pesos** (SJT + redação + entrevista), não um terço
- [ ] E-mail de aprovação chega para Marina
- [ ] No painel dela: cartão **«Entenda a decisão sobre sua candidatura»**

📝 **O que aconteceu:** — 2026-09-20, **conferido no banco** · decisão ainda NÃO registrada

### >>! Defeito 14 (NOVO) — nada trava o avanço, e a presencial durou 30 segundos

`historico_candidatura`:

| De → Para | Hora |
|---|---|
| entrevista_online → **entrevista_presencial** | `02:06:01` |
| entrevista_presencial → **decisao_final** | `02:06:31` |

**Trinta segundos.** Nenhuma entrevista presencial foi marcada, realizada, transcrita ou
avaliada — e o sistema não pediu nada. O histórico agora afirma que a candidata **passou
pela entrevista presencial**, e não passou. Quem auditar o processo daqui a seis meses
vai ler uma etapa que não aconteceu.

### >>! Defeito 15 (NOVO) — o sistema promete avisar «a cada etapa» e avisa em 1 de 4

O e-mail de confirmação da inscrição diz, textualmente:

> «A partir de agora, você poderá acompanhar o andamento pelo painel do candidato.
> **Avisaremos por e-mail a cada etapa.**»

`notificacoes_enviadas` para os **quatro** avanços humanos:

| Avanço | E-mail? |
|---|---|
| triagem → avaliação assíncrona | ✅ `avaliacao_liberada` |
| avaliação assíncrona → entrevista online | **nenhum** |
| entrevista online → entrevista presencial | **nenhum** |
| entrevista presencial → decisão final | **nenhum** |

A candidata foi movida três vezes **em silêncio**. Do ponto de vista dela, a candidatura
parou na avaliação. Não é o aviso que falta por acaso — **é uma promessa escrita que o
sistema não cumpre**.

### >> `criterio_texto` nulo em 4 de 4 avanços humanos

Confirma e agrava a observação da Etapa 3: **nenhum** avanço feito por pessoa gravou
justificativa. Só a transição automática (`inscricao → triagem`) tem texto. A trilha de
auditoria registra *que* mudou e *quem* mudou, nunca *por quê*.

### O consolidado: 96,88 sobre 40% dos pesos

| Linha | Valor | Peso |
|---|---|---|
| Triagem | 96/100 | **Contextual · não pondera** |
| Work sample (SJT) | 100/100 | 15% |
| Redação cultural | 95/100 | 25% |
| **Entrevista** | **N/A** | — (peso 35% na vaga) |
| Perfil comportamental / Cognitivo | — | Contextual |

Aritmética confere: `(100×15 + 95×25) / 40 = 96,875` → **96,88**. Ou seja, o número
grande no topo é calculado sobre **40 dos 100 pontos de peso** da vaga.

✅ **A triagem ser contextual é deliberado e documentado** (`ConsolidacaoDashboard.tsx:83-84`,
UX-09: pré-triagem de CV é contexto visível, nunca agrega). Não é defeito.

✅ **A entrevista ficar fora também tem lógica**: a análise existe (média 4,5), mas
`scores_candidato.score` para `tipo='entrevista'` é **null** com `status='pendente_humano'`
— ela só pondera depois da revisão humana. Coerente com RNF-07a, e a Recomendação
**avisa**: «Revisão humana pendente em entrevista».

>>! **O que incomoda é a apresentação:** «SCORE CONSOLIDADO 96.88» em destaque, sem dizer
>>! que 60% do peso está de fora. E a entrevista aparece como **«N/A»** — que lê como
>>! «não se aplica» — quando o correto seria «aguardando revisão humana».

>> **Mais um peso morto:** `vagas.pesos_avaliacao` define `triagem: 25`, e o código
>> **nunca usa** esse peso (a triagem é contextual por desenho). Peso configurável que
>> não pondera nada — mesmo padrão das colunas mortas.

✅ **Comparativo:** «Nenhum finalista para comparar ainda» — correto, a Marina é a única
em decisão final nesta vaga.

✅ **A tela de decisão exige justificativa** de no mínimo 50 caracteres, com o aviso de
que «fica registrada na trilha de auditoria». Três opções: Aprovar · Rejeitar · Manter em
espera.

### 🎨 Propostas do operador nesta tela

| # | Proposta |
|---|---|
| **PP-12** | A decisão final deveria mostrar os **textos completos das análises da IA**, não só os números |
| **PP-13** | Mostrar **perfil comportamental e cognitivo** na decisão, mesmo marcados como não ponderantes — o gestor quer ver, ainda que não contem no cálculo |

### ✅ A decisão foi registrada — e esta etapa passou limpa

`decisao_final.id = f21bc5f3-…` · `decisao = aprovado` · `em 02:11:34.459` ·
`por_usuario` preenchido.

| Conferência | Resultado |
|---|---|
| `justificativa` | **gravada inteira**, texto completo, sem truncar |
| `candidaturas.etapa_atual` | `decisao_final` → **`aprovado`** (avançou sozinho) ✅ |
| `candidaturas.status` | **`finalizado`** ✅ |
| `candidaturas.data_decisao_final` | **preenchida** — esta coluna **NÃO** é morta |
| `decisao_final_historico` | **0 snapshots** — o trigger só dispara em UPDATE, e este foi INSERT |

**E-mail:** criado `02:11:34.958` → enviado `.13` → **entregue `02:11:39.366`**.
**4,4 s**, `evento='decisao'`, template `decisao_final`, confirmado pelo provedor.

### 🟢 O contraste que vale registrar

A **justificativa da decisão ficou gravada por inteiro**, enquanto `criterio_texto` nasceu
**null em 4 de 4** avanços. Mesmo sistema, mesma trilha de auditoria, duas telas: uma
**exige** 50 caracteres e persiste; a outra não pede nada e grava vazio. O conserto do
Defeito 15b (justificativa nos avanços) já tem um modelo pronto dentro do próprio
repositório.

### 🎨 PP-14 — o e-mail de aprovação merece tratamento próprio

Observação do operador: o e-mail de aprovação usa **o mesmo layout neutro** de todos os
outros («Temos uma ótima notícia... Nossa equipe entrará em contato em breve»). É a
melhor notícia que o sistema envia na vida de alguém, e chega com a mesma cara de um
aviso de etapa. Vale diferenciar.

### ✅ O comparativo vazio NÃO é defeito — medido

Suspeita levantada: «tinham outros inscritos nessa vaga e o comparativo apareceu vazio».
Contagem em `candidaturas` desta vaga (6 no total):

| `etapa_atual` | `status` | qtd |
|---|---|---|
| aprovado | finalizado | **1** (Marina) |
| triagem | em_analise | 3 |
| inscricao | rejeitado | 2 |

**Nenhuma outra em `decisao_final`.** A mensagem da tela é precisa: «O comparativo aparece
quando houver outros candidatos **em decisão final** para esta vaga». Ela estava certa.

>>? **Mas há uma decisão de produto embutida:** o comparativo só confronta **finalistas**.
>>? Se a intenção é comparar quem disputa a vaga, o recorte é estreito — os 3 em triagem
>>? nunca serão comparados entre si. Decidir se é isso mesmo.

>> **Lista de candidatos não separa finalizados.** A Marina, já `aprovado`/`finalizado`,
>> continua na listagem junto com quem está em triagem. Não é erro — é ausência de filtro
>> padrão. Com o tempo, candidatos encerrados poluem a tela de trabalho diário do RH.

>> ⚠ **Estado para a Etapa 8 (reset destrutivo):** hoje há **1** linha em `decisao_final`,
>> **0** em `decisao_final_historico`, `etapa_atual='aprovado'`, `status='finalizado'`.
>> Medir de novo depois — cada UPDATE em `decisao_final` cria snapshot.

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

📝 **O que aconteceu:** — 2026-09-20 12:11, reset executado · decisão ainda NÃO refeita

### O reset (autorizado pelo operador, escopado à Marina)

Backup restaurável gravado **antes** em `~/Desktop/RESTAURAR-decisao-marina.sql` —
reconstrói a linha byte a byte (mesmo `id`, mesma justificativa, mesmo timestamp).

| | Antes | Depois |
|---|---|---|
| `decisao_final` (Marina) | 1 | **0** |
| `decisao_final` (total) | 7 | **6** |
| `candidatos` / `candidaturas` | 42 / 32 | **42 / 32** — intactos ✅ |
| `etapa_atual` | `aprovado` | **`decisao_final`** |
| `status` | `finalizado` | **`aguardando_resposta`** |

**Duas linhas tocadas, ambas da Marina. Nenhum colateral.**

`retencao_hold` e `decisao_final_historico` estavam com **0** linhas — o roteiro mandava
apagá-las, e não havia o que apagar. O `historico_candidatura` foi **preservado de
propósito**: apagar a trilha destruiria a auditoria, e «aprovada 02:11 → rejeitada 12:xx»
é um caso real de RH que muda de ideia.

### >>! Defeito 17 (NOVO) — a justificativa gruda e contamina transições futuras

O `UPDATE` do reset disparou o gatilho de histórico, que gravou
`aprovado → decisao_final` às `12:11:47` — **correto**, a trilha pegou até a minha
intervenção por SQL (com `ator = null`, honesto).

**Mas veio com o `criterio_texto` da APROVAÇÃO:** «Aprovada. Forte aderência nas etapas
avaliadas…» carimbado numa transição que **desfez** a aprovação.

Causa, no código: `criterio_texto` é copiado de `NEW.etapa_justificativa`
(`historico_candidatura.sql:42` · `avancar_etapa_trigger.sql:15`), e
`candidaturas.etapa_justificativa` é uma coluna **persistente que ninguém limpa depois de
consumir**. Medido agora: ela ainda contém o texto da aprovação.

**Consequência em uso normal, sem SQL nenhum:** depois de qualquer decisão registrada,
o **próximo clique em «Avançar»** copia a justificativa da decisão anterior para uma
transição que não tem nada a ver com ela. A trilha de auditoria passa a atribuir um
motivo a um movimento que nunca o teve.

>> **Isto refina o conserto do `criterio_texto` nulo (Defeito 15b).** Não basta fazer o
>> «Avançar» escrever: se ele só escrever, herda-se o texto velho quando o campo não for
>> preenchido. O conserto tem **duas** partes — coletar a justificativa no avanço **e**
>> limpar `etapa_justificativa` depois de consumida. Fazer só a primeira troca um defeito
>> por outro, pior, porque o texto errado *parece* certo.

>> Os 4 avanços com `criterio_texto` nulo agora se explicam: `etapa_justificativa` estava
>> nula naquele momento. O campo nunca foi «não gravado» — ele é um **carimbo herdado**.

### A rejeição foi registrada

`decisao_final.id = 1e38b95a-…` · `rejeitado` · `12:26:39` · justificativa inteira.
Depois: `explicacao_solicitada_em 12:29:27` · `revisao_solicitada_em 12:30:31`.

>> **Erro de credencial ao clicar em «Rejeitar».** O operador viu um erro como se a
>> sessão tivesse expirado; ao recarregar, a decisão já constava. Gravou certo, mas a
>> tela mentiu sobre o resultado. Não reproduzido — anotar e vigiar.

### ✅ Defeito 3 do roteiro CONFIRMADO — e quantificado

`decisao_final_historico` tem **5** linhas. As cinco com a **mesma** `decisao='rejeitado'`
e o **mesmo** `decidido_em` (12:26:39). Só o `arquivado_em` muda:

| # | `arquivado_em` | O que foi |
|---|---|---|
| 1 | `12:29:27.152` | 1ª visita à página de explicação |
| 2 | `12:30:00.131` | reload |
| 3 | `12:30:01.724` | reload |
| 4 | `12:30:02.979` | reload |
| 5 | `12:30:31.882` | pedido de revisão |

**Quatro das cinco linhas são LEITURAS.** A decisão mudou **uma** vez; a tabela diz cinco.
O trigger `trg_decisao_final_snapshot` dispara a cada `UPDATE` de `decisao_final`, e
carimbar `explicacao_solicitada_em` é um UPDATE — então **ler a explicação versiona a
decisão**. Um candidato ansioso que recarrega 50 vezes gera 50 snapshots idênticos, e a
trilha que deveria mostrar «quantas vezes esta decisão mudou» fica ilegível.

### >>! Defeito 18 (NOVO) — a candidata foi rejeitada e NÃO foi avisada

`notificacoes_enviadas` após a rejeição: **três** e-mails, todos para o RH
(`revisao_solicitada` → rh2, rh3 e fernando@). **Zero para a candidata.**

Ela descobriu que foi rejeitada porque **entrou no painel**. Se não tivesse entrado, não
saberia.

**Causa medida:** o `dedupe_key` do evento é `<candidatura_id>:decisao` — não inclui
**qual** decisão nem quando. A aprovação das `02:11` ocupou a chave; a rejeição das
`12:26` colidiu e foi **descartada em silêncio**. `status` da linha antiga segue
`entregue`; não há linha nova nem erro. Nada no banco denuncia o aviso que não saiu.

✅ **O Art. 20 NÃO está exposto** — conferido antes de concluir: a resposta da revisão usa
evento próprio (`revisao_respondida`, chave `<candidatura>:revisao_respondida`). Se a
decisão for revertida, a candidata **é** avisada por esse caminho. O buraco é específico
de **redecidir**.

>> Hoje redecidir só é alcançável por reset manual (há `UNIQUE (candidatura_id)` em
>> `decisao_final` e a UI não oferece «refazer decisão»). Mas a chave é frágil **por
>> construção**: ela promete «um aviso de decisão por candidatura, para sempre».

>> **Quem decidiu recebe o pedido de revisão da própria decisão.** `fernando@` está entre
>> os 3 destinatários, e foi ele quem rejeitou. Não é defeito em si — mas significa que o
>> portão «quem decidiu não pode responder» **tem de estar no ato de responder**, não na
>> notificação. É o que a próxima medição vai verificar.

### ✅ O portão do Art. 20 FUNCIONA — e funciona no servidor

Com a conta que decidiu, o «Responder» foi **recusado**, com mensagem clara:

> «Quem registrou a decisão não pode responder à revisão dela. Encaminhe este pedido a
> outra pessoa do RH ou a um administrador.»

E não é aviso de tela: o write-path é **RPC `SECURITY DEFINER`**, e `decisao_final` **não
tem policy de UPDATE** — «INSERT é WITH CHECK (false) e não há UPDATE»
(`20260730000001_p42_revisao_art20.sql`, D-P42-02). O guard não é contornável por
PostgREST. Confirmado no dado: `revisao_por_usuario` (`66412f96…`) **≠** `por_usuario`
(`4fceff36…`).

Respondido por RH2 às `12:38:03`, veredito **`revertida`**.

### ✅ E a candidata FOI avisada — minha conclusão anterior se sustenta

E-mail «Resposta à sua solicitação de revisão» entregue **12:38**, pelo evento
`revisao_respondida`, que tem chave própria. O Defeito 18 realmente **não** alcança o
Art. 20 — verificado por execução, não por leitura.

### >>! Defeito 19 (NOVO) — «revertida» não reverte nada, e o e-mail promete que sim

Depois do veredito `revertida`:

| Campo | Valor |
|---|---|
| `decisao_final.revisao_veredito` | **`revertida`** |
| `decisao_final.decisao` | ainda **`rejeitado`** |
| `candidaturas.etapa_atual` | **`rejeitado`** |
| `candidaturas.status` | **`rejeitado`** |

**Não é bug de implementação** — o desenho é explícito: REVISAO-03 diz «resultado da
revisão registrado por UM write-path auditável», e a RPC só grava o veredito. **É uma
lacuna de fluxo**, e ela tem duas pontas:

1. **A candidata recebe sinais contraditórios.** O e-mail diz «**a decisão anterior foi
   revista**»; o painel dela diz **Rejeitado**. Quem lê «revista» entende que mudou. O
   sistema não diz qual é o novo estado — porque não há novo estado.
2. **O veredito não tem caminho de execução.** «Revertida» é registrado e nada acontece.
   Para reintegrar a candidata seria preciso um reset manual no banco — exatamente o que
   fizemos à mão na Etapa 8. Não existe botão, RPC ou fluxo que execute a reversão que o
   próprio sistema acabou de registrar.

É uma decisão documentada cuja **próxima etapa não tem plano**: o direito do Art. 20 é
garantido até o veredito, e para de funcionar um passo antes do efeito.

---

## Etapa 9 · RESET → **rejeitar na triagem** (rejeição humana, cedo)

> **Me avise.** Eu volto a candidatura para `triagem`.

### 👔 RH

Rejeitar direto na triagem, com justificativa ≥50 caracteres.

### 👀 O que observar — **o portão que mais importa**

- [ ] **NÃO** aparece cartão de explicação no painel de Marina. É diferente da Etapa 8 de propósito: aquela foi decisão avaliada; esta é triagem
- [ ] ⚠ O texto que você escrever **entra na cópia de dados** que ela pode baixar — a tela avisa isso ao lado do campo. Confira que o aviso está lá

📝 **O que aconteceu:** — 2026-09-20 · reset executado · rejeição ainda NÃO feita

### 🟢 Um portão MORDEU — e é o melhor achado da etapa

Ao tentar regredir `rejeitado → triagem` limpando `etapa_justificativa` no mesmo
`UPDATE`, o banco **recusou**:

```
P0001: Regressão de etapa exige justificativa preenchida
CONTEXT: PL/pgSQL function public.avancar_etapa() line 14
```

Não é aviso de UI — é trigger no banco. Uma regressão de etapa **não passa sem motivo
registrado**. Refiz o `UPDATE` fornecendo a justificativa que ele exige, em vez de
contorná-la; o texto gravado diz que é reset de validação e aponta o backup.

### ⛓ E isso conecta com o Defeito 17 de um jeito que muda a gravidade dele

**O reset da Etapa 8 passou por este mesmo portão — e não devia.** Lá eu regredi
`aprovado → decisao_final` e **nada reclamou**, porque `etapa_justificativa` ainda
carregava o texto **da aprovação**. O portão viu campo preenchido e liberou.

Ou seja: a justificativa herdada (Defeito 17) **desarma um portão de integridade**. Uma
regressão que deveria exigir motivo novo passa carregando o motivo de outra coisa — e o
histórico registra a regressão com uma justificativa que fala de aprovar.

>> Isso promove o Defeito 17 de «sujeira na auditoria» para «enfraquece um controle».
>> E confirma a forma do conserto: limpar `etapa_justificativa` depois de consumida **não
>> é opcional** — sem isso o portão fica cego.

### O reset (autorizado, escopado, com backup verificado)

`~/Desktop/BACKUP-art20-marina.sql` — trilha completa do Art. 20. **Verificado contra o
banco**: os 7 ids (1 decisão + 6 snapshots) estão no arquivo, um de cada, com
`revisao_veredito`, `revisao_resultado` e `revisao_por_usuario`.

| | Antes | Depois |
|---|---|---|
| `decisao_final` (Marina / total) | 1 / 7 | **0 / 6** |
| `decisao_final_historico` (Marina / total) | 6 / 13 | **0 / 7** |
| `candidatos` / `candidaturas` | 42 / 32 | **42 / 32** — intactos ✅ |
| `etapa_atual` | `rejeitado` | **`triagem`** |
| `historico_candidatura` | 8 | **9** — regressão registrada, nada apagado |

Nenhum colateral: os outros 6 registros de `decisao_final` e os 7 snapshots de outros
candidatos seguem intactos.

### ✅ O reset se provou na tela dela

O painel da Marina voltou a **Triagem · Aguardando Resposta**, «Em triagem — retorno em
até 48 horas», sem rejeição e sem página de explicação. Nenhum resíduo de tela.

### A rejeição na triagem, registrada

| Campo | Valor |
|---|---|
| `etapa_atual` / `status` | `rejeitado` / `rejeitado` |
| `motivo_rejeicao` | **`reprovado_avaliacao`** (enum, não texto livre) |
| `etapa_justificativa` | «Nao tem fit com a vaga e falta experiencia no que queremos» |
| `data_decisao_final` | **null** — correto, não é decisão final |
| `decisao_final` | **0 linhas** — a rejeição precoce não cria registro lá |

✅ **O diálogo é o melhor texto de UI do sistema.** Exige motivo (lista fechada) **e**
justificativa de 50+ caracteres, e explica por quê: «O candidato pode baixar este texto:
a justificativa entra na cópia de dados que ele pede pela LGPD (Art. 18, II). Escreva com
fatos, do jeito que você assinaria.» Avisa também que a ação é reversível manualmente.

### >>! Defeito 20 (NOVO) — rejeitar na triagem não avisa o candidato

**Nenhuma notificação** após a rejeição. A última linha de `notificacoes_enviadas` segue
sendo a `revisao_respondida` das 12:38.

E aqui a causa **não é** o dedupe do Defeito 18: não houve sequer tentativa. A RPC
`rejeitar_candidatura` (`20260714100001`) **não dispara notificação nenhuma** — não há
`net.http`, não há despacho, não há evento. O candidato é rejeitado e o sistema não tem
caminho para contar.

Somado ao Defeito 15 («Avisaremos por e-mail a cada etapa»), o resultado é: **a rejeição
mais comum de todas — a precoce, na triagem — é silenciosa por construção.**

### ✅ O que eu quase reportei errado (o 4º da jornada)

Ia registrar «rejeição precoce não tem direito à explicação do Art. 20», já que não há
linha em `decisao_final` e é lá que a página lê. **Falso.** A migration
`20260906000007_explicacao_knockout.sql` trata **os três** casos explicitamente:

> (a) decisão final humana → JÁ tem `decisao_final`, e a página já funciona;
> (b) **rejeição humana na triagem** (`rejeitar_candidatura`) → `status='rejeitado'`, SEM
> linha em `decisao_final`;
> (c) knockout automático → `status='rejeitado'`, SEM linha em `decisao_final`.

A cobertura existe **no banco**. **E não renderiza na tela** — ver o Defeito 22, abaixo.

### >>!! Defeito 22 (NOVO · o mais grave de LGPD da jornada)

**A Marina foi rejeitada e NÃO tem como pedir a explicação do Art. 20.** O cartão
«Entenda a decisão sobre sua candidatura» **não aparece** no painel dela. Apareceu na
rejeição pela decisão final (12:26) e sumiu na rejeição pela triagem — mesmo desfecho
para a candidata, direitos diferentes.

**A condição, medida linha a linha** (`DashboardCandidatoPage.tsx:148-159`):

```js
const houveDesfecho = etapasDecisao.includes(etapa) || status === 'rejeitado';
if (!houveDesfecho) return false;
return Boolean(candidatura.data_decisao_final || candidatura.feedback_rejeicao);
```

| Condição | Marina | |
|---|---|---|
| `houveDesfecho` | `etapa='rejeitado'` | ✅ **passa** |
| `data_decisao_final OR feedback_rejeicao` | **null** e **null** | ❌ **falha** |

A rejeição humana na triagem preenche `motivo_rejeicao` (`reprovado_avaliacao`) e
`etapa_justificativa` — e **nenhum** dos dois campos que a condição testa.

**O conserto anterior corrigiu metade, e o comentário do código prova que sabia disso.**
Ele descreve o caso do knockout e diz: «o knockout grava o `feedback_rejeicao` neutro
(`20260608000001:197`)» — por isso o knockout passa na segunda condição. O conserto
acrescentou o eixo `status` para o knockout e **manteve** a segunda condição intacta. A
rejeição humana na triagem, que não grava nenhum dos dois, ficou de fora.

E a migration da Phase 46 (`20260906000007_explicacao_knockout.sql`) lista os **três**
casos de propósito, incluindo «(b) rejeição humana na triagem». **O backend foi corrigido
para os três; o front continua gateando pelo critério da Phase 17.** É exatamente a
família do §7.27 do `CLAUDE.md`: a correção chegou por um canal e o front ficou parado.

**Por que é o mais grave:** a rejeição na triagem é o caminho **mais comum** de todos —
a maioria dos candidatos nunca chega à decisão final. Somado ao Defeito 20 (a rejeição
na triagem também não manda e-mail), o resultado é: **o candidato mais típico é rejeitado
em silêncio e sem caminho para exercer o Art. 20.**

**O conserto é preciso e pequeno:** incluir `motivo_rejeicao` na segunda condição, ou
fazer `rejeitar_candidatura` gravar `feedback_rejeicao`. Um dos dois, não os dois.

>>? **Previsão para a Etapa 10 (knockout):** o cartão **deve** aparecer, porque o
>>? knockout grava `feedback_rejeicao`. Se não aparecer, a condição está mais quebrada do
>>? que esta análise indica.

### >>! Defeito 21 (NOVO · UI) — o select do motivo é ilegível

No diálogo de rejeição, o `<select>` do motivo abre **branco sobre branco**. O operador
não conseguiu ler as opções — só apareceram ao passar o cursor. E há uma **opção em
branco** na lista, entre «Perfil desalinhado com a vaga» e «Reprovado na entrevista»:
é «Reprovado na avaliação», que existe (foi a escolhida, e gravou `reprovado_avaliacao`)
mas **não renderiza o rótulo**.

>> **«Acompanhar candidatura» não é clicável** no painel da candidata. Botão morto na
>> única tela que ela tem para saber onde está.

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

📝 **O que aconteceu:** — 2026-09-20 13:58 · **a melhor etapa do sistema até aqui**

### ✅ O knockout funciona, e funciona direito

Nova candidatura `25a4231c-…` na vaga Social Media, criada `13:58:37`:

| Campo | Valor | |
|---|---|---|
| `etapa_atual` | **`inscricao`** | nem chegou à triagem ✅ |
| `status` | `rejeitado` | encerrou na hora ✅ |
| `opcao_knockout_id` | **`0f59f62b-…`** | registra QUAL opção eliminou — internamente |
| `motivo_rejeicao` | `knockout_automatico` | |
| `feedback_rejeicao` | preenchido (texto neutro) | |

**E-mail entregue em 4,1 s** (`13:58:37.920` → `13:58:42.065`), chave
`25a4231c…:decisao` — outra candidatura, outra chave, o Defeito 18 não alcança.

### ✅ Os três critérios do roteiro, cumpridos

1. **«encerrada automaticamente na inscrição, sem avaliação de uma pessoa e sem passar
   pelas etapas do processo»** — está lá, textual.
2. **Não oferece revisão** e explica por quê: «Como esta decisão não envolveu avaliação de
   uma pessoa da nossa equipe, não há uma revisão a pedir por aqui». Oferece
   `lgpd@beautysmile.com.br`.
3. **O critério NÃO é revelado.** Diz «uma das respostas que você deu no formulário não
   atende a um deles» — sem dizer qual resposta, nem qual requisito. E acrescenta a porta
   para o erro honesto: «Se você acredita que respondeu ao formulário por engano».

E vai além do pedido: «**Nenhuma nota, análise ou perfil foi usado nesta decisão**» e
«não impede que você se candidate a outras».

### 🎯 A previsão do Defeito 22 se confirmou — o conserto é de UMA linha

Era a razão de rodar esta etapa antes de consertar. A comparação agora é experimental,
não teórica:

| | Knockout (cartão **aparece**) | Rejeição na triagem (cartão **some**) |
|---|---|---|
| `data_decisao_final` | null | null |
| **`feedback_rejeicao`** | **preenchido** ✅ | **null** ❌ |
| `motivo_rejeicao` | `knockout_automatico` | `reprovado_avaliacao` |

A segunda condição de `hasDecisaoFinal` é `data_decisao_final OR feedback_rejeicao`. O
knockout passa por `feedback_rejeicao`; a rejeição humana não preenche nenhum dos dois.

**Conserto confirmado, e escolhido:** fazer `rejeitar_candidatura` gravar
`feedback_rejeicao` — é o que o knockout já faz, o front não muda, e o texto neutro passa
a existir também para a rejeição humana (que hoje não tem nenhum). A alternativa (mexer na
condição do front) deixaria o candidato com cartão mas sem texto de feedback.

### >>! Defeito 23 (NOVO · UI) — a tela de encerramento tem contraste ilegível

Na tela «Inscrição recebida», a linha «Agradecemos seu interesse na Beauty Smile» sai
**escura sobre fundo claro-esverdeado**, quase invisível. É a primeira e única tela que o
candidato eliminado vê no momento da eliminação.

### 🎨 Duas decisões de produto levantadas pelo operador

| # | Questão | O que a medição informa |
|---|---|---|
| **PP-15** | **Revelar o critério do knockout?** | Hoje não revela, por desenho (D-15). O sistema **sabe** qual foi (`opcao_knockout_id` gravado) e escolhe não dizer |
| **PP-16** | **Trocar `lgpd@` por `rh@`** | ✅ **DECIDIDO pelo operador em 2026-09-20: usar `rh@beautysmile.com.br`** |

### ✅ PP-15 e PP-16 — decididas

**PP-15 — os requisitos eliminatórios vão para a PÁGINA DA VAGA.** O critério continua
**não** sendo revelado na explicação (quem quer o mapa não ganha; quem errou o clique tem
a porta do «respondeu por engano»). O conserto é anterior: a candidata não pode descobrir
que a vaga é presencial **depois** de preencher o formulário inteiro.

**PP-16 — o canal passa a ser `rh@beautysmile.com.br`.**

>> **Correção de um argumento meu.** Eu levantei que trocar `lgpd@` por `rh@` poderia
>> desviar contestações do Art. 20 para longe do Encarregado. **O argumento não se aplica
>> aqui**, e o repositório já dizia por quê: a Beauty Smile **decidiu não designar
>> Encarregado** em 2026-08-13 (`.planning/DECISAO-ENCARREGADO.md`, Art. 41). O que a lei
>> exige de agente de pequeno porte é **um canal de comunicação ao titular** — não um
>> endereço com nome específico. O comentário de `canalPrivacidade.ts:19-23` é explícito:
>> «saiu apenas o título que não corresponde a ninguém; o canal em si não pode mudar».
>>
>> E o segundo argumento — «quem decidiu não deveria receber a contestação» — **também
>> não vale para o knockout**, que é o único lugar onde este e-mail aparece numa
>> explicação: **não há humano que tenha decidido**. A decisão do operador está melhor
>> fundamentada do que a minha objeção sugeria.

**⚠ Escopo do conserto, medido — não é um lugar só:**

| Onde | Arquivo |
|---|---|
| **Fonte única** | `features/privacidade/constants/canalPrivacidade.ts:42` |
| Explicação do Art. 20 / knockout | `ExplicacaoCandidatoPage.tsx:245,248` (importa a constante) |
| **Cadastro — tela de autorizações** | `AutorizacoesStep.tsx:284,287` — **hardcoded**, não usa a constante |
| Teste que vai falhar (e deve) | `ExplicacaoCandidatoPage.test.tsx:422-423` verifica o literal |

Trocar só a constante **não resolve**: o `AutorizacoesStep` tem o endereço escrito à mão
em duas linhas. Se mudar só um, o candidato vê `rh@` na explicação e `lgpd@` no cadastro.

>> **A decisão tem uma dependência prática:** `rh@beautysmile.com.br` precisa **existir e
>> ser lido**. Um canal legal impresso na tela que cai no vazio é pior que o endereço
>> errado — e é o tipo de promessa sem código que o próprio módulo de privacidade diz
>> existir para impedir.

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
| **14** | 7 | **Nada trava o avanço.** A candidata atravessou `entrevista_presencial` em **30 segundos**, sem entrevista marcada, transcrita ou avaliada. O histórico afirma que ela passou por uma etapa que não aconteceu | `historico_candidatura`: 02:06:01 → 02:06:31 |
| **23** | 10 | **Contraste ilegível na tela de encerramento** — «Agradecemos seu interesse» sai escuro sobre fundo claro. É a única tela que o eliminado vê | tela |
| **22** | 9 | 🔴🔴 **O Art. 20 é inalcançável para quem é rejeitado na triagem.** O cartão «Ver explicação» some: a condição exige `data_decisao_final OR feedback_rejeicao`, e a rejeição humana grava `motivo_rejeicao`/`etapa_justificativa` — nenhum dos dois | `DashboardCandidatoPage.tsx:159`; medido: os dois campos null. Backend cobre os 3 casos (Phase 46), o front gateia pelo critério da Phase 17 |
| **20** | 9 | 🔴 **Rejeitar na triagem não avisa o candidato.** A RPC `rejeitar_candidatura` não dispara notificação nenhuma — sem `net.http`, sem evento. A rejeição mais comum de todas é silenciosa por construção | `notificacoes_enviadas` sem linha nova; a RPC (`20260714100001`) não tem caminho de despacho |
| **21** | 9 | **O select do motivo de rejeição é ilegível** (branco sobre branco) e uma das opções renderiza **sem rótulo** — «Reprovado na avaliação», que grava `reprovado_avaliacao` corretamente | tela |
| **19** | 8 | **«Revertida» não reverte.** O veredito é gravado e `decisao`, `etapa_atual` e `status` seguem `rejeitado`. O e-mail diz à candidata que «a decisão foi revista» e o painel dela diz Rejeitado. Não há caminho para executar a reversão | `revisao_veredito='revertida'` × `decisao='rejeitado'`; a RPC só grava o veredito (REVISAO-03) |
| **18** | 8 | 🔴 **A candidata foi rejeitada e não foi avisada.** O `dedupe_key` é `<candidatura>:decisao`, sem a decisão nem o instante: a aprovação ocupou a chave e a rejeição foi descartada em silêncio | 3 e-mails saíram (todos p/ RH), 0 para ela. A linha antiga segue `entregue`; nada no banco denuncia |
| **3b** | 8 | **Ler a explicação versiona a decisão.** 5 snapshots para 1 decisão: 4 são visitas à página, 1 é o pedido de revisão | `decisao_final_historico`: mesmo `decidido_em` nas 5, só `arquivado_em` muda |
| **17** | 8 | **A justificativa gruda.** `criterio_texto` copia `candidaturas.etapa_justificativa`, que ninguém limpa após consumir. Depois de uma decisão, o próximo «Avançar» carimba a justificativa da decisão numa transição que não é dela | O reset gravou `aprovado → decisao_final` com o texto «Aprovada. Forte aderência…»; `etapa_justificativa` segue com o texto da aprovação |
| **16** | — | **A prova cognitiva por opt-in (`aplica_cognitivo`) serve ZERO questões**: lê `cognitivo_itens`, que está vazia. Dormente hoje (14/14 vagas com `false`), mas arma ao ser ligada | contagem real: `cognitivo_itens`=0 · `questoes_raven`=60 (outro caminho, esse funciona) |
| **15** | 7 | **O sistema promete avisar «a cada etapa» e avisa em 1 de 4.** A candidata foi movida três vezes em silêncio | Texto do e-mail de confirmação × `notificacoes_enviadas` |
| **13** | 6 | 🔴 **O card da lista do RH mostra `0`** para Big Five e Cultura de uma candidata com Big Five completo e redação 95/100. Zero é a pior nota, não «sem dado», e isto é a tela de triagem visual | `CandidatosRHPage.tsx:345-348` lê `scores_bigfive` (0 linhas na história) e `analise_ia_cultura` (coluna morta); os helpers devolvem `0` e o `?? 'N/A'` nunca dispara |
| **12** | 6 | **A transcrição não é guardada** (nem texto nem hash) e as análises se acumulam sem `updated_at` nem marca de superada. A fonte da nota não existe no banco | `entrevista_analises` tem 13 colunas, nenhuma de texto; `entrevistas_online`/`_presenciais` vazias; 2 linhas coexistindo |
| **11** | 5 | **O guia de entrevista ignora o candidato.** Zero marcadores dela em 15.745 chars. CV, redação, respostas e análise **não são enviados** ao prompt; só vaga + notas. Uma das 6 perguntas pede algo que ela já documentou | Busca literal no `entrevista_guias.guia` + leitura de `gerar-guia-entrevista/index.ts:205-260` |
| **10** | 4 | **O reagendamento apaga o horário anterior.** A linha é atualizada no lugar; o slot original (23/09) não existe mais no banco, só no e-mail já enviado | `agendamentos_entrevista`: mesmo `id`, `created_at 00:54:24` / `updated_at 00:56:17`, `data_hora` já é a nova |
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

## 🌙 Varredura noturna (2026-09-20, 02h30 — operador dormindo, só leitura)

Nenhuma escrita em PROD, nenhum deploy, nenhum reset. Só medição.

### >>! Defeito 16 (NOVO) — a prova cognitiva por opt-in serve ZERO questões

Há **dois** instrumentos cognitivos, separados de propósito
(`AvaliacaoRavenScreen.tsx:1-18`):

| Tela | Fonte | Linhas | Como é liberada |
|---|---|---|---|
| `AvaliacaoRavenScreen` | `questoes_raven` | **60** ✅ | nominalmente, por candidatura (o botão «Liberar avaliação» do RH) |
| `ProvaCognitivaScreen` | **`cognitivo_itens`** | **0** ❌ | pela vaga, via `aplica_cognitivo = true` |

**O botão que o RH vê é o seguro** — cai no Raven, que tem as 60 matrizes. Isso responde
o `>>?` que ficou aberto na Etapa 3: liberar nominalmente **funciona**.

**A mina é o outro caminho.** Hoje as **14 vagas** têm `aplica_cognitivo = false`. O
primeiro RH que ligar esse interruptor entrega ao candidato uma prova com **zero
questões** — e, como a tabela está vazia e não há tratamento de lista vazia na tela, é
o mesmo modo de falha do «Caso prático» (Defeito 4), só que pior: alguém **escolheu**
aplicar.

### Inventário real de tabelas vazias — 15, não 25

| Vazia e **lida por tela de produção** | Consequência |
|---|---|
| `cognitivo_itens` | Defeito 16 (acima) |
| `cognitivo_respostas` | sem respostas porque não há itens |
| `scores_bigfive` · `scores_disc` | **Defeito 13** — o card mostra `0` |

As outras 11 (`biblioteca_perguntas`, `data_deletion_log`, `perguntas_cultura`,
`perguntas_vaga_origem`, `redacoes_candidato_em_progresso`, `respostas_bigfive`,
`respostas_cultura`, `respostas_disc`, `sessoes_ativas`,
`vagas_associadas_recrutadores`, `webhooks_logs`) **não são lidas** por nenhuma tela —
são inertes de verdade.

### ⚠ Três coisas que eu QUASE registrei como defeito, e não são

Vale mais que os achados, porque descreve o erro que esta jornada existe para evitar.

| Quase-defeito | Por que era falso |
|---|---|
| «25 tabelas vazias» | `pg_stat_user_tables.n_live_tup` é **estimativa do autovacuum**, não contagem. Dizia 0 para `questoes_raven` (**60** linhas), `questoes_bigfive` (**100**) e `templates_email` (**3**). A contagem real dá **15**. **Nunca usar `n_live_tup` como fato** |
| «comparativo vazio com outros inscritos» | Havia 6 candidaturas na vaga, mas **nenhuma** em `decisao_final`. A mensagem da tela era precisa |
| «`faixa_etaria_materializada` nula em 41/42» | É **por desenho**: `gerar_bias_snapshot()` usa `COALESCE(faixa_etaria_materializada, <derivada de data_nascimento>)`. A coluna só é preenchida para quem teve a data anonimizada |

### Estado dos portões

O padrão de varredura do `CLAUDE.md` acha **246** linhas (eram 244 em 06/09 — cresceu 2,
coerente). Nenhum portão novo com forma suspeita introduzido pela jornada.

⚠ `p47_teardown_dados_de_teste.sql:101` tem `v_esperado_candidatos := 41` e agora há
**42**. **Vai recusar — é o guard funcionando**, como a regra 2 previa. Atualizar a
constante só no fim de tudo.

---

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
`candidaturas.tempo_preenchimento_segundos` (0/32) · `candidaturas.origem_candidatura` (1/32) ·
`candidaturas.data_entrevista_online` (NULL com entrevista agendada).
O Big Five grava em **`scores_candidato`**, a redação em **`redacoes_candidato`** e o
agendamento em **`agendamentos_entrevista`**.

### Caminhos ainda NÃO exercitados

- `gaps` e `flags` da IA vieram `[]` — precisam de um candidato fraco para serem testados
- o comparativo lendo CV duplamente truncado (Etapa 11)
- **o guia de entrevista PRESENCIAL com dimensões fracas** — a fiação está certa, mas com
  notas 4+ o `weakDims` sai vazio e o guia nasce genérico. Exercitar em cenário fraco
