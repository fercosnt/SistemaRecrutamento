---
phase: 44
plan: 07
subsystem: export
status: checkpoint
tags: [lgpd, export-03, signed-url, storage, rls, client-side, tdd, ui, art-18-ii]

requires:
  - "44-06 — `exportacaoService`, `PedirCopiaBloco` e a seção 3 da página; este plano os ESTENDE, não os reescreve"
  - "As DUAS policies de SELECT do bucket `curriculos`, OR'd, medidas vivas no M4 (2026-08-03) — são elas que autorizam a cunhagem sem `service_role`. ⚠ NÃO re-confirmadas nesta execução (sem MCP); ver §Checkpoint"
provides:
  - "src/features/privacidade/services/exportacaoService.ts — `listarMeusCurriculos`, `mintarUrlCurriculoProprio`, `CURRICULOS_ALLOWLIST`, `TTL_CURRICULO_SEGUNDOS`, `BUCKET_CURRICULOS`, `COPY_CURRICULO_ERRO`, tipo `LinhaCurriculo`"
  - "src/features/privacidade/hooks/useMeusCurriculos.ts — a lista, com `retry` no default do QueryClient (divergência deliberada do irmão)"
  - "privacidadeKeys.curriculosPorCandidatura — chave nova na fábrica EXISTENTE, separada da `curriculo` booleana da seção 2"
  - "CurriculosBloco + COPY_CURRICULOS — apresentação pura, estado POR LINHA, falha por linha"
  - "PrivacidadeCandidatoPage — os três ramos da leitura nova dentro da seção 3, abaixo do CTA"
affects:
  - "45 — o caminho de Storage lido aqui é o mesmo que o motor de exclusão terá de capturar ANTES da 1ª mutação; e as três policies de INSERT com duas convenções de pasta (achado colateral do M4) deixam de ser latentes quando 'achar o blob' vira destrutivo"

tech-stack:
  patterns:
    - "cunhagem client-side de signed URL com o JWT do próprio titular — `service_role` fora do caminho do CV dele (BD-7)"
    - "estado por LINHA como conjuntos de ids, nunca booleano escalar, em lista com ação por item"
    - "asserção load-bearing sobre as linhas que NÃO falharam, verificada por MUTAÇÃO antes de ser creditada"
    - "sonda de texto-fonte com escopo de MÓDULO (não de função) para ausência de registro de log"
    - "`new URL(<literal>, import.meta.url)` é reescrito pelo Vite para URL de asset — o caminho tem de passar por variável"
    - "gancho `data-*` próprio para esqueleto de carregamento quando um irmão da mesma seção já pulsa"

key-files:
  created:
    - src/features/privacidade/components/CurriculosBloco.tsx
    - src/features/privacidade/components/__tests__/CurriculosBloco.test.tsx
    - src/features/privacidade/hooks/useMeusCurriculos.ts
  modified:
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - src/features/privacidade/hooks/usePrivacidade.ts
    - src/features/privacidade/components/PrivacidadeCandidatoPage.tsx
    - src/features/privacidade/components/__tests__/PrivacidadeCandidatoPage.test.tsx

