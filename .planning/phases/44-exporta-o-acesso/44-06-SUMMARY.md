---
phase: 44
plan: 06
subsystem: export
status: complete
tags: [lgpd, export, art-18-ii, escape, cooldown, copy, tdd, ui, export-06]

requires:
  - "44-05 — `exportacaoService`, `useExportarMeusDados`, `PedirCopiaBloco` e a seção 3 da página; este plano os ESTENDE, não os reescreve"
  - "public.solicitacoes_dados VIVA em PROD (44-04) — a policy own-row medida no retrato do M3 é o que autoriza a leitura do cooldown"
  - "supabase/functions/_shared/exportAllowlist.ts — a `versao` que o rodapé do `.html` carrega vem da resposta da EF, que a lê do artefato"
provides:
  - "src/features/privacidade/services/exportacaoService.ts — `escapeHtml`, `gerarHtmlExport` (PURA), `formatarDataHoraPtBr`, `nomesArquivosExport`, `lerUltimoPedidoDados`, `calcularLiberacaoCooldown`, `COPY_ARQUIVO`, `COPY_COOLDOWN`, `TRAVESSAO`"
  - "src/features/privacidade/hooks/useUltimoPedidoDados.ts — estado do cooldown, `retry: false`, erro resolve para `null`"
  - "privacidadeKeys.ultimoPedido — chave nova na fábrica EXISTENTE"
  - "PedirCopiaBloco — os CINCO estados + a copy completa da §Seção 3 (menos `sobreCurriculo`, que é do 44-07)"
  - "useExportarMeusDados — dispara os DOIS arquivos, `.json` na frente"
affects:
  - "44-07 — renderiza `COPY_PEDIR_COPIA.sobreCurriculo`, que já existe na constante e é o único texto da §Seção 3 ainda não renderizado; é o `CurriculosBloco` que torna 'o botão abaixo' verdadeiro"
  - "45 — o `.html` é o primeiro artefato que declara ao titular, por escrito, que baixar NÃO apaga; quando o motor de exclusão existir, essa frase é o que muda"

tech-stack:
  patterns:
    - "escape com o `&` PRIMEIRO e ZERO lista de campos seguros — a allowlist cresce por geração automática e a coluna nova entraria sem ninguém revisitar a lista"
    - "prova de não-execução pelo PARSER (`DOMParser` + `querySelectorAll`), não por substring — 'escapado' × 'escapado pela metade' é indistinguível para um grep"
    - "backstop ESTRUTURAL sobre `button[disabled]` — percorre os botões e exige irmão com texto, em vez de asserir uma string"
    - "fonte única de copy provada comparando os DOIS valores renderizados entre si, nunca cada um contra um literal"
    - "nomes de arquivo derivados de UM instante do servidor, compartilhados entre o disparo e a tela"
    - "ponte de tipos estreita (nome de tabela literal) enquanto `database.types.ts` segue não-regenerado — idioma verbatim do 44-08"

key-files:
  created:
    - src/features/privacidade/hooks/useUltimoPedidoDados.ts
  modified:
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - src/features/privacidade/components/PedirCopiaBloco.tsx
    - src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx
    - src/features/privacidade/hooks/useExportarMeusDados.ts
    - src/features/privacidade/hooks/usePrivacidade.ts

decisions:
  - "O carimbo do `.html` sai de `resposta.gerado_em` (o instante do SERVIDOR), não de `new Date()`: é o que mantém `gerarHtmlExport` PURA e é o mesmo instante que o `.json` registra. Dois relógios produziriam dois arquivos do mesmo pedido com datas diferentes."
  - "`curriculo_url` fica FORA do arquivo legível e DENTRO do `.json`. Assimetria deliberada: o caminho de Storage é identificador interno de infraestrutura, não diz nada a uma pessoa, e a Invariante 4 governa o que o titular LÊ. O `.json` é lido por máquina e o 44-05 já registrou que aquilo é caminho, não link. Nenhum dos dois carrega link assinado, que é a proibição de verdade."
  - "O motivo visível ao lado do botão desabilitado vale para TODO `disabled` do bloco, não só o cooldown. A Invariante 3(iii) fala do cooldown, mas a propriedade é estrutural: um `disabled` sem motivo é indistinguível de tela quebrada, qualquer que seja a causa — e é isso que torna o backstop (z3) capaz de pegar um `disabled` acrescentado depois."
  - "A copy `sobreCurriculo` entrou na constante e NÃO é renderizada: ela nomeia 'o botão abaixo', que é o `CurriculosBloco` do 44-07. Renderizá-la hoje apontaria o titular para um controle inexistente — mesmo critério que fez o 44-05 adiar `comoChega`."
  - "Os nomes dos dois arquivos saem de `nomesArquivosExport(resposta)`, chamada pelo disparo E pela tela. Duas derivações independentes divergiriam na virada de dia em UTC, e o titular procuraria na pasta de downloads um nome que ninguém escreveu."
  - "Seções vazias são RENDERIZADAS com 'Nenhum registro.' em vez de omitidas: a fronteira do EXPORT-06 fica concreta — a pessoa vê quais categorias existem e quais estão vazias, em vez de inferir da ausência."
  - "A sonda de `sonner` procura a forma de IMPORT, não o nome solto: o docblock cita a biblioteca para explicar por que ela não é usada, e um grep sobre o nome reprovaria a própria justificativa do ban (defeito que este projeto já pagou 2×)."

