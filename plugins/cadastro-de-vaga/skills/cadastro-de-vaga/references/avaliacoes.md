# As avaliações da vaga — SJT, caso aberto, redação, cognitivo

> Escrito em 2026-10-12, depois de montar as três vagas do squad de Marketing. **Nenhuma das
> outras referências cobria isto**, e foi onde apareceram os defeitos mais caros: instrumentos
> com banco vazio, dimensões sem critério e um gabarito que viajava no payload.

A vaga declara seus instrumentos em `testes_aplicaveis` (jsonb) e os pesos em
`pesos_avaliacao`. Sem os dois, `publish_vaga` recusa publicar.

| Instrumento | Onde o candidato faz | Pontuado por | Tem peso? |
|---|---|---|---|
| `triagem` | — (lê currículo + Etapa 1) | `analise-candidato-individual` | sim |
| `work_sample_sjt` — múltipla escolha | `/candidato/avaliacao/:id/mc` | `pontuar_sjt` (servidor) | sim |
| `work_sample_sjt` — **caso aberto** | `/candidato/avaliacao/:id/caso` | `avaliar-redacao` (IA) | sim |
| `redacao_cultural` | `/candidato/redacao/:id` | `avaliar-redacao` | sim |
| `big_five` | `/candidato/avaliacao/:id/bigfive` | — | **não** — contexto, com devolutiva ao candidato |
| `cognitivo` | `/candidato/prova-cognitiva/:id` | — | **não** |
| `entrevista` | presencial/online | o RH | sim |

As 4 chaves de `pesos_avaliacao` — `triagem`, `work_sample_sjt`, `redacao_cultural`,
`entrevista` — **precisam somar exatamente 100**, inteiros. Big Five e cognitivo não entram.

---

## ⚠ 1 · `publish_vaga` não confere se o banco do cargo tem itens

Este é o defeito mais caro desta família, e ele publica **verde**.

`testes_aplicaveis` aponta o SJT para um `cargo`, e os itens vivem em `public.perguntas`
(`tipo='sjt'`, `status='active'`). A RPC exige ≥1 teste obrigatório — **e não olha se existe
item para aquele cargo.** Resultado medido em 2026-09: a vaga de Social Media no ar apontava
para `sdr-social-seller`, um banco de **1 item com cenário de vendas**, com `obrigatorio: true`
e **peso 35**. O candidato de conteúdo respondia uma pergunta de SDR, e aquilo virava 35% do
score — um número que PARECE avaliação.

**Antes de publicar, conte:**

```bash
node p46apply.cjs sql "select p.cargo, p.formato, count(*) from public.perguntas p
  where p.status='active' group by p.cargo, p.formato order by p.cargo"
```

E pergunte: **o banco sustenta a medida que o peso promete?** Um cargo com 1 item dá placar
máximo 4; o corte de 60% cai em 2,4, e uma única escolha move o candidato de faixa.

⚠ **Varra `status`-agnóstico.** Vaga `inativa` apontando para banco raso reproduz o defeito no
dia em que alguém republicar. Filtrar por `status='ativa'` é a «fotografia» do CLAUDE.md.

---

## 2 · Múltipla escolha — três armadilhas de autoria

**(a) A ordem NÃO é a exibição, e nunca foi o gabarito.** `get_opcoes_sjt` é SECURITY DEFINER,
projeta só `opcao_id` + `opcao_texto` (nunca `peso` nem `tag`), com `ORDER BY random()`; a tela
ainda embaralha de novo (Fisher-Yates por sessão). A chave fica no servidor.

⚠ **Mas o `ordem` gravado importa.** Até 2026-10-11 todo item nascia com `ordem 1 = a certa`, e
o banco semeado em junho tinha `opcao_id` feitos à mão **cujo sufixo era a ordem** — e o
`opcao_id` É entregue ao candidato. O gabarito viajava no payload. Hoje a `ordem` é permutação
determinística semeada pelo `content_hash`, e os `opcao_id` são `gen_random_uuid()`. **Emita
sempre uuid v4 em `opcao_id`, e não deixe a certa sempre em `ordem 1`.**

**(b) Comprimento é pista, e embaralhar não resolve.** Medido: 16 de 18 itens nasceram com a
alternativa certa >35% mais longa que a média das erradas — uma delas 2,85×. Candidato treinado
em prova aprende que «a mais completa costuma ser a certa», e o item passa a medir traquejo em
teste, não julgamento. **Critério conferível:** a `fortemente_pontua` não pode ser a mais longa
em mais de 2 de 6 itens por cargo (`scripts/geradores/tabela-comprimento-sjt.py` mede).
Encurte a certa — inflar as erradas vira caricatura e fica fácil de descartar por outro motivo.

**(c) A opção errada tem de ser plausível.** A `atencao` é o que uma pessoa competente e
bem-intencionada faria sob pressão. Opção errada óbvia não discrimina ninguém.

⚠ **E o banco não pode se contradizer.** Um item premiou «não gravar o momento» enquanto outro,
dois adiante, premiava «captar na hora porque a cena não se repete». O banco cobrava duas
coisas opostas do mesmo profissional. Releia os 6 itens juntos antes de emitir.

---

## 3 · O caso aberto — o que a referência da rubrica não diz

**Limites da tela:** entre **200 e 500 palavras**, com contador
(`SjtCasoAbertoScreen.tsx:69-70`). O texto fixo da tela diz *«Descreva como você lidaria com a
situação acima»* — se o seu enunciado pedir outra coisa, há atrito, e mudá-lo é código.