decisions:
  - "A leitura NÃO esconde candidatura removida de forma suave, e o teste (ac) prende a AUSÊNCIA do predicado (`is` nunca chamado, nenhum filtro sobre a coluna de remoção). O predicado oposto existe em `get-curriculo-url` (WR-03) e serve a outro fato: lá o leitor é um RH, aqui é o dono do arquivo. Negar ao dono a existência de um arquivo que a empresa guarda é a mentira oposta à que este milestone corrige."
  - "`COPY_CURRICULO_ERRO` mora no SERVIÇO, que é quem lança, e o componente compõe a segunda sentença sobre ela. Duas frases independentes para o mesmo fato divergiriam no dia em que alguém editasse uma delas — e o titular veria uma ou outra conforme o caminho que falhou."
  - "O `retry` de `useMeusCurriculos` fica no default do QueryClient, ao lado de um irmão com `retry: false`. A divergência está escrita no docblock: o irmão lê um estado que o servidor reavalia no clique; este lê a lista que É o conteúdo do bloco, e desistir na primeira falha esconderia currículos do próprio dono por um soluço de rede."
  - "A a 320px a linha EMPILHA (`flex-col` / `sm:flex-row`). Medido: sobram 256px úteis e o botão ocupa ~210px — lado a lado o título da vaga ficaria com ~34px, quatro caracteres. Truncar até a ilegibilidade apaga a informação que o par truncate+tooltip existe para preservar, e no celular não há hover que a recupere."
  - "O esqueleto de carregamento da leitura nova ganhou gancho `data-carregando` próprio depois de o RED mostrar que a asserção genérica sobre `.animate-pulse` na seção 3 já passava — o `PedirCopiaBloco:130` renderiza um pulsante seu. Sétimo portão desta fase que não media o que dizia medir."
  - "EXPORT-03 NÃO marcado Complete. O código está inteiro e verde; ninguém abriu um currículo. Sétima recusa desta fase, pelo mesmo critério do 44-01, que teve de REVERTER uma marcação falsa."

metrics:
  duration: ~35min
  completed: 2026-08-04
  tasks: 3 de 3
  commits: 4
  files: 8

actuals:
  tokens: 12700
  tasks: 3
  commits: 4
---

# Phase 44 Plan 07: O CV do titular ganha superfície — Summary

O titular passa a **abrir o próprio currículo** a partir de `/candidato/privacidade`, por uma URL
assinada de 60 s que **ele mesmo cunha, no clique, com o próprio JWT**. `service_role` não encosta no
arquivo dele em ponto nenhum, e a autorização é a RLS do bucket — não uma função privilegiada.

**Nenhuma linha de candidato foi lida, escrita ou tocada. Nada tocou PROD.**

## A frase que este plano tornou verdadeira

Os dois arquivos entregues pelo 44-06 dizem, por escrito, que o currículo é baixado à parte, *"pelo
botão abaixo, por um link gerado na hora e válido por poucos segundos"*. Até este plano esse botão
não existia — e `COPY_PEDIR_COPIA.sobreCurriculo` estava na constante **deliberadamente não
renderizada**, com docblock dizendo exatamente isso (44-06, §Known Stubs item 1).

O botão existe agora. ⚠ **Mas a copy `sobreCurriculo` segue não renderizada** — ver §Known Stubs.

## O caminho de menor privilégio, e por que ele é menor

| | Caminho do RH (Phase 32, vivo) | Caminho do titular (este plano) |
|---|---|---|
| Quem cunha | Edge Function `get-curriculo-url` | O navegador do titular |
| Com que credencial | `service_role` (bypassa RLS) | o JWT do próprio candidato, client anon |
| O que autoriza | `if` dentro da EF, sobre posse da vaga | as **duas** policies de SELECT do bucket, OR'd |
| TTL | 60 s (`index.ts:206`) | **os mesmos 60 s**, por constante nomeada |
| O que o candidato recebe daquela EF | **403** (`index.ts:139-141`) | — |

O `3600` de `perfilRhService.ts:294` **não** é precedente e o docblock diz por quê: foto de perfil
não é PII do titular sob o Art. 18, II, e um segundo número aqui exigiria justificar por que o CV do
próprio dono merece janela mais frouxa que o CV visto pela equipe de recrutamento.

⚠ **O `CvButton` foi reusado como MECANISMO e recusado como FONTE DE DADOS.** Quem "reusasse o
componente inteiro" entregaria 403 ao dono do arquivo. Está escrito no docblock de
`mintarUrlCurriculoProprio`, junto com o n=3 do M5 e a propriedade das policies OR'd.

## As três asserções que fazem esta suíte valer mais que a média

### 1 · (am) olha para as linhas que NÃO falharam — e foi verificada por MUTAÇÃO

O análogo é um botão solto com dois booleanos escalares. Aqui é uma lista, e a cópia cega produziria
erro **global**: a copy certa, no lugar certo, dizendo a coisa certa sobre a **linha errada**. Nenhum
teste textual pegaria isso.

