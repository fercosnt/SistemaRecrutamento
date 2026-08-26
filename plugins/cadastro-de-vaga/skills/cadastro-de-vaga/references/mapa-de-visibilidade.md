# Mapa de visibilidade — quem lê cada coluna de `vagas`

Medido no repositório, não suposto. Se o app mudou desde então, **remeça** com o método do
fim deste arquivo em vez de confiar na tabela.

## As três audiências

Uma coluna de `vagas` pode ser lida por até três públicos, e a maioria não é lida por nenhum:

1. **O candidato** — via `VagaDetalhePage`, que é a única página pública da vaga.
2. **A IA** — via a Edge Function `analise-candidato-individual`, que faz um `select` fechado.
3. **O RH** — via `CriarEditarVagaPage`, o formulário interno.

## A tabela

| Coluna | Candidato | Markdown | IA | RH |
|---|---|---|---|---|
| `titulo` | ✅ | ❌ | ✅ | ✅ |
| `slug` | ✅ (na URL) | — | ❌ | ⚠ campo existe, **não persiste** |
| `descricao_curta` | ✅ | ❌ **texto puro** | ⚠ só fallback | ⚠ campo existe, **não persiste** |
| `sobre_cargo` | ✅ | ✅ | ⚠ só fallback | ❌ |
| `responsabilidades` | ✅ | ✅ | ❌ | ✅ |
| `requisitos_formacao` | ✅ | ✅ | ⚠ só fallback | ✅ |
| `requisitos_experiencia` | ✅ | ✅ | ⚠ só fallback | ✅ |
| `requisitos_tecnicos` | ✅ | ✅ | ⚠ só fallback | ✅ |
| `requisitos_habilidades` | ✅ | ✅ | ⚠ só fallback | ✅ |
| `diferenciais` | ✅ | ✅ | ❌ | ✅ |
| `beneficios` | ✅ | ✅ | ❌ | ❌ |
| `rubrica_ia` | ❌ | — | ✅ | ❌ |
| `departamento` | ✅ nas duas telas | ❌ | ❌ | ✅ |
| `modelo_trabalho` | ✅ nas duas telas | ❌ | ❌ | ⚠ campo existe, **não persiste** |
| `cidade` · `estado` | ⚠ **só na listagem** | ❌ | ❌ | ✅ |
| `jornada_trabalho` | ❌ **nada renderiza** | — | ❌ | ✅ |
| `tipo_contrato` | ❌ **nada renderiza** | — | ❌ | ⚠ campo existe, **não persiste** |
| `subtitulo` | ✅ 2026-08-25 | ❌ texto puro | ❌ | ❌ |
| `sobre_empresa` | ✅ 2026-08-25 | ✅ | ❌ | ❌ |
| `perfil_ideal` | ❌ | — | ❌ | ✅ |
| `secoes_extras` | ✅ 2026-08-25 | ✅ | ❌ | ❌ |
| `faixa_salarial_min` / `max` | ❌ | — | ❌ | ✅ |
| `exibir_salario` | ❌ nada consulta | — | ❌ | ❌ |
| `endereco_completo` · `data_abertura` · `data_fechamento` · `total_vagas` | ❌ | — | ❌ | ❌ |
| `prompt_ia_descricao` | ❌ | — | ❌ | ❌ |
| `qualificacao_etapa1` | ❌ *snapshot* do `publish_vaga` | — | ❌ | ❌ |

⚠ **As duas telas públicas não mostram o mesmo conjunto.** A listagem (`VagasPublicasPage`)
mostra `cidade`/`estado`; a página da vaga (`VagaDetalhePage`) **não**. Quem chega por link
direto na vaga não vê a cidade em lugar nenhum. E nem a listagem nem a página mostram
`jornada_trabalho`, `tipo_contrato` ou `endereco_completo` — se a vaga é presencial com horário
fixo, isso precisa estar escrito no corpo de `sobre_cargo`.

## O que a IA vê, exatamente

Duas camadas, e a segunda é a que surpreende.

**Camada 1 — o `select` da Edge Function** é fechado:

```
id, titulo, rubrica_ia, descricao_curta, sobre_cargo,
requisitos_formacao, requisitos_experiencia, requisitos_tecnicos, requisitos_habilidades
```

`responsabilidades`, `diferenciais`, `beneficios` e `perfil_ideal` nem são lidos do banco.

