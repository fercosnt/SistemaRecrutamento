---
name: cadastro-de-vaga
description: Cria ou reescreve vaga no ATS Beauty Smile a partir de um descritivo de cargo (PDF ou texto), com rubrica de IA. Use para nova vaga, abrir vaga, cadastrar vaga ou criar perguntas da Etapa 1.
intent: |
  O ATS da Beauty Smile nao tem tela de criacao de vaga. Vaga nasce por INSERT direto, e foi
  por isso que 9 de 12 vagas ficaram com `created_by` nulo — o que quebra o escopo de trabalho
  do recrutador inteiro, porque `vagas.created_by = auth.uid()` gateia revisao de redacao,
  avaliacao de entrevista, leitura de decisao final e reprocessamento.

  Esta skill substitui o INSERT ad-hoc por um artefato: uma migration versionada, com
  `created_by` resolvido e provado, aplicada pela via que registra md5 no ledger. E ela produz
  os DOIS textos que uma vaga precisa e que nao sao o mesmo texto — o anuncio, que ATRAI, e a
  rubrica, que AVALIA. Misturar os dois enfia na avaliacao sinais que ninguem decidiu que
  pesariam, e e por ai que vies entra sem passar por decisao.

  ⚠ ATUALIZACAO 2026-08-25 — o que MUDOU e o que NAO mudou. A tela de configuracao passou a
  LER e GRAVAR perguntas e rubrica com `created_by` (antes: tres TODOs fixos em vazio, e o
  campo da IA descartava em silencio o que fosse digitado). Logo, para vaga que JA EXISTE, o
  INSERT ad-hoc deixou de ser o unico caminho — ha o modo `texto`, e a tela e segura.
  Continua valendo, e e a razao de esta skill existir: NAO HA MUTATION DE CRIACAO DE VAGA.
  Vaga nova so nasce por migration.
---

# Cadastro de vaga — Beauty Smile

Transforma um descritivo de cargo em uma vaga completa no banco: campos estruturados, corpo do
anúncio, seções extras, rubrica de avaliação da IA e as perguntas da Etapa 1.

**A saída é um arquivo de migration**, não um `INSERT` colado no SQL Editor. A diferença não é
cerimônia: sem arquivo, o apply é indistinguível de não-aplicado, e é assim que trabalho some.

## Dois textos com propósitos opostos

Toda vaga gera **duas** coisas, e nunca uma só:

| | serve para | quem lê |
|---|---|---|
| **o anúncio** | ATRAIR — vende a vaga, fala de trilha de carreira e benefício | o candidato |
| **a rubrica** (`rubrica_ia`) | AVALIAR — discrimina com justiça, define o que conta como evidência | a Edge Function de análise |

Se você escrever um só texto e usá-lo nos dois lugares, "operação enxuta" e "ambição saudável"
viram critério de avaliação de gente. Eles descrevem a **empresa**, não o candidato.

## O mapa de visibilidade — leia antes de escrever qualquer campo

Este é o erro mais caro e o menos óbvio: **boa parte das colunas de `vagas` não é lida por
ninguém.** Escrever ali é trabalho que evapora.

| Campo | Candidato vê? | Aceita markdown? | A IA vê? |
|---|---|---|---|
| `titulo` | ✅ | ❌ texto puro | ✅ |
| `rubrica_ia` | ❌ (é interno) | — | ✅ **e é tudo que ela vê** |
| `descricao_curta` | ✅ | ❌ **texto puro** | ❌ (só no fallback) |
| `sobre_cargo` | ✅ | ✅ | ❌ (só no fallback) |
| `requisitos_formacao` · `_experiencia` · `_tecnicos` · `_habilidades` | ✅ | ✅ | ❌ (só no fallback) |
| `responsabilidades` | ✅ | ✅ | ❌ |
| `diferenciais` · `beneficios` | ✅ | ✅ | ❌ |
| `departamento` · `modelo_trabalho` | ✅ | ❌ | ❌ |
| `cidade` · `estado` | ⚠ só na **listagem**, não na página da vaga | ❌ | ❌ |
| `subtitulo` · `sobre_empresa` · `perfil_ideal` | ❌ **nada renderiza** | — | ❌ |
| `tipo_contrato` · `jornada_trabalho` · `endereco_completo` | ❌ **nada renderiza** | — | ❌ |
| `secoes_extras` | ❌ **ainda não renderizado** | (vai aceitar) | ❌ |
| `faixa_salarial_min`/`max` | ❌ **não exibida ao candidato** | — | ❌ |
| `qualificacao_etapa1` | ❌ *snapshot* do `publish_vaga` — não use | — | ❌ |

