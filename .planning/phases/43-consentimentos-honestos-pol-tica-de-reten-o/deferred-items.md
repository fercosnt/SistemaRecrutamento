# Phase 43 — itens diferidos (fora do escopo dos planos que os encontraram)

## `deno test supabase/functions/_shared/` não roda limpo — `strict-schema.test.ts` (PRÉ-EXISTENTE)

**Encontrado em:** 43-01 Task 2, ao executar o `<verify>` do plano.
**Natureza:** pré-existente, não causado por esta fase. Confirmado por `git stash` +
re-execução no estado anterior: falha idêntica.

`supabase/functions/_shared/__tests__/strict-schema.test.ts` é uma sonda **Vitest**
(usa `node:fs`, roda sob Node), e por isso `supabase/functions/deno.json` a lista em
`"exclude"`. Esse `exclude` **não é honrado quando `deno test` recebe um caminho de
diretório explícito**, então o arquivo entra no type-check do Deno e falha com:

```
TS7053: Element implicitly has an 'any' type because expression of type
'"cpf" | "foto" | "estado_civil" | "saude"' can't be used to index type
'{ email: …; autorizacoes: { autorizacao_uso_dados: boolean } }'
  at strict-schema.test.ts:88:14
```

**Efeito:** o comando `deno test supabase/functions/_shared/` (usado como `<verify>`
por vários planos) reprova por um arquivo que não deveria estar no conjunto. O corpus
Deno real passa: `152 passed | 0 failed` ao excluir a sonda e passar `--allow-env`.

**Não corrigido aqui** por fronteira de escopo — o arquivo não foi tocado pela 43-01 e
a correção (uma anotação de tipo em `INSCR_01_VALID_PAYLOAD`, ou mover a sonda para
fora de `supabase/functions/`) é decisão de higiene de suíte, não de consentimento.

**Sugestão para quem pegar:** mover a sonda para
`src/features/cadastro/__tests__/efStrictSchema.test.ts`. Ela já lê o arquivo por
`node:fs`; nada nela precisa morar dentro de `supabase/functions/`, e o `exclude` do
`deno.json` deixaria de ser necessário.

**Comando que roda limpo enquanto isso:**

```bash
deno test --allow-read --allow-env \
  $(ls supabase/functions/_shared/__tests__/*.test.ts \
       supabase/functions/_shared/**/*.test.ts \
     | grep -v strict-schema | sort -u)
```
