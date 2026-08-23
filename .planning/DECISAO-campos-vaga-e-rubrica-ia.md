# Decisão — estrutura de campos da vaga, e a rubrica que a IA lê

**Aberto em:** 2026-08-23
**Origem:** ao reformatar as duas vagas reais, sete seções dos PDFs não couberam em campo
nenhum. Ao investigar quais campos a IA consome, apareceu um defeito bem maior.

---

## ⛔ ACHADO — a IA analisa candidato SEM NENHUM contexto da vaga

`supabase/functions/analise-candidato-individual/index.ts:191-195`:

```js
const { data: vaga } = await supabaseAdmin
  .from("vagas")
  .select("id, titulo, descricao, requisitos")   // ⛔ `descricao` e `requisitos` NÃO EXISTEM
  .eq("id", vaga_id)
  .maybeSingle();
```

E em `:244-246`:

```js
const vagaRubricBlock = vaga
  ? `Vaga: ${vaga.titulo ?? ""}\n${vaga.descricao ?? ""}\nRequisitos: ${vaga.requisitos ?? ""}`
  : "";                                           // ⛔ vira STRING VAZIA
```

**Medido em PROD (2026-08-23):**

| Fato | Valor |
|---|---|
| `public.vagas` tem coluna `descricao` | **não** |
| `public.vagas` tem coluna `requisitos` | **não** |
| Linhas em `analise_candidato_vaga` | **7** |
| Última análise | 2026-08-22 01:35 |

O PostgREST devolve **400** para coluna inexistente. O `error` **não é desestruturado** —
`const { data: vaga }` descarta o erro. Logo `vaga` é `null`, o ternário cai no `else`, e
`vagaRubricBlock` é **string vazia**.

**Consequência:** as 7 análises que já rodaram avaliaram currículos **contra o vazio**. Sem
título, sem descrição, sem requisitos. E a falha é **silenciosa** — sem log, sem flag, sem
nada na tela que denuncie.

⚠ Isto é pré-requisito do teste de qualidade das análises (item 3 da lista do operador).
Testar a qualidade antes de consertar isto mede o modelo, não o sistema.

**Origem provável:** o schema já teve `descricao`/`requisitos` sem sufixo, e a Phase 4
registrou isso como «Pitfall 1 — legacy field sem sufixo não existe no schema» no
`VagaDetalhePage`. A página foi corrigida; a Edge Function **não**.

**Varrer pela FORMA, não pelo sintoma:** procurar TODA referência a coluna por nome nas
Edge Functions e conferir contra `information_schema`. Um `select()` com coluna fantasma
falha em silêncio sempre que o `error` é descartado.

---

## A decisão de estrutura

### O que não coube (medido ao transcrever os dois PDFs)

| Seção do PDF | Onde teve que caber |
|---|---|
| Indicadores de desempenho (metas) | dentro de `perfil_ideal` |
| Rotina em blocos de tempo | dentro de `responsabilidades` |
| Plano de evolução da carreira | dentro de `diferenciais` |
| Remuneração detalhada | dentro de `beneficios` |
| Ferramentas | dentro de `requisitos_tecnicos` |
| «O que essa vaga NÃO é» | **nenhum** |
| Processo seletivo (teste prático) | **nenhum** |

### Recomendação — três partes, e a terceira é a que importa

**1. Consertar as colunas fantasma.** Não é decisão de desenho, é defeito. A EF passa a ler
os campos que existem.

**2. Uma coluna `secoes_extras` JSONB**, lista ordenada de `{titulo, conteudo}` — e **não**
sete colunas novas. Razões:

- O próximo descritivo terá uma seção que nenhuma das sete cobre. Isso já aconteceu **duas
  vezes hoje**, com os dois únicos PDFs que existem.
- A página renderiza genericamente, em ordem, com o `TextoRico` que já existe.
- Uma migration em vez de sete, e o formulário ganha «adicionar seção» em vez de sete campos
  fixos que quase nunca se preenchem todos.

**3. Uma coluna `rubrica_ia` TEXT — separada da cópia de divulgação.** Esta é a parte que eu
defendo com mais convicção, e é contraintuitiva:

> **O texto que atrai candidato e o texto que avalia candidato têm propósitos opostos, e
> não devem ser o mesmo texto.**

A cópia de divulgação é escrita para vender a vaga: fala de trilha de carreira, de acesso ao
especialista, de Gympass. Uma rubrica de avaliação é escrita para **discriminar com justiça**:
o que conta como evidência de que a pessoa faz o trabalho.

Alimentar a IA com a cópia de marketing é como pedir que ela avalie candidato contra um
anúncio. Pior: enfia na rubrica sinais que **não deveriam** pesar — «operação enxuta»,
«ambição saudável», «desenvoltura com pessoas» — e é exatamente por aí que viés entra sem
ninguém decidir que entraria.

Com `rubrica_ia` separada:

- ela é **deliberada** — alguém escreveu o que conta e o que não conta;
- ela é **auditável** — dá para ler a rubrica de uma vaga e discutir se é justa, sem
  garimpar num texto de divulgação;
- ela é **versionável** — muda sem mexer no que o candidato lê;
- e ela conversa com a **RNF-07a** deste projeto («o sistema NUNCA rejeita candidato
  automaticamente por score»): se o score nunca decide sozinho, a rubrica que o gera precisa
  ser legível por humano.

O plugin gera uma proposta de rubrica a partir do descritivo, **e um humano aprova** — que é
o mesmo padrão de todo o resto deste sistema.

### O que fica de fora, deliberadamente

Não promover `indicadores_desempenho` nem `ferramentas` a colunas próprias. Eles entram como
seções extras para exibição, e o que deles precisa pesar na avaliação entra na `rubrica_ia`,
por decisão de quem escreve a rubrica — não por acidente de estrutura.

---

## Estado de decisão

| Parte | Estado |
|---|---|
| 1 · Consertar colunas fantasma na EF | ⏸ **decidido, não executado** |
| 2 · `secoes_extras` JSONB | ⏸ **proposto, aguardando o operador** |
| 3 · `rubrica_ia` separada da cópia | ⏸ **proposto, aguardando o operador** |