A asserção load-bearing é sobre as **outras** linhas:

```
for (const indice of [0, 2]) {
  expect(within(outra).getByRole('button')).toBeEnabled()
  expect(within(outra).queryByText(COPY_CURRICULOS.erro)).not.toBeInTheDocument()
}
```

E ela foi **exercitada, não assumida**. Mutação aplicada ao componente
(`const falhou = comErro.has(linha.id)` → `comErro.size > 0`, que é literalmente a cópia cega):

| Resultado | Leitura |
|---|---|
| **1 failed \| 9 passed** — e o que falhou foi (am) | a asserção morde, e é a única que morde esse defeito |

Um teste que passa na primeira tentativa é indistinguível de um teste que não mede nada até alguém o
quebrar de propósito. Este foi quebrado de propósito.

### 2 · (ap) varre o documento atrás da URL assinada, com os tokens montados em runtime

Depois de um clique bem-sucedido, `container.innerHTML` e `document.body.innerHTML` não podem conter
nenhuma substring da URL. Os dois tokens (`X-Amz-Signature` e o valor) são montados por `join` — o
arquivo que proíbe a string não a contém verbatim (idioma 42-11) — e há META-TEST provando que a
busca acharia se estivesse lá.

É a gêmea da asserção que o 44-06 já carrega sobre os dois arquivos entregues (caso (p)). Juntas
fecham a Invariante 4 nos três lugares onde a URL poderia sobrar: o arquivo, o cache e o DOM.

### 3 · (af) tem escopo de MÓDULO, não de função

A sonda de texto-fonte lê o `exportacaoService.ts` inteiro e exige zero chamada de registro de log —
não só dentro da função que cunha. A razão é temporal: uma linha acrescentada seis meses depois em
**qualquer ponto** deste serviço tem a URL assinada ao alcance da mão, e um TTL de 60 s vira um link
colado no console de quem estiver olhando a tela.

## Os dois defeitos que o RED encontrou nas MINHAS asserções

### (ar) passava com o ramo novo inexistente — o sétimo portão morto desta fase

Escrita como `secao3.querySelector('.animate-pulse')`, ela **passou no RED**. Causa: o
`PedirCopiaBloco:130` já renderiza um `Glass` pulsante próprio, então a asserção genérica sobre a
seção casava com o pulsante do vizinho e teria dado verde para uma implementação que nunca escreveu
o ramo de carregamento.

Corrigida com gancho próprio (`data-carregando="curriculos"`) e reprovou imediatamente. ⚠ O `Glass`
não repassa atributos arbitrários, então o gancho vive num `div` sem classe alguma — zero efeito
visual, zero alteração de fluxo, e está dito no comentário do código.

Esta fase agora tem **sete** portões que não mediam o que diziam medir. Os cinco anteriores foram de
`grep -c`; estes dois são de asserção de teste. A família é a mesma: **a forma parecia a substância**.

### (af) reprovava por um motivo que não era o dela

`new URL('../exportacaoService.ts', import.meta.url)` falhava com *"The URL must be of scheme file"*.
Não era o código sob teste: o **Vite reescreve estaticamente** `new URL(<literal>, import.meta.url)`
para uma URL de asset (`http:`), e `fileURLToPath` então recusa. O caso (t), que já vivia no arquivo,
escapa disso por acidente feliz — passa o caminho por **variável**, e a análise estática não dispara.

Corrigido pela mesma forma, com o motivo escrito no teste. Um RED que falha pela razão errada é um
RED que não prova nada.

## O desvio: a 320px o título da vaga ficava com quatro caracteres

**[Regra 2] A linha passou a EMPILHAR abaixo de 640px.** O plano manda "o botão da linha ao lado", e
lado a lado é o que a §Sub-bloco descreve. Medido antes de escrever prosa sobre isso:

| Grandeza | Valor |
|---|---|
| Largura útil a 320px (320 − `px-4` da página − `p-4` do bloco) | **256px** |
| Botão (`px-5` + ícone + `gap-2` + "Abrir meu currículo" a 14px semibold) | **~210px** |
| Sobra para o título, lado a lado | **~34px — quatro caracteres** |

