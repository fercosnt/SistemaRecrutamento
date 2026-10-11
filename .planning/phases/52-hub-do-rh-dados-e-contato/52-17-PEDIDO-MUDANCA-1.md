# 52-17 — portão de texto do bloco C, rodada 1: o operador pede mudanças

Data: 2026-10-11. Texto apresentado: `docs/specs/BANCO-SJT-V2.md` md5 `5870e7bf5cd5c5423fb38eb1b94f8858`,
tabela_md5 `d3d955d58c4808d2822aabaa290aa830`, ensaio `52b=14/14` sobre o estado vivo (bloco B no ar).

## Resposta ao texto (verbatim)

«1. social-media MC3: pontua e neutro não podem publicar a imagem da paciente sem o termo (dado sensível, LGPD;
autorização exigida pelo CFO). Reescrever as duas como erros de julgamento que NÃO violam a regra (ex.: segura a
publicação mas não avisa o Dr. do motivo; segura e propõe outro conteúdo sem resolver o termo). Mesma revisão no
videomaker-storymaker MC3: gravar o áudio do paciente sem ele saber não pode valer 2.2. social-media MC6, atencao:
«Corrige você mesma» → «Corrige por conta própria» (sem gênero).3. sdr-social-seller MC4: a regra da clínica sobre
preço no WhatsApp é: <a Beauty Smile PASSA faixa de preço / NÃO passa valor por WhatsApp>. Ajustar o gabarito a
ela.4. sdr-social-seller MC5, fortemente_pontua: «avisa quem está na lista de espera» → «deixa a lista de espera de
sobreaviso».Toda reescrita passa de novo pela tabela de comprimento com o critério proposto.»

Esclarecimento do item 3 (pergunta do orquestrador, resposta verbatim): **«Passa faixa, não valor»** — a Beauty
Smile PASSA a faixa de preço pelo WhatsApp, mas NÃO passa o valor exato (valor só na avaliação).

Leitura do item 1 (videomaker-storymaker MC3): a alternativa que grava o áudio do paciente sem ele saber não pode
pontuar 2 — vira erro que viola a regra (atencao) ou é reescrita como erro de julgamento que não a viola, no mesmo
espírito do social-media MC3.

## (b)–(f) (verbatim)

«(b) critério proposto, (c) casos abertos ficam, (d) retirar por status, (e) ordem C → UAT → D»

(f) rascunho local `docs/specs/DRAFT-banco-sjt-marketing.md` (md5 5816ac72d78542f470fcf7c39dea954f): **«Eu descarto depois»**.

## Consequência

Não é aprovação. O texto volta a ser editado SÓ em `docs/specs/BANCO-SJT-V2.md`, a Task 1 do 52-17 roda de novo
(tabela com `--criterio proposto`, LGPD-04, ensaio) e o portão de texto volta ao operador com os md5 novos.

---

# Rodada 2 — resposta do operador (2026-10-11)

Texto apresentado: `docs/specs/BANCO-SJT-V2.md` md5 `539bc858464ff0b768b12e96ea7492ef` (commit 4b84b815),
tabela_md5 `bc32d39834a3a5fbf55bf48b3c24cc4d`, SQL md5 `158bcb4911a540343854620c0e2dcf9f`, ensaio `52b=14/14`.
Incluía as escolhas do executor 1–4 (videomaker MC3 neutro reescrito; sdr MC4 neutro reescrito; «mudar no sorriso»;
sdr MC5 com o texto do operador verbatim).

**Resposta (verbatim): «aprovar + polir»**

Significado da opção escolhida, como apresentada ao operador: aprova o texto como mostrado (inclusive as escolhas
1–4), com dois polimentos aplicados antes de registrar:
- sdr-social-seller MC5, fortemente_pontua: «manda recado, deixa a lista de espera de sobreaviso»
  (no lugar de «deixa recado, deixa a lista…»);
- videomaker-storymaker MC5, neutro: «começa a sessão com atraso» (no lugar de «atrasado»).
Depois, uma rodada automática de tabela (`--criterio proposto`) + LGPD-04 + ensaio; só volta ao operador se uma
verificação falhar. (b)–(f) seguem como respondidos na rodada 1.
