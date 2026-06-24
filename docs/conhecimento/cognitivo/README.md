# Cognitivo — Banco de Itens CC0 (Prova de Raciocínio Lógico)

> Assets de implementação da **prova de raciocínio lógico** (Etapa 3 do funil M2,
> ENTREV-05). Instrumento: matrizes + séries letra-número, **itens CC0**, online,
> não-psicológico, **contextual e nunca eliminatório** (RNF-07a).
> Pesquisa + decisões históricas em [`../icar60/`](../icar60/README.md);
> contrato técnico em [`PRD-cognitivo-raciocinio.md`](../../prds/m2-funil-rh/PRD-cognitivo-raciocinio.md) §8.5.

## Conteúdo desta pasta

| Arquivo | Papel |
|---------|-------|
| `LICENSE-CC0.md` | A licença CC0 1.0 + atribuição do dataset (RNF-C3). Commitada **junto** dos itens. |
| `itens-raciocinio-cc0.json` | O conteúdo CC0 dos itens (matriz + letra-número) como `ItemRaciocinio[]` + o gabarito (`superKey60`). |
| `README.md` | Este arquivo — convenção do bucket, regra CC0-only, onde vive a licença. |

O contrato TIPADO `ItemRaciocinio` + o seed `SEED_ITENS_RACIOCINIO` + os helpers
`buildGabarito`/`buildSecoesByItem` vivem em
[`supabase/functions/_shared/cognitivo/item-bank.ts`](../../../supabase/functions/_shared/cognitivo/item-bank.ts)
e embutem/importam o JSON acima.

## Regra de licença — APENAS CC0 (e nunca os blobs Raven)

A aquisição de itens cruza uma **fronteira de licença**. Só conteúdo **CC0
(creative-commons-zero / domínio público, reuso comercial irrestrito)** pode entrar:

- ✅ **Permitido:** dataset **Harvard Dataverse** `doi:10.7910/DVN/TZJGAT`
  (SAPA ICAR — Matrix Reasoning + Letter-Number Series + gabarito `superKey60`). **CC0.**
- ❌ **PROIBIDO — item bank do icar-project.com:** licença "non-commercial
  research"; um ATS comercial está fora de escopo.
- ❌ **PROIBIDO — blobs Raven `.webp` legados** (`src/assets/images/raven/*.webp`):
  removidos do working tree (commit `702cef0`) mas ainda presentes no git history.
  Licença Pearson inviável + adverse impact (**PRD-cognitivo Q-C5**). **NÃO reusar
  essas imagens no build novo** — só itens CC0 do Harvard Dataverse.

A licença + atribuição (Condon & Revelle, SAPA Project) ficam em `LICENSE-CC0.md`,
commitado nesta pasta. O download/commit do conteúdo CC0 é um **checkpoint humano**
(Plan 14-02 Task 2): o executor prepara tudo, o humano confirma a proveniência CC0
antes do conteúdo aterrissar.

## Convenção do bucket — `cognitivo-itens`

- Itens servidos de um bucket próprio Supabase Storage: **`cognitivo-itens`**
  (RNF-C3) — **separado** de qualquer bucket que tenha tido material Raven
  (evita cross-contamination de licença).
- `LICENSE-CC0.md` + atribuição commitados junto do conteúdo (no repo, nesta pasta).

## Anti-tamper — o gabarito é server-only

O `gabarito_idx` é a chave de resposta e vive **somente server-side**
(`itens-raciocinio-cc0.json` + `item-bank.ts`). A prova do candidato (14-06)
projeta apenas `enunciado` + `alternativas`; o `gabarito_idx` **nunca** é
serializado para uma superfície candidate-facing (RNF-07a / T-14-02-01). O scorer
(`scoring.ts`) recomputa o score de `rawResponses` + o gabarito server-only.