Truncar até a ilegibilidade **apaga** exatamente a informação que o par `truncate`+tooltip existe
para preservar, e no celular não há hover que a recupere. Esta é a superfície do candidato, que é
mobile-first por contrato (CLAUDE.md). `flex-col` até `sm`, `sm:flex-row` acima; botão `self-start`,
nunca largura cheia — largura cheia faria a ação da linha competir com o CTA da seção, que é o que a
§Emenda da UI-SPEC protege.

O caso **(ah2)** prende o remédio de forma **estrutural**, e o teste diz por quê: o jsdom não calcula
layout, então medir pixels ali seria medir zero. O número medido vive no docblock do componente,
onde o próximo leitor o encontra antes de "simplificar" as classes.

## Verificação

| Critério | Resultado |
|---|---|
| `npx vitest run src/features/privacidade/` | **93/93** ✓ (era 68 antes deste plano) |
| `npm run test:run` | **167 arquivos / 1584 testes** ✓ (era 167/1559) |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada, zero regressão ✓ |
| `.husky/pre-commit` | rodou e passou nos **4** commits. **Zero `--no-verify`** ✓ |
| `git diff --exit-code package.json` | **sem alteração** — zero dependência npm nova ✓ |
| `grep -c 'CURRICULOS_ALLOWLIST'` no serviço | **2** (critério: ≥ 2) ✓ |
| `grep -c 'TTL_CURRICULO_SEGUNDOS = 60'` no serviço | **1** ✓ |
| `grep -c 'BUCKET_CURRICULOS'` no serviço | **2** (critério: ≥ 2) ✓ |
| projeção total na allowlist | ausente — provado por (ab), literal montado em runtime ✓ |
| chamada de log no serviço | ausente — provado por (af), escopo de módulo ✓ |
| estado escalar no bloco | **0** · e (am) verificada por mutação ✓ |
| `curriculosPorCandidatura` em `usePrivacidade.ts` | **1** ✓ |
| `aria-live` / `aria-busy` / `min-h-[44px]` no bloco | **1 / 1 / 1** ✓ |
| verbo de transferência de arquivo no bloco (forma filtrada) | **0** ✓ |
| `text-xs` / accent no bloco (forma filtrada) | **0** ✓ |
| `overflow-*` / `max-h-*` no bloco | **0** ✓ |
| `CurriculosBloco` na página | **3** (critério: ≥ 2) ✓ |
| `erroGuardaTitulo` na página | **4** (critério: ≥ 3) · **zero** chave nova em `COPY_PRIVACIDADE` ✓ |
| diff da página | **53 adições, 0 deleções** — seções 1 e 2 byte-idênticas ✓ |

### ⚠ O oitavo portão morto: `grep -crE 'Keys = \{' … devolve 1`

O critério da Task 2 pede que esse comando "devolva 1". Ele **não pode**: `grep -c` com `-r` sobre um
**diretório** imprime `caminho:contagem` por arquivo, nunca um número solto. Medido:

```
src/features/privacidade/hooks/useUltimoPedidoDados.ts:0
src/features/privacidade/hooks/useMeusCurriculos.ts:0
src/features/privacidade/hooks/usePrivacidade.ts:1
src/features/privacidade/hooks/useRevogarMarketing.ts:0
src/features/privacidade/hooks/useExportarMeusDados.ts:0
```

A **substância** — "nenhuma fábrica nova foi criada" — foi medida pela forma que a expressa:
`grep -rlE 'Keys = \{' … | wc -l` → **1**. Um arquivo, `usePrivacidade.ts`, e a chave nova entrou
nele. O portão não foi afrouxado; foi trocado por um que morde.

### Revisão a 320px

Registrada em §O desvio, acima, com o número medido. O bloco não tem classe de altura fixa nem
`overflow-*` (verificado por grep e pelo caso (ak2), que varre a marcação renderizada). As linhas
empilham em altura livre e o título trunca com o valor íntegro alcançável pelo atributo de tooltip.

