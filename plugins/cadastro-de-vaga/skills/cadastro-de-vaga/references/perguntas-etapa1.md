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

…sem saber o que foi perguntado. Combinado com o teto de **1 pergunta aberta**, isso dita o
desenho:

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
explícita. A migration desta skill não escreve em `pergunta_opcao_metadata`; a marcação de tags
tem RPC própria (`upsert_pergunta_opcoes_metadata`).

## Quantas perguntas

As duas vagas de teste arquivadas têm 3 cada. Três a cinco é uma boa faixa: cada pergunta é
atrito na inscrição, e o teto útil é 10 com 1 aberta.

Sempre confira: **tudo que o anúncio pede tem um campo que colete?** A vaga de Social Media
promete que o portfólio é "OBRIGATÓRIO na inscrição" e não existe campo que o colete — foi
preciso blindar o candidato na rubrica. Criar a pergunta é a correção de verdade.

## Gabarito

Perguntas reais de uma vaga de teste, com a forma correta:

| bloco | ordem | tipo | pergunta | opções |
|---|---|---|---|---|
| `valores` | 1 | `texto_curto` (limite 500) | Por que você quer trabalhar na Beauty Smile? | — |
| `jornada` | 2 | `single_choice` | Qual sua disponibilidade para iniciar? | Imediata · Em até 15 dias · Em até 30 dias · Mais de 30 dias |
| `curriculo` | 3 | `numerico` | Quantos anos de experiência você tem na área administrativa? | — |

⚠ As 6 perguntas existentes têm `created_by` **nulo** — a mesma doença que motivou esta skill.
As que a skill criar preenchem o autor.
