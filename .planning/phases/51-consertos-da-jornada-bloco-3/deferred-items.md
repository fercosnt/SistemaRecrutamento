# Deferred Items — Phase 51

## Deferred Items

- (51-12) `e2e/explicacao-flow.spec.ts` EX-02 e EX-03 procuram rótulos que a 43-UI-SPEC (BD-3) já reescreveu: o botão «Solicitar revisão …» e o diálogo «Solicitar revisão?». O CTA vivo diz «Pedir que uma pessoa revise esta decisão» e o diálogo diz «Pedir revisão desta decisão?». Os dois cenários são pulados sem `E2E_REAL_LOGIN` e por isso nunca reprovaram. Rodados com login real, falham pelo rótulo e não pelo comportamento. O EX-04 (51-12) já usa o rótulo vivo. Isto vem de antes do 51-12 e fica fora do escopo dele.
- (51-12) `src/__tests__/promessasComExecutor.test.ts`: 2 de 13 casos reprovam, com a mesma saída, em `refs/gsd/51-12/base` (`f500b81d`, antes de qualquer commit do 51-12) e no HEAD. Os dois casos são «deferida · o comentário de catálogo do ledger de notificações…» e «fase inexistente e fase já concluída REPROVAM…». Eles leem o ROADMAP e o ledger, não a feature de explicação. Isto vem de antes do 51-12 e fica fora do escopo dele.
