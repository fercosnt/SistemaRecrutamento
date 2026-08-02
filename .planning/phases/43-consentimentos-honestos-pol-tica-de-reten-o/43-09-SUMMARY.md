---
phase: 43
plan: 09
subsystem: retencao-admin
status: complete
tags: [lgpd, retencao, config-sem-deploy, previa-read-only, zero-destrutivo, asserçao-negativa, a11y, admin]
requires:
  - public.config_retencao_etapa (43-04, viva em PROD desde o 43-07 — 8 linhas, todas em 24 meses, origem='seed')
  - public.listar_matriz_retencao() / public.salvar_janela_retencao(etapa, meses) (43-04)
  - public.previa_retencao() / public.previa_retencao_total() (43-06)
  - database.types.ts regenerado no 43-07 (as 4 RPCs tipadas)
  - src/components/ui/AsyncState.tsx (contrato único de loading/error/empty)
  - triagemService.ETAPA_M2_LABELS / ETAPA_M2_OPTIONS (fonte única de rótulo de etapa)
provides:
  - rota /admin/retencao sob RoleGuard role="administrador", via lazyNamed (PERF-03)
  - src/features/admin/retencao/ (serviço + 3 hooks + schema + 4 componentes)
  - item "Retenção" na RHSidebar nos TRÊS sítios, role-gated
  - 56 testes novos (49 na feature + 7 na sidebar), 6 deles asserções negativas estruturais
affects:
  - 46 (PURGA: a coluna `origem` que esta tela torna legível é o discriminador que a 46 tem
      de consultar antes de armar qualquer DELETE; e a prévia desta tela é o dry-run que a
      46 vai reusar pelo MESMO predicado)
  - 47 (TRANSP-02: "o que guardamos e por quê" derivado da matriz como DADO — esta tela é
      a primeira leitora dela)
tech-stack:
  added: []
  patterns:
    - "tabela MESCLADA com o enum fechado: ausência de linha vira estado visível, nunca omissão silenciosa"
    - "regra de no-op imposta nos DOIS lados (CTA desabilitado + 22023 do servidor), e no cliente ela NÃO é erro de validação"
    - "asserção negativa ESTRUTURAL de <button>/<a> com o estado de ERRO explicitamente fora do escopo"
    - "carimbo de data computado pela MESMA função que computa o número — inclusive no estado zero"
    - "data verdadeira suprimida quando contaria história falsa (atualizado_em do seed → travessão)"
key-files:
  created:
    - src/features/admin/retencao/services/retencaoService.ts
    - src/features/admin/retencao/schemas/janelaRetencaoSchema.ts
    - src/features/admin/retencao/hooks/useMatrizRetencao.ts
    - src/features/admin/retencao/hooks/useSalvarJanela.ts
    - src/features/admin/retencao/hooks/usePreviaRetencao.ts
    - src/features/admin/retencao/components/RetencaoPage.tsx
    - src/features/admin/retencao/components/MatrizRetencaoTable.tsx
    - src/features/admin/retencao/components/EditarJanelaDialog.tsx
    - src/features/admin/retencao/components/PreviaRetencaoBloco.tsx
    - src/features/admin/retencao/components/__tests__/MatrizRetencaoTable.test.tsx
    - src/features/admin/retencao/components/__tests__/RetencaoPage.test.tsx
    - src/features/admin/retencao/components/__tests__/EditarJanelaDialog.test.tsx
    - src/features/admin/retencao/components/__tests__/PreviaRetencaoBloco.test.tsx
    - src/components/__tests__/RHSidebarRetencao.test.tsx
  modified:
    - src/router/routes.tsx
    - src/components/RHSidebar.tsx
decisions:
  - "A tabela MESCLA a resposta do servidor com o enum fechado de 8 estados. Um estado presente no enum e ausente da matriz vira linha \"— (não definida)\" com a ação desabilitada — uma etapa sem política é exatamente o que a Phase 46 precisa enxergar antes de armar um DELETE, e omiti-la seria esconder o caso mais perigoso."
  - "O seed mostra TRAVESSÃO em Última alteração. `atualizado_em` vem preenchido pelo trigger em toda linha semeada; exibi-lo seria uma data verdadeira contando uma história falsa (\"alguém alterou isto naquele dia\")."
  - "O NO-OP desabilita o CTA mas NÃO produz mensagem de erro sob o campo: não há o que corrigir, só nada a salvar. O servidor recusa o mesmo caso com 22023 — a regra vive nos dois lados."
  - "O diálogo vive na PÁGINA, não na tabela (divergência deliberada do molde 42-09): a tabela fica puramente apresentacional e a prop `onEditar`, que nasce na Task 1, deixa de ser undefined no MESMO commit em que o destino passa a existir. Nunca houve botão acionável sem destino."
  - "A asserção negativa E8 recorta o estado de ERRO explicitamente: ele carrega o \"Tentar novamente\" que a própria UI-SPEC especifica. Sem o recorte, o teste reprovaria a copy que a spec manda escrever."
  - "A prévia usa UMA chave de cache para as duas RPCs: linhas e total são o mesmo fato visto de dois ângulos, e chaves separadas permitiriam exibir um total de antes ao lado de linhas de agora — com o carimbo datando só metade da tela."