Consequências que mudam como você escreve:

- **⛔ A rubrica tem de ser autossuficiente.** Quando a vaga tem `rubrica_ia`, a Edge Function
  manda ao modelo apenas `Vaga: <titulo>` + a rubrica — e **mais nada da vaga**. Os outros
  campos só entram no caminho de fallback, que existe para as vagas antigas sem rubrica.
  Logo: nunca escreva "conforme os requisitos da vaga" na rubrica. O modelo não os vê. Todo
  requisito que precisa pesar tem de estar **escrito dentro da própria rubrica**.
- **Não coloque nada que importe em `perfil_ideal`, `sobre_empresa` ou `subtitulo`.** Hoje há
  ~1,9 mil caracteres de cópia revisada nesses três campos, nas duas vagas publicadas, que
  nenhum candidato jamais viu.
- **Endereço, jornada e tipo de contrato não têm onde aparecer.** `jornada_trabalho`,
  `tipo_contrato` e `endereco_completo` não são renderizados em página nenhuma. Se a vaga é
  presencial com horário fixo, essa informação precisa entrar no corpo de `sobre_cargo` — ou o
  candidato se inscreve sem saber onde e em que horário vai trabalhar. Avise o operador.
- **`descricao_curta` é renderizada como texto puro.** Um `**negrito**` ali aparece com os
  asteriscos na tela.
- **`secoes_extras` você preenche mesmo assim** — a coluna e o CHECK existem, a renderização é
  o próximo item da fila. Mas avise o operador que aquele conteúdo fica invisível até lá, para
  ele decidir se algo precisa migrar para um campo visível agora.

O mapa foi medido, não suposto. Se o app mudar, remeça — o método está em
[references/mapa-de-visibilidade.md](references/mapa-de-visibilidade.md).

## Três modos

| Modo | Quando | O que emite |
|---|---|---|
| `vaga-nova` (padrão) | há um descritivo de cargo e a vaga não existe | migration que cria a vaga inteira + perguntas |
| `perguntas` | a vaga **já existe** e precisa de perguntas da Etapa 1 | migration que só acrescenta perguntas, continuando a numeração |
| `texto` | a vaga **já existe** e o operador prefere colar na tela | os textos prontos no chat, sem tocar no banco |

### O modo `texto` — e por que ele passou a existir

Até 2026-08-24 este modo era impossível: as abas Triagem, Cultura e IA da tela de configuração
eram três TODOs fixos em vazio, e o campo de instruções da IA **aceitava digitação sem nunca
salvar** — o operador escrevia a rubrica e a perdia ao sair da tela. Colar não funcionava.

Hoje a tela lê e grava as quatro coisas, com `created_by` preenchido. Então há escolha:

| | migration (`vaga-nova` / `perguntas`) | tela (`texto`) |
|---|---|---|
| artefato versionado, md5 no ledger | ✅ | ❌ |
| exige acesso ao banco | ✅ | ❌ |
| o operador revê antes de gravar | no diff | na própria tela |
| serve para vaga que **não existe** | ✅ | ❌ **a tela não cria vaga** |

⛔ **`vaga-nova` não tem alternativa.** `/rh/vagas/nova` é rota sem mutation de criação: sem
`vagaId`, todo handler cai em «Salve a vaga primeiro». Vaga nova continua nascendo por
migration. O modo `texto` só vale para vaga que já existe.

Sendo a rubrica o artefato que decide sobre gente, prefira migration quando ela mudar — o
rastro importa. Para ajuste de redação de uma pergunta, a tela basta.

**O que o modo `texto` imprime**, em blocos separados e prontos para colar, cada um dizendo em
que aba vai:

- as perguntas de Triagem, uma por bloco, com as opções já unidas por `; `
- as de Cultura (bloco `valores`) idem
- a rubrica inteira, para a aba IA
- os pesos e os testes, para a aba Avaliação

⚠ **A tela separa opções por `;`.** Uma opção que **contenha** ponto-e-vírgula se parte em duas
ao salvar. No modo `texto`, verifique isso antes de imprimir e troque por vírgula.

O fluxo abaixo é o mesmo nos dois; no modo `perguntas`, pule os passos que tratam de campos
da vaga e da rubrica — elas já existem e não se reescrevem aqui.

⚠ **Medido em 2026-08-25:** `social-media-producao-captacao-conteudo` tem **6 perguntas, todas
com autor**, e `consultor-relacionamento-pre-vendas` ainda tem **zero**. Das 12 perguntas vivas
do banco, 6 seguem com `created_by` nulo — são as antigas, de vagas de teste. Confira o estado
real antes de decidir o modo, em vez de confiar neste parágrafo: ele envelhece.

