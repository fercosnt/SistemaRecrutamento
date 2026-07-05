# Itens de raciocínio — AUTORAIS (rascunho para validação)

**Status:** 🟡 RASCUNHO — pendente aprovação do(a) psicólogo(a) responsável.
**Arquivo:** `itens-raciocinio-autorais-DRAFT.json` (20 itens: 12 `letra_numero` + 8 `matriz`).
**Data:** 2026-07-05.

## Por que autorais (e não ICAR/CC0 ou Raven)

O caminho CC0-ICAR foi **descartado**: o CC0 do Harvard Dataverse cobre os *dados de
resposta* + o gabarito, **não os enunciados** (retidos; a fonte `icar-project.com` é
não-comercial → incompatível com um ATS comercial). O **Raven** também está fora — é IP
da Pearson (o repo já removeu os assets no commit `702cef0`; ver
`docs/prds/0009-prd-teste-raven.md`). Ver `.planning/todos/pending/cc0-cognitive-item-bank-sourcing.md`.

**Estes itens são escritos do zero.** Séries letra-número (ex.: `2, 4, 8, 16, ?`) e
padrões lógicos simples não são conteúdo protegível — a licença é limpa e nossa.

## Contrato (casa com `_shared/cognitivo/item-bank.ts` → `ItemRaciocinio`)

```ts
{ id, secao: "matriz" | "letra_numero", enunciado, alternativas: string[], gabarito_idx }
```
`gabarito_idx` é **0-based** e **server-only** (nunca vai ao candidato — RNF-07a). O
scorer (`_shared/cognitivo/scoring.ts`) soma 0/1 por item e mapeia a proporção de
acertos em 5 bandas qualitativas (≤20/≤40/≤60/≤80/>80%) — nunca percentil/"QI".

## ⚠️ Pré-requisito ANTES de semear (achado #1 crítico da auditoria técnica)

**NÃO semear enquanto o vazamento do gabarito (C1 / A1) não for corrigido.** Hoje a RLS
de `cognitivo_itens` deixa qualquer usuário autenticado ler `gabarito_idx` via PostgREST.
Semear numa tabela vazada = **gabarito público**. Ordem: **corrigir C1 → semear → smoke**.

## Checklist para o(a) psicólogo(a)

- [ ] Validar cada `gabarito_idx` (chave correta) e a clareza do enunciado.
- [ ] Ajustar **dificuldade/discriminação** (hoje o rascunho vai de trivial a médio;
      falta um degrau mais difícil para discriminar no topo).
- [ ] Confirmar ausência de viés cultural/linguístico (adverse impact).
- [ ] Decidir a **quantidade final** (mín. sugerido ≥20) e o split matriz/letra-número.
- [ ] Definir **tempo-limite** da prova (a UI tem timer soft) e o opt-in por vaga.
- [ ] Aprovar a nomenclatura de produto ("prova de raciocínio lógico", nunca "QI"/"teste
      psicológico" — LGPD-04).

## Ao aprovar (wiring)

1. Renomear/promover o JSON (sem `-DRAFT`) e apontar `SEED_ITENS_RACIOCINIO` em
   `_shared/cognitivo/item-bank.ts` para ele (hoje `= []`).
2. Rodar a migration de seed do cognitivo + os smokes do `pontuar_cognitivo`.
3. Ligar `vaga.aplica_cognitivo` na(s) vaga(s) alvo (default OFF).
