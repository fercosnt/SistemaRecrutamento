# Handoff — plugin de cadastro de vaga

**Escrito em:** 2026-08-23, para ser retomado em outra conversa.
**Como começar a conversa nova:** *"Vamos construir o plugin de cadastro de vaga — leia
`.planning/HANDOFF-plugin-cadastro-de-vaga.md`"*.

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

### 4. A decisão de estrutura ainda não foi tomada

Ler `.planning/DECISAO-campos-vaga-e-rubrica-ia.md`. Três partes propostas e **nenhuma
executada**: consertar as colunas fantasma da EF de IA, criar `secoes_extras` JSONB, e criar
`rubrica_ia` separada da cópia de divulgação.

**O plugin depende da parte 3.** Se a rubrica da IA for separada, o plugin gera duas coisas
diferentes — o anúncio e a rubrica — e não uma só.

### 5. ⛔ O defeito que precisa estar consertado antes de qualquer teste de qualidade

A EF `analise-candidato-individual` lê `descricao` e `requisitos`, **colunas que não existem**.
O erro é descartado, `vagaRubricBlock` vira string vazia, e a IA avalia candidato **sem
nenhum contexto da vaga**. 7 análises já rodaram assim. Detalhe completo na decisão acima.

---

## Como validar o plugin quando existir

1. Rodar sobre os **dois PDFs que já temos** (`~/Downloads/Descritivo_Cargo_SDR_*.pdf` e
   `Descritivo_Cargo_Social_Media_*.pdf`) e comparar com o que está hoje no banco — que foi
   transcrito à mão e revisado. É um gabarito.
2. **Olhar a página renderizada**, não só o SQL. Os dois defeitos de marca de hoje só
   apareceram assim.
3. Rodar `skill-analyzer` sobre a skill resultante.

---

## Ordem combinada com o operador (2026-08-23)

1. ✅ Legibilidade da página da vaga — **feito e no ar**
2. ⏸ Decisão de campos + rubrica — **decidida em documento, aguardando execução**
3. ⏸ **Este plugin** — outra conversa
4. ⏸ Dados de teste (currículos + respostas) para avaliar a qualidade das análises —
   ⚠ depende do defeito da seção 5 estar consertado, senão mede o modelo e não o sistema
5. ⏸ Terceira vaga **não publicada** para os testes de IA, para o funil real nascer limpo
