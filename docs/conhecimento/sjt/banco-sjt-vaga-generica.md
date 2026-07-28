---
cargo: vaga_generica
formato: multipla_escolha
bateria: 3 cenários
tempo_estimado_min: 7
peso_maximo: 12
corte_revisao: "< 8 OU ≥1 atencao"
escala: { fortemente_pontua: 4, pontua: 2, neutro: 1, atencao: 0 }
status: active
versao: v1.0
fonte_base: "minerado de perguntas-vagas.md (formulário 'Vaga Beauty Smile' genérico) + 4 valores"
language: pt-BR
uso: "Fallback/curinga para qualquer vaga nova que ainda não tenha banco próprio. O mergulho profundo nos valores acontece na redação fit-cultural; aqui é leve."
---

# Banco SJT — Vaga Beauty Smile (genérica)

> **Escala:** `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0 **+ flag**.
> **Threshold:** `score < 8/12` **OU** `≥1 atencao` → revisão humana. Nunca auto-rejeita (RNF-07a).
> **4 valores Beauty Smile:** Experiência UAU · Inovação · Atitude de Dono · Sede de Crescimento.

---

## VG-1 — Atitude de Dono
- **Valor:** Atitude de Dono
- **Fonte:** minerado ("identifica oportunidade de melhoria num processo")

> Você percebe um problema recorrente no fluxo da sua área que ninguém parece notar — está custando tempo/retrabalho toda semana.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Analisa a causa, propõe uma solução concreta (com dados/exemplo) à gestão e se oferece pra ajudar a implementar | fortemente_pontua | 4 | Âncora. Iniciativa + dono do resultado. |
| 2 | Documenta a ideia e apresenta formalmente aos responsáveis | pontua | 2 | Proativo, mas para na sugestão. |
| 3 | Comenta informalmente com colegas pra ver "se é só impressão" | neutro | 1 | Tímido; não leva à ação. |
| 4 | Espera alguém de cima notar e resolver — "não é meu papel" | atencao | 0 | Passividade. Flag. |

## VG-2 — Experiência UAU
- **Valor:** Experiência UAU

> Um paciente (ou colega) chega claramente frustrado com algo que não foi você que causou e que está fora da sua responsabilidade direta.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Acolhe, assume a ponta de resolver, conecta a pessoa à solução certa e acompanha até resolver | fortemente_pontua | 4 | Âncora. Não empurra "não é comigo". |
| 2 | Ouve com empatia e encaminha pra área certa, explicando pra quem ir | pontua | 2 | Empático, mas não acompanha. |
| 3 | Diz educadamente que não é com você e indica o setor responsável | neutro | 1 | Correto, mas frio. |
| 4 | Responde que "isso não é comigo" e segue com o que estava fazendo | atencao | 0 | Descaso. Flag. |

## VG-3 — Sede de Crescimento
- **Valor:** Sede de Crescimento
- **Fonte:** minerado ("como recebe feedback")

> Seu gestor te dá um feedback direto, num 1:1, apontando um erro seu num processo importante.

| ordem | opção | tag | peso | nota_ia |
|---|---|---|---|---|
| 1 | Ouve sem se defender, agradece, pergunta como melhorar e aplica a correção — vê como aprendizado | fortemente_pontua | 4 | Âncora. Mentalidade de crescimento. |
| 2 | Aceita o feedback, mas justifica bastante o porquê do erro antes de seguir | pontua | 2 | Aceita, mas com defensividade. |
| 3 | Aceita calado, mas no fundo acha injusto e não muda muita coisa | neutro | 1 | Aceitação superficial, sem mudança. |
| 4 | Fica na defensiva e terceiriza a culpa (sistema, colega, prazo) | atencao | 0 | Rejeita feedback. Flag. |
