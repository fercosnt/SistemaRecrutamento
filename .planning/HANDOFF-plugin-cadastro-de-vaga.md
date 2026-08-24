# Handoff — plugin de cadastro de vaga

**Escrito em:** 2026-08-23. **Revisado em:** 2026-08-23, noite.
**Como começar a conversa nova:** *"Vamos construir o plugin de cadastro de vaga — leia
`.planning/HANDOFF-plugin-cadastro-de-vaga.md`"*.

---

## ✅ Os bloqueadores deste plugin caíram — leia antes das seções 4 e 5

A sessão da noite de 2026-08-23 executou o que este documento listava como pendência:

| Era bloqueador | Estado |
|---|---|
| §5 — EF de IA lia colunas fantasma e analisava sem contexto da vaga | ✅ **consertado e deployado** (v17) |
| §4 parte 1 — colunas fantasma da EF | ✅ feito |
| §4 parte 3 — `rubrica_ia` separada da cópia de divulgação | ✅ coluna criada **e as duas rubricas escritas** (migration `…0019`) |
| §4 parte 2 — `secoes_extras` jsonb | ⚠ coluna criada, **ainda não renderizada** na página |

Descoberto no mesmo dia: os prompts ATIVOS de IA eram `[SEED PLACEHOLDER]` — a IA rodava sem
instrução nenhuma. Hidratados pela migration `…0018`. Detalhe em `.planning/RETOMAR-AQUI.md`.

**O que isso muda para quem construir:** já existem **duas rubricas reais no banco**, revisadas
e aprovadas. Elas são o gabarito do que o plugin deve gerar no campo `rubrica_ia` — leia-as
antes de desenhar o prompt do plugin:

```sql
select slug, rubrica_ia from public.vagas where status = 'ativa';
```

Formato observado: requisitos eliminatórios → 5 competências críticas com âncoras BARS 1-5 →
seção «o que NÃO pode pesar». ⚠ **Teto de 5 competências**: cada uma gera um bloco BARS
completo na saída e o prompt `cv_job_match` tem `max_tokens: 2048`. Mais que isso arrisca
truncar o JSON. E a rubrica **nunca** manda rejeitar — manda segurar o score (RNF-07a).

---

## ⚠ Ferramentas a usar na construção — não improvisar

Este projeto tem duas skills feitas exatamente para isto. **Invocar as duas**, nesta ordem:

1. **`skill-creator`** — para desenhar a skill em si (estrutura, gatilhos, instruções).
2. **`plugin-builder`** — para empacotar como plugin do Claude Code (`.claude/`, marketplace,
   distribuição). A descrição dela cobre scaffolding, skills/commands/hooks/agents/MCP,
   e portar skill existente para formato de plugin.

Há também **`skill-analyzer`**, que pontua uma skill em 4 dimensões e gera plano de melhoria
— vale rodar depois de a primeira versão existir, antes de considerar pronto.

---

## O que o plugin faz

O operador manda o descritivo do cargo (PDF ou texto). A conversa discute o que estiver
ambíguo. No fim, o plugin preenche **tudo**:

- os campos da vaga (título, slug, departamento, contrato, modelo, local, jornada, faixa);
- o corpo do anúncio, **já nas marcas que o `TextoRico` entende**;
- as seções extras (ver a decisão de estrutura);
- a **rubrica da IA** — proposta, para aprovação humana;
- as **perguntas da Etapa 1** (ver §3b — corrigido em 2026-08-23);
- triagem, cultura, pesos de avaliação e instruções de IA.

---

## Contexto obrigatório para quem construir

### 1. O formato de saída já existe e é fechado

`src/features/vagas/components/TextoRico.tsx` renderiza um **subconjunto restrito** de
markdown, deliberadamente. O plugin deve emitir exatamente estas marcas:

| Marca | Vira |
|---|---|
| `### Título` | subtítulo de seção |
| `- item` | lista com marcador |
| `1. item` | lista numerada (respeita o número inicial) |
| `**negrito**` | `<strong>` |
| `*itálico*` | `<em>` |
| linha em branco | novo parágrafo |

Tudo o mais vira **texto literal**. O componente **nunca** produz HTML — não existe
`dangerouslySetInnerHTML`, e há teste provando que `<img onerror>` chega como texto.

⚠ **Emitir marca que o renderizador não conhece é o defeito nº 1 a evitar.** Aconteceu duas
vezes em 2026-08-23: `**Contam pontos:**` e `*(foco atual)*` apareceram literais na tela. As
duas só foram vistas **olhando a página com conteúdo real** — nenhum teste unitário pegaria.
**O plugin deve terminar com uma conferência visual antes de publicar.**

### 2. Não existe tela de criar vaga

