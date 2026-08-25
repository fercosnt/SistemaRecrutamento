# As perguntas da Etapa 1

As perguntas moram em `perguntas_formulario`. **Não** em `vagas.qualificacao_etapa1` — esse
jsonb é um *snapshot derivado*, escrito pelo próprio `publish_vaga` a partir das perguntas
reais. Escrever nele à mão preenche um campo que será sobrescrito.

## Os limites do servidor — ignorá-los quebra a publicação

`publish_vaga` (a RPC que faz `rascunho → ativa`) recusa a publicação se:

| Regra | Erro |
|---|---|
| mais de **10 perguntas** | `A Etapa 1 pode ter no maximo 10 perguntas` |
| mais de **1 pergunta aberta** (`texto_curto` ou `texto_longo`) | `A Etapa 1 pode ter no maximo 1 pergunta aberta` |
| pergunta com opção `knockout` que não seja `obrigatoria` | `Toda pergunta com opcao eliminatoria precisa ser obrigatoria` |
| `pesos_avaliacao` não somar 100 | `Os pesos de avaliacao precisam somar 100%` |
| nenhum teste obrigatório em `testes_aplicaveis` | `Selecione ao menos um teste obrigatorio` |

⚠ A contagem de perguntas **não filtra `deleted_at`**. Perguntas soft-deletadas continuam
contando para o teto de 10. Se uma vaga já teve perguntas removidas, confira o total bruto:

```bash
node p46apply.cjs sql "select count(*) from public.perguntas_formulario where vaga_id = '<id>'"
```

## A restrição que muda como se escreve a pergunta

**A pergunta nunca chega ao prompt da IA — só a resposta.** `buildRespostasBlock`
(`analise-candidato-individual/index.ts:114`) monta apenas o texto da resposta; o `pergunta_id`
é selecionado e nunca usado. O modelo recebe:

```
## Respostas Etapa 1
- Sim
- 3 anos
```

…sem saber o que foi perguntado.

### ⚠ E nem sequer NA ORDEM — medido em 2026-08-24

A consulta que alimenta esse bloco (`index.ts:186`) **não tem `.order()`**:

```ts
.from("respostas_formulario")
.select("pergunta_id, resposta_texto, resposta_numerica, resposta_opcoes")
.eq("candidatura_id", candidatura_id)
```

Sem `ORDER BY`, o Postgres não promete ordem nenhuma. Então o modelo recebe uma lista **solta e
embaralhada**, sem enunciados. A consequência é mais dura que a anterior: não basta a opção ser
autoexplicativa — ela precisa ser **autoidentificável fora de contexto**. "3 anos" pode ser
tempo de experiência, tempo de casa ou prazo de disponibilidade, e o modelo não tem como saber
qual.

Duas obrigações vêm daí, e a segunda é a que se esquece:

1. cada opção carrega o próprio assunto ("Entre 1 e 2 anos **produzindo conteúdo para Instagram
   e/ou TikTok**", não "1 a 2 anos");
2. a **rubrica** manda o modelo identificar cada resposta pelo CONTEÚDO, nunca pela posição —
   ver [rubrica-ia.md](rubrica-ia.md). Sem esse bloco, o modelo tenta ler por ordem e erra em
   silêncio, com saída perfeitamente bem formada.

Combinado com o teto de **1 pergunta aberta**, isso dita o desenho:

- **A única pergunta aberta é a mais valiosa** — normalmente a que coleta algo que o currículo
  não traz (link de portfólio, por exemplo).
- **Todas as outras são `single_choice`, `multiple_choice` ou `numerico`** — e as *opções* têm
  de ser autoexplicativas, porque a opção escolhida é tudo que o modelo lê.

Opções ruins, porque a resposta sozinha não diz nada:

```
"Você tem disponibilidade integral?"  →  ["Sim", "Não"]
```

Opções boas, porque a resposta se explica:

```
"Qual é a sua disponibilidade para esta vaga?"
→ ["Tenho disponibilidade integral e presencial, de segunda a sexta",
   "Tenho disponibilidade parcial ou apenas alguns dias",
   "Só tenho disponibilidade para trabalho remoto"]
```

Custa mais caracteres e resolve o problema hoje, sem depender do conserto da Edge Function.

Numérico tem o mesmo cuidado: `"Quantos anos de experiência com produção de conteúdo para
Instagram?"` chega como `- 3`. Use `valor_minimo`/`valor_maximo` para dar contorno, e não
dependa da unidade estar clara — prefira `single_choice` com faixas nomeadas quando a unidade
importa.

## Blocos

`bloco` é um CHECK fechado. Só estes quatro:

| Bloco | Para |
|---|---|
| `jornada` | disponibilidade, turno, deslocamento, início |
| `tecnologia` | ferramentas, sistemas, domínio técnico |
| `valores` | motivação, alinhamento, "por que aqui" |
| `curriculo` | experiência, portfólio, formação |

Não há bloco "triagem" nem "cultura" — o formulário do RH usa esses dois nomes internamente e
eles **não passam no CHECK**.

## Tipos de resposta

`texto_curto` · `texto_longo` · `single_choice` · `multiple_choice` · `numerico`

- Os dois `*_choice` **exigem** `opcoes_resposta`: array jsonb de strings, não-vazio. É CHECK
  de banco.
- `texto_curto` aceita `limite_caracteres` (as perguntas existentes usam 500).
- `numerico` aceita `valor_minimo` / `valor_maximo`.

## Ordem

`ordem` tem CHECK `>= 1`. Não existe índice único, então nada impede duplicata — mantenha
única por vaga, contando de 1, na sequência em que o candidato vai responder. As perguntas
existentes numeram global por vaga (1, 2, 3), atravessando blocos.

## Knockout — não use sem decisão humana explícita

Uma opção pode ser marcada com `tag = 'knockout'` em `pergunta_opcao_metadata`, e aí
`submit_candidatura_atomic` **rejeita a candidatura na hora da inscrição**, gravando
`motivo_rejeicao = 'knockout_automatico'`.

Isso não viola a RNF-07a (que proíbe rejeição automática **por score**) — é critério objetivo
e auditável. Mas é rejeição automática de gente, e a skill **não deve criar knockout por
iniciativa própria**. Proponha ao operador, explique o efeito, e só marque com aprovação
explícita.

### ⚠ A RPC oficial não serve no caminho desta skill — medido em 2026-08-24

`upsert_pergunta_opcoes_metadata` é a via oficial, e ela **recusa duas vezes** o que esta skill
faz:

1. `IF v_status <> 'rascunho' THEN RAISE EXCEPTION` — ela só edita opções de vaga em rascunho, e
   o alvo típico deste modo é uma vaga **ativa**;
2. ela lê `auth.jwt()` para exigir role `rh`/`administrador` — e a via de apply (Management API)
   não carrega JWT nenhum, então o papel resolve para NULL e sai `forbidden`.

Despublicar a vaga para contornar é **porta de mão única**: `publish_vaga` só a devolve ao ar se
os pesos somarem 100 e houver teste obrigatório.

A saída, quando o operador aprova o knockout: a migration escreve **direto** em
`pergunta_opcao_metadata`, com `gen_random_uuid()` no `opcao_id`. Funciona porque o sweep de
`submit_candidatura_atomic` casa por **TEXTO**, não por id:

```sql
AND r.resposta_opcoes @> to_jsonb(m.opcao_texto)
```

E é justamente por isso que a migration **tem de** terminar com uma guarda que conte quantas
opções casam e aborte se faltar alguma. Um único caractere de diferença entre `opcoes_resposta`
e `opcao_texto` deixa o knockout verde, silencioso e inerte — que é pior que não tê-lo.

## Quantas perguntas

As duas vagas de teste arquivadas têm 3 cada. Três a cinco é uma boa faixa: cada pergunta é
atrito na inscrição, e o teto útil é 10 com 1 aberta.

Sempre confira: **tudo que o anúncio pede tem um campo que colete?** A vaga de Social Media
prometia que o portfólio era "OBRIGATÓRIO na inscrição" sem que existisse campo nenhum para
informá-lo, e a rubrica precisou blindar o candidato contra essa falha do sistema. Em
2026-08-24 a pergunta foi criada e a blindagem, invertida.

⚠ **A lição que fica é a do PAR.** Criar o campo sem revisar a rubrica deixaria a IA instruída a
perdoar a ausência de algo que passou a ser obrigatório — ela continuaria absolvendo uma falha
que deixou de existir. Sempre que uma pergunta nova passar a coletar algo que a rubrica
desculpava, **as duas mudam juntas, no mesmo arquivo**.

## Gabarito

Perguntas reais de uma vaga de teste, com a forma correta:

| bloco | ordem | tipo | pergunta | opções |
|---|---|---|---|---|
| `valores` | 1 | `texto_curto` (limite 500) | Por que você quer trabalhar na Beauty Smile? | — |
| `jornada` | 2 | `single_choice` | Qual sua disponibilidade para iniciar? | Imediata · Em até 15 dias · Em até 30 dias · Mais de 30 dias |
| `curriculo` | 3 | `numerico` | Quantos anos de experiência você tem na área administrativa? | — |

⚠ As 6 perguntas existentes têm `created_by` **nulo** — a mesma doença que motivou esta skill.
As que a skill criar preenchem o autor.