metrics:
  duration: ~55min
  completed: 2026-08-04
  tasks: 3 de 3
  commits: 3
  files: 7

actuals:
  tokens: 41000
  tasks: 3
  commits: 3
---

# Phase 44 Plan 06: A cópia deixa de ser um arquivo de máquina — Summary

O titular passa a receber **dois** arquivos do mesmo pedido, com o `.json` na frente, e o segundo é
feito para uma pessoa ler: carimbo de geração no topo, uma seção por tabela com rótulos em pt-BR,
**todo** valor escapado, as duas seções de fronteira obrigatórias e a versão da allowlist no rodapé.
O CTA ganhou os dois estados que faltavam — o sucesso que persiste **nomeando os arquivos** e o
cooldown que nunca aparece como botão morto.

**Nenhuma linha de candidato foi lida, escrita ou tocada. Nada tocou PROD.**

## A frase que este plano tornou verdadeira

O 44-05 deixou uma instrução literal, e ela é o eixo deste plano:

> ⚠ **O que o 44-06 tem de fazer:** acrescentar `comoChega` e o estado de sucesso a
> `COPY_PEDIR_COPIA` **no mesmo commit** em que o `.html` entrar na lista de `dispararDownloads`.
> Separar os dois reintroduz a mentira por uma janela de commits.

Foi cumprida ao pé da letra: `20d93d5` contém, juntos, o `useExportarMeusDados` disparando dois
arquivos **e** a linha "Você recebe dois arquivos" aparecendo na tela. O `gerarHtmlExport` nasceu um
commit antes (`277c0cb`), exportado e testado mas **não consumido** — dead-ish por dois commits, o
que é o lado seguro do erro: subestimar o que foi entregue nunca vira retratação escrita.

## O que o `.html` encoda, em uma tabela

| Item | Onde vive | O que o teste prende |
|---|---|---|
| Título **Seus dados na Beauty Smile** | `<h1>` e `<title>` | (n) |
| Carimbo `dd/mm/aaaa às HH:mm`, **no topo** | `<p class="carimbo">` | (n), com o índice comparado ao 1º bloco de dados |
| Uma seção por tabela, rótulos pt-BR | 30 rótulos + humanizador | (n), (p), (q) |
| **Todo** valor escapado | `escapeHtml`, 18 sítios | (l), (m) |
| Currículo: só nome + data + frase fixa | `COLUNAS_FORA_DO_ARQUIVO_LEGIVEL` | (p) |
| **O que não está nesta cópia** | seção, razão idêntica à da tela | (n) |
| **O que esta cópia não faz** | seção de fecho | (n) |
| Versão da allowlist + data | `<footer>` | (o) |
| Ordem `.json` → `.html` | `dispararDownloads` | (r), por ORDEM de clique |

**24 casos verdes** no serviço, **13** no componente.

## As três asserções que fazem esta suíte valer mais que a média

### 1 · O payload hostil é julgado pelo PARSER, não por substring (caso m)

A primeira versão do teste assertava `not.toContain('onerror=')` e **reprovou o código correto**: o
valor escapado sai como `&lt;img src=x onerror=&quot;alert(1)&quot;&gt;`, onde a substring
`onerror=` sobrevive — inerte, porque não existe tag nenhuma ao redor dela.

A asserção foi trocada por uma que pergunta a quem decide:

```
const doc = new DOMParser().parseFromString(html, 'text/html')
expect(doc.querySelectorAll('img').length).toBe(0)
expect(doc.querySelectorAll('[onerror]').length).toBe(0)
expect(doc.body.textContent).toContain(tagScript)   // …e o dado NÃO foi descartado
```