**O RH consegue ler a resposta** — em `ScorecardAvaliacao` e no painel de decisão final, por um
botão «Ler a resposta do caso aberto». É leitura sob demanda, sem cache, renderizada como nó de
texto. **Isso abre um padrão útil: o caso aberto serve de contêiner do teste prático** — o
candidato sobe o trabalho num Drive dele, cola o link e explica o raciocínio. É a única casa que
o sistema oferece hoje para um teste prático.

### ⚠ As dimensões precisam de critério, ou são julgadas pelo NOME

`perguntas.rubric.dimensoes` dá a chave e o peso. O **rótulo, o inclusion e o exclusion** vêm de
`supabase/functions/_shared/sjt-rubrica.ts`, indexados pela mesma chave. Uma chave ausente do
catálogo **não quebra** — o bloco diz honestamente «esta dimensão não tem critérios catalogados;
avalie pelo sentido da própria chave» — mas aí a dimensão vira o que o modelo achar que o nome
dela significa, e sai nota 0-25 com banda sem régua por trás.

**Medido em 2026-10-12:** o catálogo conhece 5 dimensões, **todas do cargo `dentista`**. As 15
dos cargos de marketing e as 5 do pré-vendas estavam fora.

**Não escreva âncoras 1-5.** `REGRA_NIVEIS_SJT` já converte:
*5 = todos os inclusion, nenhum exclusion · 4 = maioria, nenhum crítico · 3 = metade + 1 menor ·
2 = poucos + 2 ou mais · 1 = inclusion ausente OU 1 crítico*. Por isso as cinco do dentista têm
`ancoras: null`, e as suas devem ter também — preencher com âncoras de outra taxonomia é a falsa
atribuição que aquele arquivo existe para evitar.

**Escreva inclusion e exclusion em critérios DISCRETOS e contáveis** — senão «metade dos
inclusion» não significa nada — e marque cada exclusion como **crítico** ou *menor*.

⚠ `dimensao_clinica` existe para o catálogo clínico do dentista. Cargo não clínico não tem uma;
preencher com algo parecido é invenção. `template_bars` é `null` salvo reuso declarado.

⚠ **A IA não abre link nem assiste vídeo.** Se o caso aberto virar contêiner de teste prático,
a rubrica TEM de dizer: *pontue apenas o texto; nunca desconte pelo que não pôde verificar.* Sem
isso o modelo inventa juízo sobre uma peça que nunca viu, bem formatado. **Exceção:** quando a
entrega é texto no próprio campo, o modelo VÊ a peça — e aí a rubrica muda.

---

## 4 · Redação cultural

Banco em `public.perguntas_redacao`, 11 enunciados ativos, referenciados por `codigo` dentro do
elemento: `{ teste: 'redacao_cultural', obrigatorio: true, codigos: ['F1'] }`.

| código | para quem | tema |
|---|---|---|
| `PADRAO_BS` | genérica (`is_padrao`) | cuidar de alguém em momento de fragilidade |
| `D1`–`D3` | dentista | abordagem clínica, estudo por iniciativa, conflito meta × paciente |
| `R1`–`R3` | recepção | atitude de dono, experiência UAU, sede de crescimento |
| `C1`–`C3` | coordenação | melhoria de processo, feedback duro, decisão sob pressão |
| `F1` | freelancer / PJ | a tese «sem dor, sem trauma, com laser» da clínica |

Editor exige **200 a 500 palavras**. Antes de somar uma segunda redação, pergunte se ela não
mede o mesmo que outro instrumento já mede melhor.

---

## 5 · Cognitivo — dois instrumentos, e eles estão invertidos

| | banco | o candidato alcança? |
|---|---|---|
| Prova textual — é o que `aplica_cognitivo` liga | **0 itens** em `cognitivo_itens` | sim, e abre tela vazia |
| Matrizes de Raven | **60** em `questoes_raven` | sim, desde a Phase 51 — card no painel |

**Não ligue `aplica_cognitivo`** sem antes contar `cognitivo_itens`. O Raven não passa por ele:
a liberação é **nominal, por candidatura**, em `cognitivo_liberacao`, feita pelo RH pessoa a
pessoa. São tabelas, telas e gates diferentes — e os nomes na tela do RH são parecidos o
bastante para confundir (JORN-48).

---

## 6 · Tabelas dormentes — não é esquecimento

- **`perguntas_cultura`** — fit cultural **por vaga** (`vaga_id`). **0 itens** em todo o sistema,
  e lida em `src/` apenas pela feature de privacidade. Nenhuma tela de candidato chega nela.
- **`cognitivo_itens`** — ver acima.

---

## 7 · O que o RH NÃO vê (e muda o que vale a pena perguntar)

`respostas_formulario` — as respostas da **Etapa 1** — é lida em `src/` **apenas** por
`features/privacidade` (export do titular e recibo de exclusão). **Nenhuma tela de RH a mostra.**
Hoje o único humano que lê o portfólio que o candidato colou é o **próprio candidato**,
exportando os próprios dados. Spec em `docs/specs/SPEC-VISRH-04-portfolio-visivel-rh.md`, não
construída.

Consequência ao desenhar: se a vaga depende de portfólio, **a triagem por IA o recebe, o RH
não.** Planeje a operação sabendo disso.

---

## 8 · Não existe avanço automático de etapa

O trigger `avancar_etapa` só dispara num `UPDATE` de `candidaturas.etapa_atual`, e esse update é
ato humano com ator registrado — a feature é explícita: o avanço acontece «quando RH aprova
candidato para próxima fase».

**É isso que torna aceitável pôr um teste caro no assíncrono.** Ninguém entra sozinho. Mas a
proteção depende do uso: aprovar em lote transforma horas de trabalho sério em horas
desperdiçadas — da pessoa, não da clínica. Se o desenho da vaga depende desse portão, **escreva
isso no documento da vaga**, porque o mecanismo não ensina o uso.