**Camada 2 — o que vira prompt é um ternário** (`analise-candidato-individual/index.ts:288-292`):

```ts
const vagaRubricBlock = !vaga
  ? ""
  : rubricaDeliberada
    ? `Vaga: ${vaga.titulo}\n\n## Rubrica de avaliação\n${rubricaDeliberada}`
    : `Vaga: ${vaga.titulo}\n${vaga.descricao_curta}\n${vaga.sobre_cargo}\n\nRequisitos:\n…`;
```

⛔ **Com rubrica, o modelo recebe o título e a rubrica — e mais nada da vaga.** Os
`requisitos_*` e o `sobre_cargo` só entram no ramo de **fallback**, que existe para as vagas
anteriores à criação da coluna.

Isso é deliberado e está certo: a cópia que ATRAI não deve virar critério. Mas tem uma
consequência dura para quem escreve a rubrica — **ela precisa ser autossuficiente**. Uma
rubrica que diz "conforme os requisitos técnicos da vaga" aponta para um texto que o modelo
nunca vê. As duas rubricas em produção acertam isso: repetem "Ensino médio completo", "1 ano
de experiência em atendimento" dentro do próprio corpo.

Como conferir qual ramo uma vaga está pegando: a Edge Function acende
`vaga_sem_rubrica_deliberada` nos flags da análise quando cai no fallback, e `vaga_sem_rubrica`
quando a consulta falha. Os dois são mutuamente exclusivos.

⚠ Um `select` com coluna inexistente devolve 400 e, se o `error` for descartado, some em
silêncio. Foi assim que sete análises rodaram sem contexto nenhum de vaga. Ao acrescentar
coluna a essa lista, confira contra o `information_schema`.

## As duas colunas «não persiste»

`CriarEditarVagaPage` tem campo editável para `slug`, `tipo_contrato`, `modelo_trabalho` e
`descricao_curta`, mas `updateVagaBase` (`src/features/config-vaga/services/configVagaService.ts`)
**não escreve nenhum dos quatro**. Editar pela tela mostra toast de sucesso e não persiste.

Enquanto isso não for consertado: mudança nesses quatro campos precisa de migration, igual à
criação.

## Como remedir

Três comandos. Rode-os quando desconfiar que a tabela envelheceu:

```bash
# 1. quais campos cada tela pública renderiza — sao DUAS, e nao mostram o mesmo
grep -o "vaga\.[a-z_]*" src/components/pages/VagaDetalhePage.tsx   | sort -u
grep -o "vaga\.[a-z_]*" src/components/pages/VagasPublicasPage.tsx | sort -u
grep -n "TextoRico texto=" src/components/pages/VagaDetalhePage.tsx   # quais aceitam markdown

# 2. o que a IA enxerga (o select fechado)
grep -n -A3 'from("vagas")' supabase/functions/analise-candidato-individual/index.ts

# 3. o que o formulário do RH de fato grava
grep -n -A25 "export async function updateVagaBase" src/features/config-vaga/services/configVagaService.ts
```

Para varrer a família inteira de uma vez — colunas que ninguém lê:

```bash
for c in $(node p46apply.cjs sql "select column_name from information_schema.columns where table_schema='public' and table_name='vagas'" | grep -o '"[a-z_]*"$' | tr -d '"'); do
  n=$(grep -rl "$c" src supabase/functions 2>/dev/null | grep -v "__tests__\|\.test\.\|database.types" | wc -l | tr -d ' ')
  [ "$n" = "0" ] && echo "sem leitor: $c"
done
```

Isto é a mesma lição que esta base já aprendeu duas vezes: **varra pela forma, não pelo
sintoma.** Achar um campo write-only não responde "está consertado?" — responde "onde mais
existe um campo que ninguém lê?".

## ⚠ Remedido em 2026-08-25

`subtitulo`, `sobre_empresa` e `secoes_extras` **passaram a ser renderizados** em
`VagaDetalhePage`: o subtítulo abaixo do título (texto puro), a seção "Sobre a Beauty Smile" e
os blocos livres no fim da página, os dois últimos pelo TextoRico.

`perfil_ideal` **continua sem tela** — é o único dos quatro que ficou de fora.

A lição do método, que vale mais que a tabela: esta tabela é uma **fotografia**, e fotografia
envelhece. Ela esteve certa por meses e ficou errada num dia de trabalho de frontend. Antes de
decidir em que campo um conteúdo vai, remeça com o método acima em vez de confiar na linha.