Uma sonda de substring não distingue "escapado" de "escapado pela metade". Esta distingue — e a
última linha prende a outra metade do contrato: o dado do titular continua **legível**, não sumiu.

### 2 · O backstop do `disabled` é estrutural e roda nos DOIS cenários (caso z3)

O teste percorre `container.querySelectorAll('button[disabled]')` e exige, para **cada** botão, um
irmão com texto visível não-vazio. Roda no cooldown **e** no "em voo".

Isso obrigou uma decisão de produto: o "em voo" também ganhou motivo ao lado
(`COPY_PEDIR_COPIA.motivoEmVoo`). A alternativa — restringir o teste ao cooldown — teria deixado
passar exatamente o caso que o backstop existe para pegar: um `disabled` acrescentado depois, por
outra razão, sem motivo nenhum. O 42-10 encontrou **3 falsos verdes** dessa família.

### 3 · A fonte única é provada comparando os dois valores ENTRE SI (caso z4)

O teste renderiza o cooldown **local** (lido de `solicitacoes_dados`), captura o texto, desmonta;
depois renderiza a recusa **429 do servidor** com o mesmo instante de liberação e captura de novo.
A asserção é `expect(textoServidor).toBe(textoLocal)` — nunca cada um contra um literal.

Dois literais iguais hoje divergem no dia em que alguém editar um deles, e a asserção literal
continuaria verde nos dois. Esta reprova.

## As duas decisões de escopo que mudaram o desenho

### `curriculo_url` sai do arquivo legível — e a assimetria é o ponto

O caminho de Storage (`a1b2c3/curriculo-fulana.pdf`) **não é um link** — o 44-05 registrou isso e
está certo. Mas num documento que uma pessoa lê ele é um identificador interno de infraestrutura com
aparência de endereço, e a §"Os dois arquivos" manda o currículo aparecer *apenas pelo nome do
arquivo e pela data de envio*, com a frase fixa ao lado.

Então: fora do `.html`, dentro do `.json`. O teste (p) prende o caminho por igualdade de string
(`not.toContain(caminhoStorage)`), além das três sondas de link assinado e base64.

### O carimbo sai do servidor, não do navegador

`gerarHtmlExport(resposta)` não chama `new Date()`. Ela lê `resposta.gerado_em`, que é o instante do
servidor — o mesmo que o `.json` já registrava. É o que a mantém **pura** (caso n2: mesma resposta →
mesma string) e o que impede dois arquivos do mesmo pedido de carregarem datas diferentes.

A mesma disciplina rege os **nomes**: `nomesArquivosExport(resposta)` é chamada pelo disparo e pela
tela. "O texto de sucesso nomeia os arquivos que foram baixados" virou fato estrutural, não
coincidência.

## O hook do cooldown: a Invariante 3 na forma de hook

`useUltimoPedidoDados` copia o molde de `useConfigSlaRevisao` — `retry: false`, `staleTime` =
`gcTime`, erro resolvido para `null` no serviço, hook nunca em `isError`.

A razão é a mesma da Invariante 3, dita de outro jeito: **este hook lê um estado que o servidor vai
reavaliar no clique.** Insistir em ler é atrasar a tela para obter uma opinião que não é a
autoridade. O caso (z2) prende o desenlace pelo lado **positivo** — com o hook em erro, o CTA
renderiza e fica **habilitado**. Copiar literalmente o ramo `isError` do análogo (que troca a seção
por copy de erro) teria movido a barreira do cooldown para o cliente.

Duas travas menores que valem registro:

- **`tipo = 'acesso'` no filtro.** Sem ele, um futuro pedido de **exclusão** da Phase 45 consumiria
  o cooldown do direito de **acesso** em silêncio — dois direitos distintos compartilhando um limite
  que nunca foi decidido para os dois.
- **`calcularLiberacaoCooldown` é total.** Data ilegível → "sem cooldown", nunca `NaN`. Travar o
  botão por causa de um valor que o cliente não conseguiu ler seria o cliente decidindo o limite.

## Desvios do plano

### 1. [Regra 3] `useExportarMeusDados.ts` foi editado, e não está em `files_modified`

O plano lista seis arquivos e a Task 1 manda `dispararDownloads` "passar a receber os dois
arquivos". **O chamador é o hook** — sem editá-lo, a função aceita dois e recebe um, e a truth
"o candidato recebe DOIS arquivos" fica inalcançável. Edição mínima: `onSuccess` monta a lista de
dois a partir de `nomesArquivosExport` + os dois geradores. Nenhuma outra linha mudou.

