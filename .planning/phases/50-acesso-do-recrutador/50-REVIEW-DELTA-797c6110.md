---
phase: 50-acesso-do-recrutador
reviewed: 2026-10-08T00:46:25Z
depth: standard
diff_base: 70614565
reviewed_head: 797c6110
scope: revisão adversarial do delta pós-verificação `git show 797c6110`, que fecha WR-01 e IN-01 do 50-REVIEW.md. Só os dois arquivos abaixo, só o diff. Todas as mutações rodaram numa cópia `git archive 797c6110 supabase/functions` em scratchpad. Os arquivos do repositório não foram editados. Nada foi deployado, nada foi enviado, e PROD não foi tocado. Não conferi se o v7 em PROD é byte-igual a este commit.
files_reviewed: 2
files_reviewed_list:
  - supabase/functions/gerenciar-usuario-rh/index.ts
  - supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 50: revisão do delta pós-verificação 797c6110

**Reviewed:** 2026-10-08T00:46:25Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que o conserto tinha defeito. **Não achei blocker.**

**As três mutações do WR-01 reprovam agora, e o commit diz a verdade sobre isso.** O baseline da cópia dá `ok | 11 passed | 0 failed`. Resultado de cada mutação, colhido pelo runner `mutar.cjs` em scratchpad:

```
Ma_sem_aleatoriedade: FAILED | 10 passed | 1 failed
   AssertionError: temp password is not varied enough: 5 distinct chars
Mb_console_log: FAILED | 10 passed | 1 failed
   AssertionError: temp password leaked into the console
Mc_senha_no_corpo: FAILED | 10 passed | 1 failed
   AssertionError: temp password leaked into the response body
Md_sem_simbolo: FAILED | 10 passed | 1 failed
   AssertionError: temp password lacks a symbol
Mk_senha_fixa_por_processo: FAILED | 10 passed | 1 failed
   AssertionError: Values are not equal: temp passwords repeat across calls
```

- **Ma** troca `crypto.getRandomValues(new Uint8Array(32))` por `new Uint8Array(32)`.
- **Mb** acrescenta `console.log("[dbg] senha temporaria", tempPassword)`.
- **Mc** põe `tempPassword` no `data` do 201.
- **Md** remove o `pick` de símbolos. Ela também é pega, ao contrário do que o pedido de revisão previa.
- **Mk** gera a senha uma única vez por processo e a devolve a cada chamada, o que é aleatório mas repetido.

