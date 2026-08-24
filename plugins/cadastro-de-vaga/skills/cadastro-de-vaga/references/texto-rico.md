# O contrato do `TextoRico`

`src/features/vagas/components/TextoRico.tsx` renderiza um subconjunto **deliberadamente
restrito** de markdown. Ele nunca produz HTML — constrói elementos React a partir dos tokens
que reconhece, e **tudo o que não reconhece vira texto literal na tela**.

Isso significa que emitir uma marca a mais não degrada bonito: aparece o asterisco.

## O que ele entende

| Marca | Vira | Observação |
|---|---|---|
| `## Título` a `#### Título` | subtítulo de seção (`<h4>`) | 2 a 4 `#`. Um `#` só **não** funciona |
| `- item` ou `* item` | lista com marcador | linhas consecutivas viram UMA lista |
| `1. item` ou `1) item` | lista numerada | respeita o número inicial |
| `**negrito**` | `<strong>` | |
| `*itálico*` | `<em>` | o caractere após o `*` não pode ser espaço |
| linha em branco | novo parágrafo | |

Linhas consecutivas sem marca são **juntadas num único parágrafo**, separadas por espaço. Se
você quer duas linhas visualmente separadas, precisa de uma linha em branco entre elas.

## O que ele NÃO entende — não emita

- `#` (um só) — nível de título fora da faixa 2-4
- `[texto](link)` — link vira texto literal, colchetes e parênteses inclusive
- `> citação`
- `` `código` `` e blocos ` ``` `
- `| tabela |`
- `---` régua horizontal
- `~~riscado~~`
- `***negrito e itálico***` — o parser casa `**` primeiro e sobra um `*` órfão
- HTML de qualquer tipo
- emoji não é marca e passa direto, mas evite: a página tem tipografia própria

## Duas armadilhas medidas nesta base

**1 · Marca certa em campo errado.** `**Contam pontos:**` apareceu literal na tela — não porque
a marca fosse inválida, mas porque o campo em que estava não passava pelo `TextoRico`. Antes de
usar markdown num campo, confira no [mapa-de-visibilidade](mapa-de-visibilidade.md) se aquele
campo é renderizado por ele. `descricao_curta` e `titulo` são texto puro.

**2 · O cabeçalho do componente está desatualizado.** A tabela no docblock do `TextoRico.tsx`
não lista itálico, mas o código o suporta (`comEnfase`, com a alternância `**` antes de `*`,
e a ordem importa). **O contrato é o que o código faz, não o que o comentário diz.** Se houver
dúvida, leia `comEnfase` e `emBlocos`.

## Marca órfã é segura, mas feia

Um `**` sem par cai fora das duas regexes e fica literal — o leitor vê o asterisco em vez de
perder o resto do texto dentro de um negrito que nunca fecha. É o comportamento certo, e ainda
assim é um defeito visível. O validador desta skill acusa asteriscos desemparelhados.

## Aceita `string` e `string[]`

O schema declara `text`, mas os mocks do repositório passam ARRAY em `responsabilidades`,
`diferenciais` e `beneficios`. O componente junta o array com linha em branco entre os itens.

**Emita `text`** — string única com `\n`. É o que as duas vagas reais têm, e uma forma só é
mais fácil de conferir que duas.

## Como um corpo bom se parece

Extraído da vaga real `social-media-producao-captacao-conteudo`, campo `responsabilidades`:

```markdown
**Produção e publicação.** Produzir Reels, carrosséis, estáticos e stories para os dois
perfis — com volume mínimo de 30 publicações por mês em cada perfil e stories diários.

**Captação.** Gravar com o Dr. Fernando em dia fixo da semana, cuidando de enquadramento,
luz, áudio e cenário.

### O ritmo da semana

A rotina roda em blocos fixos. É isso que garante que a captação e a análise aconteçam toda
semana — e não só quando sobra tempo.

- **Segunda · Pauta** — revisão do calendário da semana com a gestão.
- **Terça · Captação** — gravação com o Dr. Fernando e na clínica.
```

O padrão: **negrito como rótulo no início do parágrafo**, `###` para subseção dentro do campo,
lista para o que é enumerável, `·` como separador dentro do item. Sem links, sem tabelas.

## Conferência final

Marcas válidas não bastam — só a tela prova. Depois de aplicar, abra `/vagas/<slug>` e procure
por asterisco, `#` e colchete literais. Os dois defeitos desta base só apareceram assim.