metrics:
  duration: ~25min
  completed: 2026-08-02
  tasks: 3
  commits: 5
  tsc_antes: 97
  tsc_depois: 97
  vitest_antes: 1355
  vitest_depois: 1411
actuals:
  tokens: 29767
  tasks: 3
  commits: 5
---

# Phase 43 Plan 09: `/admin/retencao` — a matriz editável e a prévia read-only Summary

A política de retenção deste sistema deixou de ser uma linha de banco que só um DBA
podia mudar: um administrador abre `/admin/retencao` pelo menu, vê a janela de cada
estado da candidatura, altera uma delas sem deploy — e lê, no mesmo ecrã, quantas
pessoas isso alcançaria **e a declaração de que nada disso apaga coisa alguma**.

## O que foi entregue

**Task 1 (tracer, TDD) — a matriz na tela, alcançável pelo menu (RETEN-01).**
`retencaoService` lê **apenas** por `listar_matriz_retencao`, com allowlist nomeada de 5
colunas e o uuid do ator deliberadamente fora dela; a nulidade é escrita à mão porque o
gerador do Supabase declara todo `RETURNS TABLE` como não-nulo e mente exatamente onde
importa (`alterado_por_nome` é nulo em toda linha de seed). `MatrizRetencaoTable`
**mescla** a resposta com o enum fechado de 8 estados, envolvida por `AsyncState` com copy
própria de vazio e de erro. `RetencaoPage` clona a estrutura do `BiasAuditPage` com os
**dois banners sempre visíveis** acima da tabela. Rota sob `RoleGuard role="administrador"`
via `lazyNamed`, e o item **Retenção** na `RHSidebar` nos três sítios — com a linha de
`getActivePageFromPath` **antes** do `/admin` genérico.

**Task 2 (TDD) — editar pela tela, com o teto imposto nos dois lados (RETEN-02).**
`janelaRetencaoSchema` (Zod `1..24`, mensagens verbatim), `useSalvarJanela` (invalida
**matriz E prévia**) e `EditarJanelaDialog` com bloco de contexto somente-leitura, campo
numérico de 2 dígitos, e `alert-dialog` **aninhado** cujo corpo nomeia o estado, o valor
antes e o valor depois — e declara o que **não** acontece.

**Task 3 — a prévia read-only, e a asserção que a mantém read-only (RETEN-04).**
`usePreviaRetencao` lê as duas RPCs agregadas sob uma chave; `PreviaRetencaoBloco` fica
abaixo da tabela, em tratamento **neutro**, com o carimbo de data do servidor obrigatório
inclusive no estado zero.

## Por que RETEN-02 exigia uma tela, e não bastava a RPC

O 43-04 já tinha registrado o ponto e esta tela é a sua conclusão: *"um DBA roda um
`UPDATE`" e "um administrador clica em salvar" são a mesma frase apenas para quem tem
credencial de banco.* O requirement diz **alterável sem deploy**, e a leitura honesta
disso é "alterável por quem administra o produto", não "alterável por quem administra o
Postgres". Antes deste plano, o caminho de escrita existia e não tinha porta.

## As quatro decisões que carregam peso, e não são estilo

**1. Ausência vira estado visível, nunca omissão.** Um estado presente no enum e ausente
da matriz renderiza como linha `— (não definida)`, com a ação desabilitada e o motivo em
texto. Hoje isso é hipotético (os 8 estados estão semeados), e é por isso que era barato
escrevê-lo agora: uma etapa **sem política** é precisamente o caso que a Phase 46 precisa
enxergar antes de armar qualquer `DELETE`, e uma tabela que apenas mapeia a resposta do
servidor o esconderia sem sinal nenhum.

