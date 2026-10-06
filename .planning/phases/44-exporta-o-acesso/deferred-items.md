# Phase 44 — itens fora do escopo achados durante a execução

## 2026-10-06 · 44-11 · `src/__tests__/promessasComExecutor.test.ts` — 2 falhas pré-existentes

- **Achado:** um `npx vitest run -u <arquivo>` do 44-11 rodou a suíte inteira (2417 testes) e
  mostrou 2 falhas em `src/__tests__/promessasComExecutor.test.ts`:
  - `Metade 1 … deferida · o comentário de catálogo do ledger de notificações declara retenção INDE…`
  - `Deferimento com prazo … fase inexistente e fase já concluída REPROVAM` —
    `expected { existe: true, concluida: true } to deeply equal { existe: true, concluida: false }`
    (linha 676: `faseDona('Phase 46', roadmapReal)`).
- **Causa provável:** as duas entradas têm `faseDona: 'Phase 46'` e o `.planning/ROADMAP.md` marca a
  Phase 46 como concluída. O deferimento aponta para uma fase que já fechou — é o próprio portão
  funcionando, e pede uma decisão (construir o executor ou mover/retirar a promessa), não uma isenção.
- **Por que não é do 44-11:** `git diff --quiet c42a6b8d HEAD -- .planning/ROADMAP.md
  src/__tests__/promessasComExecutor.test.ts` sai 0 — as duas entradas do teste são idênticas às da
  base do plano. Nenhum arquivo do 44-11 é lido por esse teste.
- **Não consertado** (regra de escopo do executor). Os portões do plano (Vitest de
  `docs/compliance/__tests__` + `src/features/privacidade`, 222/222) estão verdes.
