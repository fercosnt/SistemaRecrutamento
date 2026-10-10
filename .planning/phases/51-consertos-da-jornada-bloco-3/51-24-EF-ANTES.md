# 51-24 — base de desfazer das EFs e marcador da publicação; não é relatório

Este arquivo é lido por máquina: a linha `marcador:` abaixo é o `M` que o segundo `<verify>` da Task 2 procura
no PROD servido. Gravado ANTES do redeploy de `executar-direito-titular` e ANTES do push.

## Versões vivas antes do deploy (GET só-leitura, 2026-10-10 03:29:45 -0300)

Fonte: `GET https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/functions/<slug>` (token do Keychain «Supabase CLI»).

| slug | version | status | verify_jwt | updated_at (epoch ms) | updated_at (UTC) | ezbr_sha256 | sha de origem |
|---|---|---|---|---|---|---|---|
| executar-direito-titular | 14 | ACTIVE | true | 1791593804937 | 2026-10-10T00:56:44.937Z | `afc9ec2ad2541e2bdbe6adbdcf4d9b929c6dab046b5a6deef45a4e98ace8033e` | `refs/gsd/51-16/sha` = `87be2703ea130384e6ea66a14c9093717a980dea` |
| exportar-meus-dados | 8 | ACTIVE | true | 1791593798268 | 2026-10-10T00:56:38.268Z | `114d9710076f8f404bf8076178abd5d90d4eff0b18bd85390d151221ab934d2a` | `refs/gsd/51-16/sha` = `87be2703ea130384e6ea66a14c9093717a980dea` |

As duas são as do 51-16-SUMMARY (deploys de 2026-10-09 21:56:38 e 21:56:45 -0300 = 00:56:38Z e 00:56:44Z de 10-10),
publicadas de `87be2703`. A fonte de desfazer é conhecida.

**Desfazer `executar-direito-titular` (só com checkpoint do operador):** `git worktree add <dir> 87be2703ea130384e6ea66a14c9093717a980dea`
e `node <dir>/efdeploy.cjs executar-direito-titular` (o `efdeploy.cjs` lê os arquivos ao lado dele). Fechamento de imports
(5 arquivos): `_shared/email-config.ts`, `_shared/email-templates.ts`, `_shared/reciboExclusao.ts`,
`executar-direito-titular/helpers.ts`, `executar-direito-titular/index.ts`. Entre `87be2703` e o pin, só
`supabase/functions/_shared/reciboExclusao.ts` mudou em `supabase/functions/` (4 linhas: o texto do recibo).

## exportar-meus-dados não redeployada: fechamento de imports igual ao da v8

`node efdeploy.cjs exportar-meus-dados --dry-run` → 2 arquivos (`_shared/exportAllowlist.ts`, `exportar-meus-dados/index.ts`),
mais o import map `deno.json`. `git diff --quiet refs/gsd/51-16/sha HEAD -- <arquivo>` → igual nos três. Ela não embute o recibo.

## Marcador (VERMELHO antes do push)

marcador: porque o cadastro exige uma UF

Trecho da frase da UF de `texto_futuro` aprovado no 51-19 (30 caracteres, só ASCII — imune a escape `\uXXXX` do bundler).
Ausente do `recibo-exclusao.json` de `87be2703` (0 ocorrências), presente no de HEAD (2: futuro e passado), e no
`src/features/privacidade/constants/reciboExclusao.generated.ts` que o cliente embute.

Crawler do segundo `<verify>` da Task 2 contra `https://rh.beautysmile.com.br`, 2026-10-10 03:30:50 -0300 (saída 1):

```
AUSENTE no chunk index de PROD: porque o cadastro exige uma UF (visitados=53; achados=[])
```

Controle no mesmo instante (mesmo crawler, texto ANTIGO do recibo `Ficam guardados o seu estado (UF)`):

```
controle (texto antigo) achado em: ["/assets/index-BnGosyaL.js"] visitados=53
```

O controle prova que o crawler alcança o chunk do recibo (eager, `index-*`): o AUSENTE acima discrimina o build novo.