## O fluxo

São nove passos e o penúltimo escreve em produção. **Registre-os na lista de tarefas** (a
ferramenta de todo/task da sessão) antes de começar: o passo mais fácil de pular é o 8, a
conferência visual, e é justamente o único que pega os defeitos que nenhum teste pega.

### 0 · Resolver o autor antes de qualquer coisa

`created_by` é nullable no schema e **obrigatório na prática**. Pergunte de quem é a vaga e
resolva o `user_id` correspondente:

```bash
node p46apply.cjs sql "select user_id, nome_completo, email from public.usuarios_rh where ativo = true and deleted_at is null"
```

A migration resolve o autor por e-mail **e aborta se não achar** — nunca grava `NULL` calado.
O padrão está em [references/schema-e-migration.md](references/schema-e-migration.md).

### 1 · Ler o descritivo

PDF: use a ferramenta Read com o parâmetro `pages`. Se falhar, `pdftotext -layout arquivo.pdf -`.
Texto colado ou `.docx`: leia direto.

Leia **inteiro** antes de perguntar qualquer coisa. Metade das ambiguidades se resolve na
página seguinte.

### 2 · Uma rodada de perguntas, não um interrogatório

Liste tudo que ficou ambíguo e pergunte **de uma vez**, com `AskUserQuestion` — é o formato que
deixa o operador escolher em vez de redigir, e uma rodada estruturada cansa menos que seis
perguntas soltas ao longo da conversa.

O descritivo tipicamente não diz: salário, cidade/UF, tipo de contrato, jornada, data de
abertura, quantas vagas, e quais requisitos são de fato eliminatórios.

Distinga com cuidado **requisito eliminatório** de **diferencial**. Descritivos de cargo
misturam os dois, e a diferença decide se um candidato é cortado ou apenas pontuado.

### 3 · Montar o payload

Um JSON com: `vaga`, `secoes_extras`, `pesos_avaliacao`, `testes_aplicaveis`, `rubrica_ia` e
`perguntas`. A forma está em [references/schema-e-migration.md](references/schema-e-migration.md).

Os pesos e os testes não são opcionais: sem eles a vaga **nunca poderá ser publicada** pela
RPC. Não invente números — o repositório tem 8 conjuntos de defaults por cargo em
`cargoTemplates.ts`; escolha o mais próximo e ajuste.

Ao escrever o corpo do anúncio, use **apenas** as marcas que o renderizador conhece —
[references/texto-rico.md](references/texto-rico.md). Emitir marca desconhecida é o defeito nº 1
desta base: já apareceu duas vezes, literal na tela, e nenhum teste unitário pegou.

Ao escrever a rubrica, siga [references/rubrica-ia.md](references/rubrica-ia.md), que traz as
duas rubricas reais em produção como gabarito.

Ao escrever as perguntas, siga [references/perguntas-etapa1.md](references/perguntas-etapa1.md).
⚠ A pergunta **não chega ao prompt da IA** hoje — só a resposta. Isso muda como se pergunta.

### 4 · Rodar o validador — este é o portão

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/cadastro-de-vaga/scripts/validar-payload.mjs payload.json
```

Ele confere os CHECKs do banco, os portões do `publish_vaga`, as marcas do markdown, o teto de
competências e a presença do autor. **Não emita SQL enquanto ele não passar.** Um portão que
você contorna não é portão.

Se você acrescentar uma regra ao validador, acrescente a mutação correspondente em
`tests/provar-portao.mjs` e rode-o. Ele checa as duas metades que importam: que o portão **não
reprova** o payload-gabarito (a vaga real revisada) e que **ainda morde** cada defeito
conhecido. Uma regra sem mutação é uma regra que ninguém sabe se funciona.

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/cadastro-de-vaga/tests/provar-portao.mjs
```

### 5 · Aprovação humana da rubrica — explícita

Mostre a rubrica ao operador e **espere um "aprovo" literal**. A rubrica é o artefato que decide
sobre pessoas; o resto do payload é cópia. Este é o mesmo padrão do resto do sistema: a máquina
propõe, o humano aprova.

Se ele pedir mudanças, mude e mostre de novo. Não presuma aprovação por silêncio.

### 6 · Emitir a migration

Arquivo em `supabase/migrations/<AAAAMMDD><NNNNNN>_vaga_<slug>.sql`, no estilo desta base:
cabeçalho explicando **por que**, sem `BEGIN/COMMIT` (D-22), textos longos em dollar-quoting
nomeado. Template em [references/schema-e-migration.md](references/schema-e-migration.md).