**2. Uma data verdadeira suprimida porque contaria história falsa.** `atualizado_em` vem
preenchido pelo trigger em **toda** linha de seed. Exibi-lo na coluna "Última alteração"
seria tecnicamente correto e factualmente mentiroso: diria que alguém decidiu aquela
janela naquele dia. O seed mostra travessão, e a data só aparece quando `origem = 'admin'`
— isto é, quando alguém realmente decidiu.

**3. O no-op é recusado nos dois lados, e no cliente ele não é erro.** Salvar o valor que
já está lá escreveria uma linha de auditoria vazia — poluindo justamente a trilha que a
Phase 46 vai consultar para saber se alguém **realmente escolheu** aqueles números. O
servidor recusa com `22023` (provado por execução no smoke do 43-07); a tela desabilita o
CTA. E não mostra mensagem de erro sob o campo: não há o que corrigir, só nada a salvar —
tratar isso como erro de validação ensinaria o operador a procurar um defeito no valor.

**4. `origem` é a coluna que torna o seed legível como seed.** A tela distingue
"**Seed (teto consentido)**" de "**Alterado por {nome}**" porque `origem = 'seed'` não
significa que alguém escolheu 24 meses para aquele estado — significa apenas que ninguém
contestou o teto ainda. É o discriminador que a Phase 46 tem de consultar, e agora ele é
legível sem abrir o banco.

## A palavra que é proibida lá e obrigatória aqui

`automaticamente` aparece **duas vezes** nesta página, verbatim e por exigência da
43-UI-SPEC: no banner de escopo e no corpo da confirmação. Ali ela é honesta — afirma que
**nada** apaga automaticamente, que é exatamente a verdade que a fase existe para tornar
dizível. O portão de copy do 43-02 mantém `src/features/admin/` **fora** da allowlist do
candidato precisamente para permitir esta copy, e tem uma asserção dedicada a isso
(`copyPortoesLgpd.test.ts`, "src/features/admin/ está FORA da allowlist"). O portão
continua verde com esta página escrita — o recorte foi exercido, não apenas declarado.

## A asserção negativa, e o recorte que a torna utilizável

O backstop **E8** varre a árvore do bloco da prévia e exige **zero** `<button>` e zero
`<a>` nos estados **populado** e **zero**. Ela é estrutural de propósito: nenhuma asserção
sobre texto visível pegaria um "Aplicar agora" acrescentado ali daqui a seis meses.

E ela **exclui explicitamente o estado de erro**, que legitimamente carrega o "Tentar
novamente" da própria UI-SPEC. Sem esse recorte o teste reprovaria a copy que a spec manda
escrever — a mesma armadilha que o escopo do grep do 43-02 já havia documentado um nível
acima. Um teste que reprova o comportamento correto é pior que teste nenhum: ele treina
quem executa a desligá-lo. O recorte está escrito no arquivo de teste, com a razão.

Há uma segunda asserção negativa, na página inteira: **nenhum `<button>`/`<a>` de
`/admin/retencao` carrega verbo destrutivo** (verbos montados em runtime, idioma do 42-11).

## O zero que a tela mostra hoje é o número certo

Medido em PROD no 43-07: **zero candidaturas além da janela**. A matriz está semeada em 24
meses e o sistema é mais novo que isso, então `previa_retencao()` devolve zero linhas e
`previa_retencao_total()` devolve 0. A tela renderiza *"Nenhum candidato seria afetado por
esta janela hoje."* **com o carimbo de data do servidor** — porque um zero sem data
envelhece exatamente como qualquer outro número, e daqui a três meses ninguém saberá se
aquele zero é de hoje ou de quando a página foi escrita.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| `npx vitest run src/features/admin/retencao` | **49/49** (4 arquivos) |
| `npm run test:run` — repositório INTEIRO | **154 arquivos / 1411 testes verdes** (era 149/1355) |
| `npm run -s lint` (`tsc`), nos 5 commits | **97** — baseline congelada intacta |
| Portão de copy do 43-02 | verde, com `src/features/admin/` fora da allowlist |
| Rota registrada (`grep admin/retencao routes.tsx`) | OK |
| `retencao-admin` na `RHSidebar` | **3** ocorrências (os três sítios) |
| Ordem de `getActivePageFromPath` (antes de `/admin`) | provada por comportamento (2 asserções) |
| `select('*')` na feature | **0** — a feature não toca PostgREST, só as 4 RPCs |
| `text-xs` autorado na feature | **0** — toda string nova renderiza a 14px |
| Zero `--no-verify` | confirmado — os 5 commits passaram pelo hook |

## Gate do tracer