`/rh/vagas/nova` existe como rota mas **não cria nada**: `CriarEditarVagaPage` lê `vagaId` de
`useParams`, que naquela rota é sempre `undefined`, e os dois handlers de salvar caem em
«Salve a vaga primeiro». Não há mutation de criação em `src/features/vagas/`.

Consequência medida: vaga se cria por `INSERT` direto, e foi por isso que **9 de 12** vagas
estavam com `created_by` **nulo** — o que quebra o escopo de trabalho do recrutador inteiro
(`vagas.created_by = auth.uid()` gateia revisão de redação, avaliação de entrevista, leitura
de decisão final e reprocessamento).

**Decisão em aberto:** o plugin gera SQL para o operador aplicar, ou o projeto ganha a tela de
criação e o plugin preenche o formulário? A segunda é mais trabalho e resolve a causa.

### 3. Campos reais da tabela `vagas`

`slug` (único, `^[a-z0-9-]+$`) · `titulo` · `subtitulo` · `descricao_curta` · `departamento` ·
`tipo_contrato` · `modelo_trabalho` (`Presencial` | `Remoto` | `Híbrido`, **com maiúscula** —
o código compara com string capitalizada) · `nivel_senioridade` · `cidade` · `estado` (CHECK
de UF) · `endereco_completo` · `faixa_salarial_min`/`max` · `exibir_salario` (CHECK: só `true`
se as duas faixas existirem) · `status` (`rascunho`|`ativa`|`inativa`|`arquivada`) ·
`data_abertura`/`fechamento` · `total_vagas` · `sobre_empresa` · `sobre_cargo` ·
`responsabilidades` · `requisitos_formacao`/`_experiencia`/`_tecnicos`/`_habilidades` ·
`perfil_ideal` · `diferenciais` · `beneficios` · `jornada_trabalho` · `created_by`/`updated_by`
· `testes_aplicaveis` (jsonb) · `pesos_avaliacao` (jsonb) · `qualificacao_etapa1` (jsonb) ·
`aplica_cognitivo`.

⚠ **Divergência real:** o schema declara `text`, mas os mocks do repositório passam ARRAY em
`responsabilidades`, `diferenciais` e `beneficios`. `TextoRico` aceita as duas formas.

⚠ **`created_by` é obrigatório na prática**, mesmo sendo nullable no schema.

### 3b. ⛔ FURO DO SPEC ORIGINAL — as perguntas da Etapa 1 não estavam no escopo

A §3 lista `qualificacao_etapa1` (jsonb, na tabela `vagas`) entre os campos a preencher.
**Medido em 2026-08-23: esse campo está `[]` em TODAS as 14 vagas**, inclusive nas duas que
têm perguntas de verdade. As perguntas moram em outra tabela, `perguntas_formulario`, que a
versão original deste handoff não mencionava em lugar nenhum.

Construir para o spec antigo entregaria um plugin que preenche um jsonb que ninguém lê,
e as vagas continuariam com zero perguntas.

**Estado atual, que o plugin precisa resolver:** as duas vagas publicadas têm **zero**
perguntas. Candidato que se inscrever hoje é analisado só pelo currículo. E o anúncio da
Social Media promete que o portfólio é «OBRIGATÓRIO na inscrição» — **sem campo que o colete**.

**Forma real de `perguntas_formulario`** (medida, não suposta):

| coluna | regra |
|---|---|
| `vaga_id` | FK |
| `bloco` | CHECK — só `jornada`, `tecnologia`, `valores`, `curriculo` |
| `ordem` | CHECK `>= 1`, único por vaga na prática |
| `texto_pergunta` · `texto_ajuda` | texto |
| `tipo_resposta` | enum: `texto_curto`, `texto_longo`, `single_choice`, `multiple_choice`, `numerico` |
| `opcoes_resposta` | jsonb array de strings — CHECK: **obrigatório** nos dois `*_choice` |
| `obrigatoria` · `limite_caracteres` · `valor_minimo`/`maximo` | opcionais |
| `deleted_at` | soft delete — filtrar sempre |
| `created_by` | ⚠ **NULL nas 6 perguntas existentes** — mesma doença do `created_by` das vagas (§2) |

⚠ **A pergunta nunca chega ao prompt da IA.** `buildRespostasBlock` (EF `analise-candidato-
individual`, ~linha 114) monta só o TEXTO da resposta; o `pergunta_id` é selecionado e nunca
usado. O modelo vê `- Sim` / `- 3 anos` sem saber o que foi perguntado. **Enquanto isso não
for consertado, as perguntas devem ser autoexplicativas na própria resposta** — preferir
`texto_curto` com enunciado que induz resposta autocontida a `single_choice` com «Sim/Não».

### 4. ✅ A decisão de estrutura foi executada (era: "ainda não foi tomada")

