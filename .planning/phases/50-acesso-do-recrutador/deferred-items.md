## Deferred Items

- consolidar-decisao-final não confere que `candidatura_id` pertence a `vaga_id`
  status: closed — corrigido em `7812eda4` (WR-07 da `50-REVIEW-ACESSO-1`, decisão do operador «1» em 2026-10-05), no ar como v11 desde o 50-10
  **Found during:** 50-06 Task 3 (pré-existente, não causado por este plano).
  **What:** a EF recebe `{ candidatura_id, vaga_id }`, lê os pesos de `vaga_id` e os scores de
  `candidatura_id`, e nunca checa que os dois casam (o gerar-guia-entrevista tem esse cross-check;
  o consolidar nunca teve). Antes da Phase 50, um recrutador podia informar a própria vaga com uma
  candidatura de outra e ler os scores dela (IDOR). Depois do D-01 isso deixou de vazar dado, porque
  todo rh ativo já lê qualquer candidatura. O que sobra é integridade: o consolidado sai calculado
  com os pesos da vaga errada. A saída é read-only e advisory (RNF-07a), e nada é gravado.
  **Fix sugerido:** ler `candidaturas.vaga_id` e devolver o mesmo 403 genérico em caso de
  divergência, como faz o gerar-guia. Isso muda o comportamento de uma EF fora do escopo do D-01,
  então precisa de decisão do operador antes de entrar no 50-10.