⚠ **Isto é medição aritmética + jsdom, não olho humano em navegador.** O que nenhum dos dois
substitui está no §Checkpoint.

## Checkpoint — o que NÃO foi provado, e por quê

Duas coisas deste plano dependem de acesso vivo que o executor não tem (premissa registrada em
`STATE.md`, [M8/ambiente]: subagentes GSD não recebem os tools MCP do Supabase).

### 1 · A precondição da Task 1 não foi re-confirmada

O plano manda confirmar, **antes** de escrever a função, que as duas policies de SELECT do bucket
seguem vivas — e diz explicitamente *"orquestrador, via MCP"*. Não há MCP aqui.

**O que sustenta o código mesmo assim:** o M4 mediu as duas policies vivas em **2026-08-03**, um dia
atrás, e **nada nesta fase tocou `storage.objects`**. O fato é recente e a superfície não se moveu.
**O que isso não é:** uma re-confirmação. Se alguma policy tiver sumido, `createSignedUrl` passa a
falhar para o titular — e o desenho degrada exatamente como projetado: **erro visível por linha**,
copy própria, as outras linhas operantes. Nenhum dado se perde, nada fica em estado inconsistente.

Consulta a rodar: `SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects'`

### 2 · O UAT ao vivo do `<human-check>` da Task 3 NÃO rodou

É a linha manual do `44-VALIDATION` §Manual-Only Verifications, e **não é mockável de forma
honesta**: o Storage é real, a policy é real, a sessão é real, e o que está em prova é justamente se
uma medição de **n=3** se sustenta fora da medição. Três currículos não provam um formato de pasta.

Roteiro, verbatim do plano, com o campo de cada resultado em aberto:

| # | Passo | Resultado |
|---|---|---|
| 1 | Login com a conta de candidato de TESTE que tem currículo (precedente: `candidato.funil@teste.com`); ir a `/candidato/privacidade` | ⏳ |
| 2 | Seção 3 mostra o CTA e, **abaixo dele**, "Seu currículo" — **quantas linhas?** | ⏳ |
| 3 | Clicar **Abrir meu currículo** na 1ª linha; o arquivo abre em aba nova | ⏳ |
| 4 | Copiar a URL, esperar ~90 s, recarregar — ela **tem de** expirar | ⏳ |
| 5 | Se der **403/400: PARAR** e registrar o caminho medido (é a hipótese que o n=3 não excluía — currículo na outra convenção de pasta). O conserto é da policy ou da convenção de upload, **nunca** do componente | ⏳ |
| 6 | DevTools aberto durante o clique: (a) o console **não** recebe a URL; (b) inspecionando o bloco depois, a URL **não** está em atributo nenhum; (c) **nenhuma** chamada a `get-curriculo-url` | ⏳ |

⚠ O passo 4 é o que torna honesta a frase "válido por poucos segundos" que a seção 3 mostra ao
titular. Uma URL que ainda funciona depois de dois minutos significa que o TTL não é o que o código
diz — e o código diz 60, por constante, provado por teste no argumento da cunhagem.

## Requirements — nada marcado Complete

| Req | Marcado | Por quê |
|---|---|---|
| **EXPORT-03** | ❌ | *"Currículo entregue por signed URL de TTL curto a partir de bucket privado, nunca inline nem base64"*. As três metades verificáveis por código estão feitas e testadas — TTL curto por constante, bucket privado, e as asserções negativas de que nem conteúdo nem base64 nem link entram nos arquivos. A que falta é a única que importa para o titular: **ninguém abriu um currículo**. Fecha junto com o §Checkpoint. |

Sétima recusa desta fase. Continua valendo o critério do 44-01, que teve de **reverter** uma marcação
falsa: o requirement fala do que o titular recebe, não do que o repo contém.

## Known Stubs

**Nenhum stub de código.** Zero `TODO`/`FIXME`/placeholder, zero `t.skip`/`test.todo`, zero
`--no-verify`, zero dependência npm nova.