Ler `.planning/DECISAO-campos-vaga-e-rubrica-ia.md`. As três partes propostas, hoje:

1. Colunas fantasma da EF de IA — ✅ consertadas e no ar.
2. `secoes_extras` JSONB — ✅ coluna criada com CHECK; ⚠ **ainda não renderizada** na página.
3. `rubrica_ia` separada da cópia de divulgação — ✅ criada **e preenchida nas duas vagas**.

**A dependência do plugin está satisfeita, e com folga:** a parte 3 não só foi feita como já
tem duas rubricas reais servindo de gabarito. O plugin gera **duas coisas diferentes** — o
anúncio (que ATRAI) e a rubrica (que AVALIA) — e nunca uma só. Misturar as duas é o que enfia
sinal não decidido na avaliação.

### 5. ✅ O defeito bloqueador foi consertado (era: "⛔ precisa estar consertado")

A EF `analise-candidato-individual` lia `descricao` e `requisitos`, colunas inexistentes; o
erro era descartado e a IA avaliava sem contexto da vaga. **Consertado, deployado (v17) e
provado por execução em 2026-08-23.** Rubrica ausente agora acende flag visível
(`vaga_sem_rubrica` / `vaga_sem_rubrica_deliberada`) em vez de silêncio.

⚠ Sobrou um resíduo que afeta o plugin: **boa parte da saída da IA é descartada na
persistência.** O modelo produz `competency_scores` (BARS inteiro), `recommendation`,
`confidence`, `bias_check` e as citações literais — e a EF grava só `match_score`, o *nome*
dos pontos fortes, o *nome* dos gaps e o reasoning. Ou seja: **a rubrica que o plugin gerar
tem efeito real no score e no reasoning, mas o detalhe BARS por competência não chega à tela
de ninguém.** Vale saber antes de investir em rubricas muito granulares.

### 6. ⚠ A bifurcação que precisa ser decidida ANTES de codar

Repetida aqui porque está enterrada na §2 e é a decisão que mais muda o tamanho do trabalho:

> **O plugin gera SQL para o operador aplicar, ou o projeto ganha a tela de criação de vaga
> e o plugin preenche o formulário?**

A segunda é mais trabalho e **resolve a causa** — hoje não existe tela de criação, vaga nasce
por `INSERT` direto, e foi por isso que 9 de 12 vagas ficaram com `created_by` nulo, quebrando
o escopo do recrutador inteiro. As 6 perguntas existentes têm o mesmo defeito.

Se a escolha for «gera SQL», o plugin **tem de** preencher `created_by` explicitamente, nas
vagas e nas perguntas — senão multiplica o problema em vez de contê-lo.

---

## Como validar o plugin quando existir

1. Rodar sobre os **dois PDFs que já temos** (`~/Downloads/Descritivo_Cargo_SDR_*.pdf` e
   `Descritivo_Cargo_Social_Media_*.pdf`) e comparar com o que está hoje no banco — que foi
   transcrito à mão e revisado. É um gabarito.
2. **Olhar a página renderizada**, não só o SQL. Os dois defeitos de marca de hoje só
   apareceram assim.
3. Rodar `skill-analyzer` sobre a skill resultante.

---

## Ordem combinada com o operador — atualizada em 2026-08-23, noite

1. ✅ Legibilidade da página da vaga — **feito e no ar**
2. ✅ Decisão de campos + rubrica — **executada**: EF consertada e deployada, prompts
   hidratados, `secoes_extras` e `rubrica_ia` criadas, as duas rubricas escritas
3. ▶ **Este plugin — É O PRÓXIMO.** Decidido com o operador que ele vem **antes** de criar as
   perguntas da Etapa 1 à mão: criar por `INSERT` direto alimentaria o mesmo caminho que
   deixou 9 de 12 vagas sem `created_by`. As perguntas nascem pelo plugin.
4. ⏸ Dados de teste (currículos + respostas) para avaliar a qualidade das análises —
   ~~depende do defeito da §5~~ ✅ **desbloqueado**; agora mede o sistema, não o modelo
5. ⏸ Terceira vaga **não publicada** para os testes de IA, para o funil real nascer limpo

## O relógio que corre enquanto o plugin não existe

As duas vagas estão **publicadas** e com **zero perguntas**. Hoje isso não machucou ninguém —
elas também têm **zero candidaturas**, e o funil real está limpo. Mas quem se inscrever antes
do plugin ficar pronto entra sem responder nada e sem lugar para mandar o portfólio.

Se o plugin demorar mais que alguns dias, o tapa-buraco combinado é **uma** pergunta na vaga de
Social Media (o campo do portfólio, `texto_curto`, bloco `curriculo`), por migration versionada
e com `created_by` preenchido — não `INSERT` ad-hoc.
