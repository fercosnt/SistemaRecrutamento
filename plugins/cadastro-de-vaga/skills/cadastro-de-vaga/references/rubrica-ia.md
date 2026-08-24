# A rubrica de avaliação (`rubrica_ia`)

A rubrica é o único artefato desta skill que decide sobre **pessoas**. O resto é cópia.

Ela existe porque o texto que **atrai** candidato e o texto que **avalia** candidato têm
propósitos opostos. Sem rubrica, a Edge Function cai no fallback e usa a cópia de divulgação
como critério — e aí "operação enxuta", "ambição saudável" e "trilha de carreira" viram sinal
de avaliação. Descrevem a empresa, não o candidato. É por aí que viés entra sem que ninguém
tenha decidido que entraria.

## ⛔ A rubrica é tudo que o modelo vê da vaga

Quando `rubrica_ia` está preenchida, a Edge Function monta o bloco da vaga como
`Vaga: <titulo>` + a rubrica, **e nada mais**. `sobre_cargo` e os `requisitos_*` só entram no
ramo de fallback, para vagas sem rubrica.

Portanto: **nunca aponte para fora**. "Conforme os requisitos da vaga", "veja o descritivo",
"os conhecimentos técnicos listados" — tudo isso aponta para um texto que o modelo não recebe.
Todo requisito que precisa pesar tem de estar **escrito por extenso dentro da rubrica**, mesmo
que já esteja no anúncio. As duas rubricas em produção repetem "Ensino médio completo" e "1 ano
de experiência em atendimento" justamente por isso.

## As duas rubricas em produção são o gabarito

Leia-as antes de escrever uma nova:

```bash
node p46apply.cjs sql "select slug, rubrica_ia from public.vagas where rubrica_ia is not null"
```

Foram escritas e revisadas com o operador. Um exemplo completo está no fim deste arquivo.

## A estrutura, em três blocos

```
## Requisitos eliminatórios
## Competências críticas (avalie APENAS estas, em BARS 1-5)
## O que NÃO pode pesar em nenhuma hipótese
```

E uma linha final exigindo citação literal.

### Bloco 1 — Requisitos eliminatórios

O corte **nunca rejeita**. A instrução é sempre desta forma:

> Se ausente no currículo, registre como gap de severidade `critical` e mantenha o score
> abaixo de 40.

Nunca escreva "rejeite", "descarte" ou "elimine". O sistema **não rejeita candidato
automaticamente por score** (RNF-07a) — score baixo é sinal para o RH, não decisão da máquina.
Uma rubrica que manda rejeitar contradiz a garantia central do produto.

**Silêncio ≠ ausência.** Currículo não declara "tenho disponibilidade integral". Tratar o
silêncio como falta daria gap crítico injusto a todo mundo. A instrução correta:

> Se o currículo não disser nada sobre X, trate como `insufficient_evidence` e NÃO como
> ausência — é pergunta de entrevista, não de currículo.

Vale para disponibilidade, pretensão salarial, residência e qualquer coisa que um currículo
normal simplesmente não menciona.

### Bloco 2 — Competências críticas

**Máximo 5.** Não é gosto: cada competência gera um bloco BARS completo na saída e o prompt
`cv_job_match` tem `max_tokens: 2048`. A sexta arrisca truncar o JSON.

Cada uma leva:

- **um nome concreto** — "Venda consultiva e follow-up", não "Comunicação";
- **um peso** — ALTO / MÉDIO / BAIXO, com uma frase dizendo por quê;
- **âncoras BARS em 5, 3 e 1** — comportamentos observáveis, não adjetivos.

Âncora boa descreve o que a pessoa **fez**:

```
5 = responsável por prospecção, cadência e retomada de contato, com meta.
3 = vendeu de forma reativa, balcão ou atendimento passivo.
1 = nenhuma experiência comercial.
```

Âncora ruim descreve como a pessoa **é**: "5 = excelente comunicador". Não é verificável num
currículo, e é onde o viés se esconde.

Quando uma competência conta ponto mas não elimina, diga isso na própria âncora — "Conta ponto,
não elimina".

### Bloco 3 — O que NÃO pode pesar

Este bloco é o que torna a rubrica auditável. Sempre inclui:

- nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro, regionalismo;
- tempo em desemprego, número de empregos, troca de área, intervalo entre empregos;
- curso superior quando não é requisito — e se o anúncio diz que "conta pontos", deixe
  explícito que é **um ponto, nunca um corte**;
- adjetivos sem evidência citável: "perfil jovem", "boa energia", "boa aparência",
  "proatividade";
- **os adjetivos do próprio anúncio** — nominalmente. Descrevem a empresa.

Acrescente o que for específico do cargo. Na vaga de Social Media, por exemplo, o número de
seguidores do perfil pessoal do candidato: é popularidade, não competência.

### A linha final

> Todo ponto forte e todo gap deve citar trecho literal do currículo. Se o currículo não
> permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.

