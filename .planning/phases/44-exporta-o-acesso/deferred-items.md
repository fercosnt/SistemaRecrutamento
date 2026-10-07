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

## 2026-10-06 · 44-16 (ajuste do canal) · `src/components/ErrorBoundary.tsx:202` — `mailto:suporte@beautysmile.com.br`

- **Achado:** o 44-16 trocou o canal de privacidade para `rh@` porque o endereço anterior nunca
  existiu como caixa lida. A varredura pela FORMA (`mailto:` com endereço literal em `src/`, fora
  de testes) achou mais um endereço digitado à mão: o «Contate o suporte» da tela de erro global
  (`ErrorBoundary`) aponta para `suporte@beautysmile.com.br`.
- **Por que importa:** é a mesma classe de defeito. Ninguém mediu se `suporte@` existe e é lido.
  Se não for, a tela que aparece quando o app quebra manda a pessoa para lugar nenhum.
- **Por que não é do 44-16:** não é o canal de privacidade, e o operador decidiu só sobre ele.
  Mexer nesse endereço muda copy fora do conjunto autorizado da rodada, e não há decisão sobre
  qual caixa usar.
- **Não consertado.** Pergunta ao operador: `suporte@beautysmile.com.br` existe e é lido? Se não,
  passa a `rh@` (o `REPLY_TO`) ou a outra caixa?

## 2026-10-07 · 44-20 (WR-03) · `COPY_ARQUIVO.rodape` com `versao_allowlist` ausente

- **Achado:** o (cr6) monta uma resposta SEM a chave `versao_allowlist` (por cast) para provar
  que a fronteira falha fechada. Nesse caso a fronteira sai neutra, como deve, mas o rodapé do
  `.html` imprime «Versão da lista de dados exportados: undefined.» e o `.json` omite a chave
  (`JSON.stringify` descarta `undefined`).
- **Por que importa pouco hoje:** a EF implantada sempre devolve `versao_allowlist`; o caso só
  existe por cast ou por uma EF futura quebrada. Mesmo então, a cópia não afirma fronteira
  errada (a neutra manda ao canal).
- **Por que não é do 44-20:** o plano restringe a mudança à fronteira dos arquivos
  (`fronteiraDaCopia`) e diz que o rodapé continua carimbando a versão que a resposta trouxe;
  mudar o rodapé é copy nova sem linha na 44-UI-SPEC.
- **Não consertado.** Se a revisão do 44-21 considerar relevante: o rodapé passaria a dizer
  «versão não informada» (linha nova na 44-UI-SPEC) quando a versão vier vazia ou ausente.