### 2. [Regra 2] O "em voo" também ganhou motivo visível ao lado

Não está na §O CTA e seus cinco estados, que descreve o "em voo" só como botão desabilitado com
`aria-busy` e spinner. Foi acrescentado porque o backstop estrutural de E2/error, escrito como o
plano manda ("nenhum `<button>` desabilitado do bloco existe sem um nó irmão de motivo visível"),
**é uma propriedade do bloco, não do cooldown**. Copy autorada, curta, sem contagem regressiva e sem
barra de progresso — as três proibições da região seguem respeitadas.

### 3. [Regra 1] Duas asserções minhas reprovavam código correto e foram corrigidas

Ambas eram sondas de **substring** julgando fatos que substring não decide:

| Sonda | Por que estava errada | O que ficou |
|---|---|---|
| `not.toContain('onerror=')` no HTML | a substring sobrevive ao escape, inerte | prova pelo `DOMParser` (acima) |
| `not.toContain('sonner')` no fonte | o docblock **cita** a biblioteca para explicar o ban | procura a forma de `import`, com META-TEST |

A segunda é literalmente o defeito que a §Copywriting da UI-SPEC nomeia e que este projeto já pagou
duas vezes (43/"automaticamente"): um grep que reprova a própria justificativa da regra.

### 4. [Regra 3] O RED de `src/` continua sem poder ser commit próprio

Mesmo bloqueio do 44-05: o `.husky/pre-commit` congela a baseline em **97** erros `tsc`, e um teste
que referencia símbolo ainda inexistente a eleva. **Zero `--no-verify`, zero stub.** O RED foi
executado e está registrado:

| Task | Execução RED | Resultado |
|---|---|---|
| 1 | `vitest run exportacaoService.test.ts` | **7 failed** — `gerarHtmlExport is not a function` |
| 2 | idem, após acrescentar (u)–(y3) | **8 failed** — `lerUltimoPedidoDados is not a function` |
| 3 | `vitest run PedirCopiaBloco.test.tsx` | **7 failed** — `(j)` com 1 arquivo, `(z1)`/`(z3)`–`(z7)` |

Note que (z2) e (z8) **passaram no RED**, e isso é informação: o CTA já renderizava sem depender do
estado, e o componente já não tinha `text-xs`. Um teste que nasce verde é registro de invariante já
vivo, não asserção fraca — desde que se saiba qual dos dois é.

## Verificação

| Critério | Resultado |
|---|---|
| `npx vitest run src/features/privacidade/` | **68/68** ✓ (era 60 antes da Task 3, 41 antes do plano) |
| `npm run test:run` | **162 arquivos / 1519 testes** ✓ (era 162/1503 → 1461 antes do plano) |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada, zero regressão ✓ |
| `.husky/pre-commit` | rodou e passou nos **3** commits. **Zero `--no-verify`** ✓ |
| `git diff --exit-code package.json` | **sem alteração** — zero dependência npm nova ✓ |
| `grep -c 'escapeHtml('` no serviço | **18** (critério: ≥ 8) ✓ |
| import de PDF/ZIP no serviço | **0** ✓ |
| `document.`/`window.` dentro de `gerarHtmlExport` | **0** — o gerador é puro ✓ |
| `retry: false` / `enabled:` no hook novo | **1** / **1** ✓ |
| `ultimoPedido` em `usePrivacidade.ts` | **1** · fábricas de chave na pasta `hooks/`: **1** ✓ |
| `COPY_COOLDOWN` em `PedirCopiaBloco.tsx` | **3** (critério: ≥ 2) ✓ |
| `sonner`/`useToast`/`toast(` no bloco | **0** ✓ |
| `AlertDialog`/`<Dialog` no bloco | **0** ✓ |
| accent (`35BFAD`) / `text-xs` no bloco | **0** / **0** ✓ |
| `aria-describedby` no bloco | **3** ✓ |

### Revisão a 320px — o que foi verificado e como

O caso **(z7)** roda com `window.innerWidth = 320` e assere, para as **quatro** linhas de prosa
(abertura, como chega, o que está, o que não está): texto **íntegro** por igualdade
(`textContent === copy`), classes `text-base leading-relaxed` presentes, e ausência de `truncate`,
`line-clamp`, `overflow-hidden` e `whitespace-nowrap`. O bloco não tem classe de altura fixa nem
`overflow-*`.

