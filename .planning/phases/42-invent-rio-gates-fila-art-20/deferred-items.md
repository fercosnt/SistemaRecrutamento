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

---

## D-42-11-01 · `GlassButton` engole silenciosamente todo prop extra (`aria-*`, `data-*`, `title`)

**Encontrado por:** plano 42-11, ao acrescentar o terceiro estado do
`SolicitarRevisaoCTA`.
**Arquivo:** `src/components/ui/glass.tsx:147-192` (`GlassButton`).

**Sintoma:** `<GlassButton aria-disabled="true" />` não produz atributo nenhum no
`<button>` renderizado. Nenhum erro, nenhum aviso — o atributo simplesmente não
existe. Descoberto porque um teste do 42-11 asseriu o atributo e reprovou.

**Diagnóstico:** o componente desestrutura `...props` e usa `props.blur`,
`props.variant`, `props.opacity` e `props.border` para montar as classes, mas
**nunca faz `{...props}` no `<button>`**. Ou seja: os props "de estilo" são lidos e
todo o resto é descartado. Isso vale para `aria-*`, `data-*`, `title`, `id`,
`aria-label`, `aria-describedby`, `onFocus`, `form` — qualquer coisa fora da
assinatura explícita (`onClick`/`disabled`/`type`).

**Por que importa mais do que parece:** é uma falha *silenciosa* numa primitiva
compartilhada, e a categoria de prop mais afetada é justamente a de
**acessibilidade**. Qualquer tela do projeto que tenha tentado passar `aria-label`
ou `aria-describedby` para um `GlassButton` acredita ter feito isso e não fez. Vale
uma varredura (`grep -rn 'aria-\|title=' ` nos consumidores de `GlassButton`) junto
da correção.

**Correção provável (uma linha, com varredura antes):** espalhar o resto dos props
no `<button>`, separando explicitamente as chaves de estilo (`blur`, `variant`,
`opacity`, `border`, `hover`) para que não virem atributos DOM inválidos.

**Por que não foi corrigido aqui:** `src/components/ui/glass.tsx` está fora do
`files_modified` do 42-11, é primitiva usada por dezenas de telas, e a correção
exige varredura dos consumidores para não trocar um bug silencioso por um monte de
atributos DOM inválidos. O 42-11 contornou usando o `disabled` **nativo** (que é o
mecanismo correto ali de qualquer forma) e registrou o achado.

**Impacto no 42-11:** nenhum — o estado desabilitado do CTA usa `disabled` nativo,
que o componente suporta e que já comunica o estado à tecnologia assistiva.