A Task 1 é `type="tracer"`, e seu `<verify>` foi re-executado **ponta a ponta antes** de
qualquer task de expansão: 16/16 verdes, `tsc` 97, rota presente, três sítios da sidebar.
O `<verify>` é integralmente `<automated>`, o plano é `autonomous: true` e não contém task
`checkpoint:*` — parar para pedir a um humano que re-rodasse um comando automatizado que
acabara de passar seria cerimônia, não verificação (mesma leitura do 43-06 e do 43-08).

## Deviations from Plan

### 1. [Rule 2 — must_have sem asserção] `RetencaoPage.test.tsx`, fora da lista de arquivos do plano

- **Encontrado em:** Task 1, ao fechar a suíte.
- **Problema:** o plano lista testes para a tabela, o diálogo e a prévia. Mas **três** das
  cinco `must_haves.truths` vivem na PÁGINA, não em nenhum desses três: os dois banners
  sempre visíveis (BD-1 + escopo honesto) e "nenhum botão desta página carrega verbo
  destrutivo" — que é também o 4º critério de sucesso do plano. Nenhuma asserção os
  alcançava.
- **Correção:** suíte de 8 casos com `RHLayout` mockado: H1/subtítulo verbatim, os dois
  banners visíveis e **não colapsáveis** (sem `<details>`, sem gatilho de mostrar/ocultar,
  nenhum ancestral com `hidden`/`aria-hidden`), a ordem banners → tabela → prévia, e a
  varredura de verbo destrutivo sobre **todo** `<button>`/`<a>` da página.
- **Commits:** `4ed6b2d` (RED), `1f3dd3c` (GREEN), `5b4662f` (+3 casos com a prévia).

### 2. [Rule 2 — a falha seria 100% silenciosa] `RHSidebarRetencao.test.tsx`

- **Problema:** a `must_have` "alcançável pelo menu" depende de **três** edições
  independentes, e errar a **ordem** de `getActivePageFromPath` não produz erro nenhum: a
  página abre, tudo parece funcionar, e o menu continua realçando "Admin". O `<verify>` do
  plano cobre isso por `grep -c`, que conta ocorrências e não sabe nada sobre ordem.
- **Correção:** 7 casos no molde do `RHSidebarRevisoes.test.tsx` (42-10), incluindo duas
  asserções dedicadas à ordem (em `/admin/retencao` o item "Admin" **não** acende; em
  `/admin/ai-logs` quem acende é "Admin") e duas à cosmética da visibilidade (D-13).
- **Commit:** `1f3dd3c`

### 3. [Rule 1 — a expectativa do RED estava errada, não a implementação] Os dois recuos e a árvore acessível do Radix

- **Encontrado em:** Task 2, no GREEN.
- **Problema:** o caso "os dois recuos existem" asseria os dois por `getByRole` **com a
  confirmação aberta**. O Radix retira o diálogo de baixo da árvore acessível enquanto o
  `alert-dialog` está aberto (comportamento correto de a11y), então "Fechar sem salvar"
  deixa de ser encontrável por role — sem nunca sair do DOM.
- **Correção:** o caso passou a asserir "Fechar sem salvar" **antes** de abrir a
  confirmação, "Voltar" **depois**, e a coexistência dos dois rótulos lendo
  `document.body.querySelectorAll('button')`. A regra substantiva (rótulos distintos,
  nenhum chamado "Cancelar") ficou **mais** protegida, não menos: a varredura pega
  qualquer botão do fluxo, inclusive os do portal.
- **Commit:** `382cd55`

### 4. [Rule 3 — infraestrutura de teste] `QueryClientProvider` na suíte da página

Ao montar o `EditarJanelaDialog`, a página passou a chamar `useSalvarJanela` → `useQueryClient`
**antes** do `return null` de diálogo fechado (regra dos hooks). A suíte da página ganhou um
provider; nenhuma query é disparada, porque os hooks de leitura estão mockados. **Commit:** `382cd55`

### 5. [Diferença literal em relação ao texto do plano] `salvarJanela` e `lerPrevia` no serviço

O plano lista `retencaoService.ts` apenas nos arquivos da Task 1, e descreve
`useSalvarJanela`/`usePreviaRetencao` como "`useMutation` sobre a RPC". Os dois caminhos de
rede foram escritos **no serviço** (Tasks 2 e 3) em vez de dentro dos hooks, seguindo a
convenção viva do projeto (`camelCaseService.ts` com classe de erro própria; CLAUDE.md).
Chamar `supabase.rpc` de dentro de um hook teria posto rede em duas camadas diferentes da
mesma feature.

### 6. [Copy autorada, marcada como tal no código] Dois pontos em que a UI-SPEC é silenciosa