O **crescimento em altura do CTA** foi verificado estruturalmente, não por pixel: o `GlassButton`
resolve para `inline-flex items-center justify-center gap-2 px-6 py-3` (`glass.tsx:199-200`) —
**sem** `whitespace-nowrap`, sem largura fixa, sem altura fixa. Com `min-h-[44px]`, o rótulo mais
longo ("Baixar uma cópia dos meus dados") quebra livremente e o botão cresce em altura. A 320px
sobram ~208px de largura de texto (320 − 32 de `px-4` da página − 32 de `p-4` do bloco − 48 de
`px-6` do botão), o que dá duas linhas a 16px.

⚠ **Isto é análise estrutural + jsdom, não olho humano em navegador.** O que nenhum dos dois
substitui está na §Deferred Verification do `STATE.md`, item 3.

## Requirements — nada marcado Complete

| Req | Marcado | Por quê |
|---|---|---|
| **EXPORT-01** | ❌ | *"Candidato solicita cópia dos próprios dados pelo painel"*. A EF está no ar, o código está inteiro e verde — e **ninguém clicou**. A prova ao vivo foi adiada pelo operador em 2026-08-04. Código verde não é direito exercido. |
| **EXPORT-06** | ❌ | *"A fronteira do inventário dita ao titular"*. A fronteira existe agora nos **três** lugares que têm de concordar (tela, `.html`, `.json`) e é testada — mas nenhum titular a leu ainda. Fecha junto com a prova ao vivo. |

Esta é a **sexta** vez nesta fase em que a marcação é recusada, e a mais tentadora até aqui: o
EXPORT-06 é copy, e copy testada parece pronta. Continua valendo o critério do 44-01, que teve de
**reverter** uma marcação falsa: o requirement fala do que o titular recebe, não do que o repo
contém.

## Known Stubs

**Nenhum stub de código.** Zero `TODO`/`FIXME`/placeholder, zero `t.skip`/`test.todo`, zero
`--no-verify`.

Um item de escopo, deliberado e nomeado:

1. **`COPY_PEDIR_COPIA.sobreCurriculo` existe e não é renderizada.** Ela nomeia "o botão abaixo" —
   o `CurriculosBloco` do **44-07**. Renderizá-la hoje apontaria o titular para um controle que não
   existe. Está na constante (fonte única) com docblock ⚠ dizendo exatamente isto, e é o único
   texto da §Seção 3 ainda não na tela.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. As seis mitigações estão implementadas e
**todas** provadas por teste:

| Threat | Mitigação | Prova |
|---|---|---|
| T-44-06 | `escapeHtml` em todo valor, sem lista de campos seguros | (l) ordem das entidades · (m) `DOMParser`, zero nós |
| T-44-03 | nenhum signed URL, caminho de Storage ou base64 nos arquivos | (p), 4 sondas montadas em runtime + META-TEST |
| T-44-26 | nome de arquivo sem PII | (s), os dois nomes, sem UUID/`@`/nome |
| T-44-04 | cooldown decidido pelo SERVIDOR | (z2) CTA renderiza com o hook em erro · (z4) mesma copy nos dois caminhos |
| T-44-27 | proveniência da cópia | (n) carimbo no topo · (o) versão no rodapé |
| T-44-28 | copy que afirmasse exclusão inexistente | (t) sonda de texto-fonte, escopo declarado por linha |

## Commits

| Hash | O quê |
|---|---|
| `277c0cb` | o `.html`: `escapeHtml`, `gerarHtmlExport` pura, carimbo, fronteira, rodapé |
| `9554a4f` | o estado do cooldown: leitor own-row que não lança + hook `retry: false` |
| `20d93d5` | os dois arquivos chegam **e** a tela passa a dizer isso — no mesmo commit |

## Self-Check: PASSED

- Arquivos criados/modificados: **7/7 FOUND**
- Commits: `277c0cb`, `9554a4f`, `20d93d5` — **3/3 FOUND** no histórico
- 68 testes na feature · 1519 na suíte · tsc **97** (baseline intacta)
- Zero `--no-verify`, zero stub, zero `t.skip`, zero dependência npm nova
- ⚠ ROADMAP: `roadmap update-plan-progress 44` re-marcou 44-05 como `[x]` pela **3ª vez** e foi
  revertido à mão. A célula ficou em **6/9** (número correto por coincidência — ver `STATE.md`).