Um item de escopo, deliberado e nomeado:

1. **`COPY_PEDIR_COPIA.sobreCurriculo` continua não renderizada.** O 44-06 a adiou para este plano
   porque ela nomeia "o botão abaixo", e o botão não existia. O botão existe agora — mas a copy vive
   em `COPY_PEDIR_COPIA`, que é a constante do `PedirCopiaBloco`, e o plano 44-07 **não lista
   `PedirCopiaBloco.tsx` em `files_modified`** nem manda renderizá-la em lugar nenhum: a §Component
   Inventory da UI-SPEC monta na seção 3 o `PedirCopiaBloco` **+** o `CurriculosBloco`, e o texto
   "Sobre o currículo" não foi atribuído a nenhum dos dois. Renderizá-la por conta própria seria
   autorar posicionamento de copy fora da spec, num bloco fora do escopo declarado deste plano.
   **É o último texto da §Seção 3 ainda ausente da tela**, e agora o controle que ele nomeia existe —
   então o impedimento que o 44-06 registrou deixou de valer. Cabe a uma decisão de UI-SPEC dizer em
   qual dos dois blocos ele mora.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. As sete mitigações estão implementadas e
**todas** provadas por teste:

| Threat | Mitigação | Prova |
|---|---|---|
| T-44-29 (EoP horizontal) | caminho SÓ de `listarMeusCurriculos`, own-row; RLS do bucket é o controle real | (ad) argumento exato · (al) o caminho daquela linha · (ac) filtro own-row |
| T-44-30 (projeção) | `CURRICULOS_ALLOWLIST` nomeada, embed também por allowlist | (aa) igualdade com a constante · (ab) ausência de projeção total |
| T-44-03 (URL persistida) | cunhada no clique, direto para a aba; só flags booleanas em estado | (ap) varredura do HTML renderizado, tokens em runtime |
| T-44-32 (URL em log) | módulo inteiro livre de chamada de log | (af) sonda de texto-fonte, escopo de módulo |
| T-44-31 (erro cru na tela) | `ExportacaoError` com copy fixa; transporte não atravessa | (ae) Storage · (ae2) PostgREST · (am) o erro cru não aparece na tela |
| T-44-33 (falha derrubando o bloco) | estado por linha; popup barrado vira erro visível | (am) **verificada por mutação** · (ao) aba nula · (an) voo por linha |
| T-44-34 (linha omitida) | não esconde removida de forma suave; vaga sem título vira rótulo | (ac) ausência do predicado · (ai) **conta** as linhas |

## Commits

| Hash | O quê |
|---|---|
| `ea7fc22` | o caminho de menor privilégio: `listarMeusCurriculos` + `mintarUrlCurriculoProprio` |
| `68481d9` | o `CurriculosBloco` com estado por linha, a chave na fábrica viva e o hook |
| `9b0ded8` | o mount na seção 3, abaixo do CTA, com a copy de erro reusada |
| `6a244c2` | a 320px a linha empilha — o título da vaga não vale quatro caracteres |

## Nota de método sobre `actuals.tokens`

**12.700** = chars/4 sobre o diff realizado (50.918 chars adicionados), que é o método prescrito. ⚠
Registrado aqui porque o número **não é comparável** ao `estimate: 58000` do plano sem conhecer a
base do planejador: o 44-06, com um diff **maior** (66.606 chars → 16.651 por este método), registrou
`actuals.tokens: 41000`. As duas medições estão em escalas diferentes, e mediá-las produziria uma
calibração que não descreve nenhuma das duas. Preferi o número medido pelo método escrito a um número
que parecesse próximo da estimativa.

## Self-Check: PASSED

- Arquivos criados/modificados: **8/8 FOUND**
- Commits: `ea7fc22`, `68481d9`, `9b0ded8`, `6a244c2` — **4/4 FOUND** no histórico
- 93 testes na feature · 1584 na suíte · tsc **97** (baseline intacta)
- Zero `--no-verify`, zero stub de código, zero `t.skip`, zero dependência npm nova