**A vaga nasce `rascunho`.** Publicar é ato humano separado. Uma skill que publica sozinha
coloca gente num funil que ninguém revisou.

Mas o payload já tem de caber no portão de publicação, senão a vaga nasce impublicável.
`publish_vaga` recusa se: pesos não somarem 100 · nenhum teste obrigatório · **mais de 10
perguntas** · **mais de 1 pergunta aberta** (`texto_curto`/`texto_longo`) · pergunta com opção
eliminatória que não seja obrigatória.

### 7 · Aplicar — só depois do OK, e conferindo o md5

```bash
node p46apply.cjs migrate supabase/migrations/<arquivo>.sql
```

O SQL vai lido do arquivo, não transcrito; a migration e a linha do ledger vão na mesma
transação. Confira o md5 de volta — o aplicador já faz isso, mas leia a saída.

Depois, prove por execução que a vaga existe e que **o autor não é nulo**:

```bash
node p46apply.cjs sql "select slug, status, created_by, (select count(*) from perguntas_formulario p where p.vaga_id = v.id and p.deleted_at is null and p.created_by is null) as perguntas_sem_autor from public.vagas v where slug = '<slug>'"
```

### 8 · Conferência visual — a skill não termina no SQL

Abra a página da vaga com o conteúdo real e **olhe**. Os dois defeitos de markdown desta base
só apareceram assim; nenhum teste unitário os pegaria.

```bash
npm run dev    # porta 3003 → /vagas/<slug>
```

Confira: nenhum asterisco ou `###` literal na tela; as listas são listas; nada importante ficou
num campo que a página não renderiza.

## Portões que não se negociam

- **`created_by` explícito**, na vaga e em cada pergunta. É a razão de esta skill existir.
- **A vaga nasce `rascunho`.** Nunca `ativa`.
- **A rubrica nunca manda rejeitar.** Requisito eliminatório manda registrar gap `critical` e
  segurar o score abaixo de 40 — o sistema não rejeita candidato automaticamente por score
  (RNF-07a). Score baixo é sinal para o RH, não decisão da máquina.
- **Teto de 5 competências na rubrica.** Cada uma gera um bloco BARS completo e o prompt tem
  `max_tokens: 2048`; passar disso trunca o JSON.
- **Falha do sistema não penaliza candidato.** Se o anúncio pede algo que o formulário não
  coleta, a rubrica proíbe descontar por isso.
- **A rubrica é autossuficiente.** Nunca aponta para "os requisitos da vaga" — o modelo não os
  recebe quando há rubrica.
- **Nada em `qualificacao_etapa1`.** É um *snapshot derivado*, escrito pelo próprio
  `publish_vaga` a partir das perguntas reais. As perguntas moram em `perguntas_formulario`.
- **Não marcar opção como `knockout` por iniciativa própria.** Ela rejeita a candidatura na
  inscrição. Propor ao operador e esperar aprovação explícita.
- **Não usar `INSERT` ad-hoc nem o SQL Editor.** Sem arquivo não há artefato, e sem artefato o
  apply é indistinguível de não ter acontecido.

## Onde esta skill para

Ela **não** publica a vaga, **não** marca opção como eliminatória, **não** conserta a ausência
da tela de criação e **não** edita vaga existente fora do modo `perguntas`. Para mexer em campo
de vaga já criada, hoje é migration à parte — e vale lembrar que `slug`, `tipo_contrato`,
`modelo_trabalho` e `descricao_curta` **não persistem** pela tela de edição.

Se o descritivo for fino demais para sustentar cinco competências com âncoras observáveis,
**diga isso ao operador em vez de inventar âncoras**. Rubrica inventada é pior que rubrica
ausente: a ausente acende flag (`vaga_sem_rubrica_deliberada`), a inventada passa por
deliberada.

## Referências

| Arquivo | Quando ler |
|---|---|
| [references/mapa-de-visibilidade.md](references/mapa-de-visibilidade.md) | antes de decidir em que campo um conteúdo vai; e para remedir se o app mudou |
| [references/schema-e-migration.md](references/schema-e-migration.md) | forma do payload, colunas, CHECKs, template da migration, via de apply |
| [references/texto-rico.md](references/texto-rico.md) | ao escrever qualquer corpo de anúncio |
| [references/rubrica-ia.md](references/rubrica-ia.md) | ao escrever a rubrica — traz as duas gabarito |
| [references/perguntas-etapa1.md](references/perguntas-etapa1.md) | ao escrever as perguntas da Etapa 1 |