- **`acaoIndisponivel`** — "Este estado ainda não está na matriz de retenção." A spec cobre
  o parcial "estado fora da matriz" do lado da **leitura**, não do lado da **ação**. Como
  `salvar_janela_retencao` recusa essa etapa com `22023`, oferecer o botão seria oferecer
  uma ação que o servidor já decidiu recusar. O motivo é dito em texto (`title` + `sr-only`),
  nunca só por opacidade.
- **Origem de uma linha não definida** — a spec diz "Origem vazia"; foi renderizado o
  **travessão**, que é o idioma vivo do projeto para "não há valor" (documentado no
  `FilaRevisoesTable`). Célula em branco seria ambígua com "não conseguimos ler".

## O que este plano NÃO entrega, e é preciso dizer

- **Isto não está no navegador de ninguém.** As 4 migrations estão em PROD desde o 43-07,
  mas **nenhum plano desta fase publica o bundle do cliente**. `/admin/retencao` existe em
  código e em teste; um administrador só a alcança depois de um deploy de frontend, que
  esta fase não faz.
- **Nada nesta página apaga dados, e nada no sistema apaga hoje.** A matriz é configuração
  e só começa a **morder** na Phase 46 — que, por decisão registrada no `COMMENT` da
  própria tabela, **não pode ligar a purga** enquanto `origem = 'seed'` em todas as linhas.
- **Verificação visual real não foi feita.** `happy-dom` não calcula layout: a hierarquia
  (banners → tabela → prévia) foi provada por ordem no DOM, não por render. Fica para o UAT
  da fase, como já ficou o backstop equivalente do 43-03 e do 43-08.
- **A prévia mostra zero, e continuará mostrando zero por meses.** Isso torna o estado
  populado desta tela **não exercitado contra dados reais** — ele está provado apenas por
  teste. É o registro honesto: o primeiro número diferente de zero aparecerá quando a base
  passar dos 24 meses, ou quando alguém encurtar uma janela.

## Known Stubs

Nenhum. Os quatro componentes renderizam dado real do servidor em todos os estados; os
esqueletos de RED das Tasks 1 e 2 foram substituídos pela implementação nos commits
`1f3dd3c` e `382cd55` respectivamente, dentro deste mesmo plano.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As seis mitigações previstas
foram implementadas:

| Threat | Como ficou |
|--------|-----------|
| T-43-43 (EoP no acesso à matriz) | `RoleGuard role="administrador"` na rota + policy admin-only + guard NULL-safe nas RPCs; a visibilidade do item de menu é cosmética (D-13), e a suíte da sidebar assere isso como cosmética, não como controle |
| T-43-44 (teto burlado pelo cliente) | Zod cosmético **declarado como tal no docblock**; `CHECK` da tabela + `22023` da RPC são o controle. A ordem da frase está escrita no arquivo |
| T-43-45 (prévia identificando candidato) | A feature nunca chama o predicado identificável (que não tem `GRANT` para papel de cliente); backstop E8 estrutural nos estados populado e zero |
| T-43-46 (`usuarios_rh` na tela) | Zero leitura direta: o nome vem resolvido por `listar_matriz_retencao`, e o uuid do ator está fora da allowlist do serviço |
| T-43-47 (ação destrutiva sugerida) | Banner de escopo sempre visível + asserção negativa de verbo destrutivo na página inteira e no diálogo (incluindo o portal do `alert-dialog`) |
| T-43-48 (número de prévia sem data) | Carimbo obrigatório de `calculada_em`, **inclusive no estado zero**; sem carimbo do servidor, nenhuma data é inventada (caso testado) |
| T-43-SC (pacotes) | **Zero dependência npm nova**; nenhum `npx shadcn add`/`init` |

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `4ed6b2d` | test | Task 1 RED — 16 casos (tabela + página), esqueletos com assinatura final |
| 2 | `1f3dd3c` | feat | Task 1 GREEN — matriz mesclada com o enum, banners, rota, 3 sítios da sidebar |
| 3 | `413cf77` | test | Task 2 RED — 17 casos sobre os seis comportamentos da edição |
| 4 | `382cd55` | feat | Task 2 GREEN — diálogo, confirmação aninhada, no-op recusado nos dois lados |
| 5 | `5b4662f` | feat | Task 3 — prévia read-only, carimbo do servidor, backstop E8 com escopo recortado |

## Self-Check: PASSED

Os 14 arquivos criados existem em disco; os 5 hashes de commit existem em `git log`.
Verificado após a escrita deste arquivo.
