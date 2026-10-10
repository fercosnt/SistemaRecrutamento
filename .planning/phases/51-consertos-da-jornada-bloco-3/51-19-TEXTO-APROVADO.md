texto_futuro: Fica guardada a sua faixa etária, sem vínculo com o seu nome, para relatório agregado. Fica guardada também a sigla do seu estado (UF), sem vínculo com o seu nome, porque o cadastro exige uma UF válida.
texto_passado: Ficou guardada a sua faixa etária, sem vínculo com o seu nome, para relatório agregado. Ficou guardada também a sigla do seu estado (UF), sem vínculo com o seu nome, porque o cadastro exige uma UF válida.
mover_origem_disponibilidade: sim
aprovado_em: 2026-10-10
registrado_em: 2026-10-10 02:24 -0300
nota_hora: o canal (AskUserQuestion) não registrou a hora da resposta; `aprovado_em` leva só a data, e `registrado_em` é a hora em que este arquivo foi escrito
canal: AskUserQuestion, na sessão de execução do 51-19 (checkpoint da Task 2, gate blocking-human)
opcao: aprovar
fonte_do_texto: docs/compliance/recibo-exclusao.json em 359fd59a (item `estado_e_faixa_etaria` de `colunas_mantem`), byte a byte

# 51-19 — texto do recibo aprovado pelo operador (G1b)

Este arquivo não é relatório: é a entrada que o 51-24 lê por máquina antes do deploy de `executar-direito-titular`.
As chaves acima são uma por linha, sem quebra dentro do valor. O 51-24 confere que `texto_futuro` e `texto_passado`
são byte a byte os do item `estado_e_faixa_etaria` no `recibo-exclusao.json` que vai ao ar.

O que foi mostrado ao operador, lado a lado: o texto vivo nos dois tempos («Ficam guardados o seu estado (UF) e a sua
faixa etária, sem vínculo com o seu nome, para relatório agregado.» e o passado), a proposta gerada pela Task 1 (os dois
tempos, lidos do `recibo-exclusao.json` em 359fd59a) e a mudança de `colunas_origem` de `disponibilidade.candidato_id`,
de `vinculos_nos_registros_que_ficam` (passo `severar_fks_set_null`) para `dados_de_cadastro` (passo `tombstone_candidato`).

## Resposta do operador

Verbatim (AskUserQuestion, 2026-10-10):

> Aprovar (Recommended)

Opção escolhida: `aprovar` — aprova a proposta nos dois tempos e a mudança de origem da disponibilidade.