## Falha do sistema não penaliza candidato

Se o anúncio pede algo que o formulário **não coleta**, a rubrica tem de proibir o desconto.
Este é o caso real da vaga de Social Media, e o padrão vale sempre:

> ⚠ PORTFÓLIO: o anúncio pede portfólio na inscrição, mas o formulário ainda NÃO coleta esse
> campo. Portanto: se houver link ou descrição de portfólio no currículo, use como evidência
> forte. A AUSÊNCIA de portfólio NÃO é gap e NÃO reduz o score — o candidato não teve onde
> informá-lo.

Ao cadastrar uma vaga nova, **confira**: tudo que o anúncio pede tem um campo que colete? Se
não tiver, ou você cria a pergunta na Etapa 1 (preferível), ou blinda o candidato na rubrica.

## O que da saída da IA sobrevive — e o que não

Vale saber antes de investir em rubricas muito granulares. O modelo produz `competency_scores`
(o BARS inteiro), `recommendation`, `confidence`, `bias_check` e as citações literais — e a
Edge Function grava apenas `match_score`, o **nome** dos pontos fortes, o **nome** dos gaps e o
reasoning.

Ou seja: **a rubrica tem efeito real no score e no reasoning**, mas o detalhe BARS por
competência não chega à tela de ninguém. Escreva a rubrica para calibrar o julgamento, não
para produzir um relatório que ninguém vai ler.

## Aprovação humana

Mostre a rubrica ao operador e espere um "aprovo" literal. Não presuma aprovação por silêncio,
e não aplique a migration antes disso. A máquina propõe, o humano aprova — é o padrão de todo
o resto deste sistema.

---

## Gabarito completo — `social-media-producao-captacao-conteudo`

```markdown
## Requisitos eliminatórios
Se ausente no currículo, registre como gap `critical` e mantenha o score abaixo de 40.
- Pelo menos 1 ano produzindo conteúdo para Instagram e/ou TikTok.
- Disponibilidade integral e presencial, de segunda a sexta.
  Silêncio do currículo sobre disponibilidade = `insufficient_evidence`, não ausência.

⚠ PORTFÓLIO: o anúncio pede portfólio na inscrição, mas o formulário ainda NÃO coleta
esse campo. Portanto: se houver link ou descrição de portfólio no currículo, use como
evidência forte. A AUSÊNCIA de portfólio NÃO é gap e NÃO reduz o score — o candidato não
teve onde informá-lo.

## Competências críticas (avalie APENAS estas, em BARS 1-5)

1. Produção publicada com constância
   Peso ALTO. O problema que a vaga resolve é constância, não peça isolada.
   5 = responsável por calendário e publicação recorrente, com volume comprovável.
   3 = produziu conteúdo em campanhas pontuais ou como parte de outra função.
   1 = nenhuma evidência de conteúdo publicado.

2. Captação e edição de vídeo vertical
   Peso ALTO.
   5 = grava e edita Reels/stories como rotina (CapCut, Premiere ou equivalente),
       com domínio de enquadramento, luz e áudio.
   3 = edita vídeo, mas sem evidência de captação própria — ou o contrário.
   1 = nenhuma evidência.

3. Design de peça e consistência visual
   Peso MÉDIO.
   5 = carrossel, banner e capa com padrão de marca (Canva; Photoshop, Illustrator
       ou After Effects contam mais).
   3 = usou ferramenta de design de forma ocasional.
   1 = nenhuma evidência.

4. Escrita
   Peso MÉDIO. Legenda, roteiro, blog e LinkedIn.
   Considere a ortografia e a clareza do próprio currículo como evidência direta.
   5 = escreveu texto publicado como parte central da função.
   1 = nenhuma evidência, ou currículo com erros de ortografia recorrentes.

5. Publicação e leitura de alcance
   Peso BAIXO.
   5 = programou publicação (Meta Business Suite, TikTok) e acompanhou alcance,
       salvamentos e compartilhamentos.
   3 = publicou manualmente, sem evidência de leitura de métrica.
   1 = nenhuma evidência.

## O que NÃO pode pesar em nenhuma hipótese
- Nome, gênero, idade, foto, estado civil, religião, origem, cidade, bairro ou regionalismo.
- Número de seguidores do perfil pessoal do candidato — é popularidade, não competência.
- Aparência, estilo pessoal ou "presença de câmera" inferida do currículo.
- "Ser jovem" ou "nativo digital".
- Ter ou não ter curso superior — o anúncio diz que conta pontos, e é só isso: um ponto,
  nunca um corte.
- Os adjetivos do anúncio da vaga sobre a clínica ou sobre o Dr. Fernando Costa Jr.

Todo ponto forte e todo gap deve citar trecho literal do currículo. Se o currículo não
permite julgar uma competência, use `insufficient_evidence` — é melhor que chutar.
```

~2,8 mil caracteres. A outra rubrica em produção tem ~2,7 mil. É a ordem de grandeza certa.