**`gerarSenhaTemporaria()` (index.ts:323-332) está correta.**
- **Classes:** minúscula, maiúscula, dígito e símbolo vêm de `pick`s fixos na cauda. Os quatro estão presentes sempre, sem depender da base.
- **Conjunto de símbolos:** `!@#$%^&*-_` está contido no conjunto de símbolos da opção `lower_upper_letters_digits_symbols` do GoTrue (``!@#$%^&*()_+-=[]{};'\:"|<>?,./`~``). Este é o conjunto documentado. Não o medi contra o GoTrue vivo, porque isso exigiria PROD.
- **Transporte:** nenhum dos símbolos escolhidos precisa de escape em JSON. Nenhum é `:`, que é o separador da config `password_required_characters`. A senha não passa por URL nem por shell.
- **Viés de módulo:** 2³² mod 26 = 22 e 2³² mod 10 = 6, um viés relativo de no máximo ~6·10⁻⁹. Irrelevante.
- **Tamanho:** numa simulação de 10⁶ senhas, o comprimento variou de 37 a 47 caracteres ASCII. Fica abaixo do teto de 72 octetos do bcrypt e acima do `≥ 32` do teste.

**Flakiness: nenhuma mensurável.** Mesma simulação de 10⁶ senhas:

```
{ N: 1000000, minDistinct: 22, maxDistinct: 43, meanDistinct: "33.04", below16: 0, below20: 0, minLen: 37, maxLen: 47 }
cauda inferior do histograma: 22:4 23:17 24:84 25:403 26:1673
```

O piso `new Set(pw).size >= 16` (test:267) fica 6 caracteres abaixo do pior caso observado em um milhão. O teste sorteia 20 senhas por execução, e a chance de uma reprovação espúria é desprezível. Duas senhas iguais entre 20 (test:270) exigiria colisão em cerca de 240 bits.

**O defeito está, de novo, no alcance do teste de vazamento.** O título e o comentário da linha 252 prometem que a senha «never reaches the body or console». O teste só exercita o caminho feliz, e só intercepta 4 métodos com um serializador que perde o conteúdo de `Error` (WR-01, WR-02). E o IN-01 citado na mensagem do commit foi fechado só pela metade (IN-03).

## Warnings

### WR-01: o teste de vazamento só roda o caminho feliz — a senha logada nos ramos de falha do `criar`, ou devolvida no 400, deixa a suíte 11/11

**File:** `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts:274-294`. Código não coberto em `supabase/functions/gerenciar-usuario-rh/index.ts:354-361` (falha do `createUser`) e `:383-392` (rollback).
**Issue:** O teste novo faz uma única chamada, com mocks de sucesso. Os dois ramos de erro do `criar` são justamente onde alguém depurando um 400 em PROD poria a senha num log, e foi assim que o defeito de 2026-10-06 foi investigado. Nenhum dos dois é conferido:
- O ramo de falha do `createUser` (index.ts:354-361) **não tem nenhum teste**. O mock tem a opção `createUserError` (test:106, :138), mas nenhum `Deno.test` a liga (`grep -n "createUserError: true"` não acha nada).
- O ramo de rollback roda no teste da linha 232 (`rpcErrorFor: "criar_usuario_rh_com_audit"`). Lá ninguém confere vazamento.

Mutações, todas verdes:
```
Mh_log_no_ramo_de_falha_do_createUser: ok | 11 passed | 0 failed
Mi_log_no_ramo_de_rollback: ok | 11 passed | 0 failed
Ml_senha_no_corpo_do_400: ok | 11 passed | 0 failed
```
- **Mh** acrescenta `tempPassword` ao `console.error` da linha 359.
- **Mi** acrescenta `console.error("[gerenciar-usuario-rh] rollback", { userId, tempPassword })` antes da linha 387.
- **Ml** concatena `tempPassword` à mensagem do 400 da linha 360.

Na Mi, a senha **aparece impressa na saída da própria suíte**, e a suíte segue verde:
```
10:  tempPassword: "upoEcBLRw37sUytDNEIifHdk72mbIpcMQsbdjHz79cqG8%"
34:ok | 11 passed | 0 failed (60ms)
```
**Fix:** Parametrizar o teste de vazamento pelos três cenários do `criar`, mantendo a mesma captura:
```ts
for (const [nome, opts] of [
  ["sucesso", {}],
  ["createUser falha", { createUserError: true }],
  ["rpc falha + rollback", { rpcErrorFor: "criar_usuario_rh_com_audit" }],
] as const) {
  const supabaseAdmin = makeMockSupabaseAdmin({ rhRow: { role: "administrador" }, ...opts });
  // … mesma captura de console e corpo …
  assert(!body.includes(pw), `[${nome}] temp password leaked into the response body`);
  assert(!logged.some((l) => l.includes(pw)), `[${nome}] temp password leaked into the console`);
}
```
Depois de consertar, conferir que Mh, Mi e Ml reprovam.

### WR-02: a captura de console é cega a `debug`/`trace`/`dir` e a objetos `Error` — a senha impressa no log da EF passa como «não vazou»

**File:** `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts:279-282`
**Issue:** Há dois buracos na captura:
- Só `log`, `info`, `warn` e `error` são substituídos. O runtime das Edge Functions registra `console.debug` também.
- O serializador faz `JSON.stringify(a)` para não-strings, e `JSON.stringify(new Error(x))` é `"{}"`. Qualquer senha embutida num `Error` some antes do `includes`, enquanto o console real imprime a mensagem e o stack. `Map`, `Set` e objetos com `toJSON` têm o mesmo problema.

Mutações:
```
Mg_console_debug: ok | 11 passed | 0 failed
Mj_log_via_Error_no_caminho_feliz: ok | 11 passed | 0 failed
```
O teste de vazamento roda isolado (`--filter "never reaches"`) contra a Mj e sai `ok | 1 passed`. No teste vizinho, o console real da mesma mutação mostra:
```
[dbg] Error: DaF7upju3TNvBrmpdowKGCJxUjLlUTZmr59fnlZvtcUtY7!
    at handleCriar (file:///…/gerenciar-usuario-rh/index.ts:348:26)
```
**Fix:** Interceptar todos os métodos de saída e serializar como o console real:
```ts
const metodos = ["log", "info", "warn", "error", "debug", "trace", "dir", "table"] as const;
const original = Object.fromEntries(metodos.map((k) => [k, console[k]]));
for (const k of metodos) {
  console[k] = (...args: unknown[]) => logged.push(args.map((a) => Deno.inspect(a, { depth: 10 })).join(" "));
}
```
`Deno.inspect` inclui `message`/`stack` de `Error` e o conteúdo de coleções. Depois, conferir que Mg e Mj reprovam.

## Info

### IN-01: a asserção de símbolo é `/[^A-Za-z0-9]/` — um conjunto que o GoTrue não aceita passa verde

**File:** `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts:266`; `index.ts:331`
**Issue:** O teste aceita qualquer caractere não alfanumérico, inclusive espaço, `§` e `¶`. A política do GoTrue só conta os do conjunto ASCII dele. Trocar o conjunto por `"§¶· "` deixa a suíte verde, mas faria todo `criar` cair no 400 do mesmo jeito que em 2026-10-06, se a opção com símbolo for ligada:
```
Me_simbolo_fora_do_conjunto_gotrue: ok | 11 passed | 0 failed
```
O código de hoje está certo. É o teste que não amarra o conjunto.
**Fix:** ``assert(/[!@#$%^&*()_+\-=\[\]{};'\\:"|<>?,./`~]/.test(pw), "temp password lacks a GoTrue symbol")``.

### IN-02: trocar o CSPRNG por `Math.random` não é detectado

**File:** `supabase/functions/gerenciar-usuario-rh/__tests__/index.test.ts:255-271`; `index.ts:324`
**Issue:** A variedade e a não-repetição não distinguem `crypto.getRandomValues` de um PRNG não criptográfico:
```
Mf_math_random_no_lugar_do_csprng: ok | 11 passed | 0 failed
```
A conta nasce com `email_confirm: true`. A senha descartável vale até o usuário usar o link de recuperação. Um teste comportamental não consegue medir qualidade de aleatoriedade. Para isso, a forma barata é um guard textual.
**Fix:** Um teste que leia `../index.ts` e exija `crypto.getRandomValues` dentro de `gerarSenhaTemporaria` e a ausência de `Math.random` no arquivo. É o mesmo idioma dos `*.grep.test.ts` de `src/__tests__/guards/`.

### IN-03: o commit diz fechar o IN-01, mas só a metade do símbolo entrou, e nenhum artefato da fase escritura o commit

**File:** `supabase/functions/gerenciar-usuario-rh/index.ts:354-361`; `.planning/phases/50-acesso-do-recrutador/50-REVIEW.md:152-156`
**Issue:** O IN-01 tinha duas partes: o símbolo na cauda e o mapeamento do `weak_password`/«Password should…» para um código distinto (`TEMP_PASSWORD_POLICY`). A segunda não foi feita. Uma recusa por política continua chegando ao admin como `SERVER_ERROR` 400 «Não foi possível criar o usuário.», com a única pista num `console.error`. `UsuarioRhErrorCode` (`_shared/usuario-rh-schemas.ts:108-116`) não ganhou código novo. A afirmação «nenhum portão amarra o gerador à política viva do GoTrue» também segue verdadeira. Por fim, nenhum arquivo de `.planning/phases/50-acesso-do-recrutador/` cita `797c6110`, e o `50-REVIEW.md` não tem disposição para WR-01 ou IN-01. O commit entrou depois da verificação (`70614565`), e o v7 está em PROD sem registro na fase.
**Fix:** Ou mapear `authError.code === "weak_password"` para um código próprio (+ teste com `createUserError`, que ainda resolve a lacuna do WR-01), ou registrar a metade restante como resíduo aceito. Nos dois casos, escriturar as disposições de WR-01/IN-01 e o deploy v7 num artefato da fase.

---

_Reviewed: 2026-10-08T00:46:25Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
