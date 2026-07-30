# Phase 42 — itens diferidos (fora do escopo do plano que os encontrou)

## D-42-09-01 · `notificar-rh.test.ts` reprova sob Vitest (pré-existente, do plano 42-07)

**Encontrado por:** plano 42-09, ao rodar `npm run test:run` completo.
**Origem:** commit `f240a16` (`feat(42-07)`).
**Sintoma:**

```
FAIL supabase/functions/notificar-rh/__tests__/notificar-rh.test.ts
Error: Only URLs with a scheme in: file and data are supported by the default ESM loader.
       Received protocol 'https:'
```

**Diagnóstico:** é um teste **Deno** (importa `https://deno.land/std`), e roda sob
`deno test`, não sob Vitest. Todos os testes irmãos desse tipo estão listados no
`exclude` do bloco `test` de `vite.config.ts` (há ~15 entradas literais lá,
justamente por isso). O do `notificar-rh` não foi acrescentado quando o plano 42-07
criou o arquivo.

**Correção (uma linha, no plano dono da EF):** acrescentar
`'supabase/functions/notificar-rh/**/*.test.ts'` ao `exclude` de `vite.config.ts`.

**Por que não foi corrigido aqui:** o plano 42-09 é frontend-only
(`src/features/revisao/` + `src/router/routes.tsx`); `vite.config.ts` e a EF não
estão no seu `files_modified`, e a falha não foi causada por nenhuma mudança dele.
Mexer na configuração de teste global a partir de um plano de UI esconderia a
regressão de quem a introduziu.

**Impacto:** `npm run test:run` sai diferente de zero no repositório desde o 42-07.
Os 1148 testes que rodam passam; a reprovação é de CARGA de um arquivo, não de
asserção.
