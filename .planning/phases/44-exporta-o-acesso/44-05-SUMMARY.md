---
phase: 44
plan: 05
subsystem: export
status: checkpoint
tags: [lgpd, export, art-18-ii, edge-function, tracer, allowlist, cooldown, tdd, ui]

requires:
  - "supabase/functions/_shared/exportAllowlist.ts (44-03, regerado no 44-04) — a fonte única da projeção, 30 tabelas / 365 colunas"
  - "public.solicitacoes_dados VIVA em PROD (44-04) — sem ela não há cooldown nem marco do Art. 19, II"
  - "supabase/functions/get-curriculo-url/index.ts — o molde estrutural (D-23, authenticate-THEN-authorize)"
  - "vite.config.ts §exclude linha 93 (44-01) — sem ela `npm run test:run` quebraria no instante em que o teste Deno passasse a existir"
provides:
  - "supabase/functions/exportar-meus-dados/index.ts — `handler`, `Deps`, `ErrorCode` com COOLDOWN, `chaveDoTitular` (14 testes Deno)"
  - "src/features/privacidade/services/exportacaoService.ts — ExportacaoError, invocarExportMeusDados, gerarJsonExport (PURA), nomeArquivoExport, dispararDownloads, COPY_PEDIR_COPIA"
  - "src/features/privacidade/hooks/useExportarMeusDados.ts — mutation sem otimismo, sem toast"
  - "src/features/privacidade/components/PedirCopiaBloco.tsx — 3 dos 5 estados do CTA"
  - "PrivacidadeCandidatoPage: seção 3 + COPY_PRIVACIDADE.secao3 + docblock emendado"
affects:
  - "44-06 — acrescenta o `.html` (e com ele a copy dos dois arquivos), o estado de sucesso persistente e o de cooldown"
  - "44-07 — o sub-bloco de currículo; o signed URL é cunhado no cliente, nunca aqui"
  - "44-08/44-09 — a fila do RH lê as linhas que esta EF escreve, inclusive as `pendente` com `falha_geracao`"

tech-stack:
  patterns:
    - "asserção de ORDEM sobre o log de chamadas do mock (INSERT antes da primeira leitura de payload)"
    - "fase de projeção isolada pelo INSERT — a mesma tabela lida no gate e no payload não confunde a asserção de allowlist"
    - "corpo-ignorado provado comparando DUAS execuções, não lendo o código"
    - "sonda de texto-fonte com ESCOPO DECLARADO (só o bloco novo + o gerador), nunca a feature inteira"
    - "leitor de recusa que consome o corpo da Response UMA vez e preserva `liberado_em`"

key-files:
  created:
    - supabase/functions/exportar-meus-dados/index.ts
    - supabase/functions/exportar-meus-dados/__tests__/index.test.ts
    - src/features/privacidade/services/exportacaoService.ts
    - src/features/privacidade/services/__tests__/exportacaoService.test.ts
    - src/features/privacidade/hooks/useExportarMeusDados.ts
    - src/features/privacidade/components/PedirCopiaBloco.tsx
    - src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx
  modified:
    - src/features/privacidade/components/PrivacidadeCandidatoPage.tsx

decisions:
  - "A projeção corre em DUAS passadas (diretas → indiretas), não na ordem do artefato: `agendamentos_entrevista` (indireta) vem antes de `candidaturas` (a ponte) na ordem alfabética, e depender dela seria depender de um acidente do gerador."
  - "A copy 'Você recebe dois arquivos' NÃO entra nesta fatia — ela entra no 44-06 junto com o `.html` que a torna verdadeira. Renderizá-la agora seria a tela afirmando ao titular que recebeu mais do que recebeu."
  - "`extractEfErrorCode` NÃO é reusado: ele descarta `liberado_em`, e o corpo de uma Response só pode ser consumido uma vez — chamar os dois leria o segundo sobre um stream esgotado."
  - "`chaveDoTitular` falha FECHADO sobre o artefato: o mapa tabela→chave é DADO, nunca inferência por sufixo. O 44-03 achou duas colunas que uma regra por `_id` não pegaria."
  - "O RED de `src/` NÃO pôde virar commit próprio: o `.husky/pre-commit` congela a baseline de 97 erros tsc, e um teste que importa módulo inexistente soma +9. RED provado por execução, registrado abaixo, sem `--no-verify` e sem stub."
  - "A janela do cooldown é constante da EF (24 h), não de `config_sla_dados`: aquela tabela configura os limiares de ATENÇÃO/ATRASO do prazo do Art. 19, II — outro prazo, outra decisão."

metrics:
  duration: ~35min (Tasks 1-2; Task 3 pendente)
  completed: 2026-08-04
  tasks: 2 de 3 (a 3ª é checkpoint de PROD)
  commits: 3
  files: 8

actuals:
  tokens: 19000
  tasks: 2
  commits: 3
---

# Phase 44 Plan 05: O tracer existe inteiro em código e para no portão do deploy — Summary

A fatia vertical do direito de acesso está escrita, testada e commitada de ponta a ponta —
Edge Function, serviço, hook, bloco e a seção 3 na página — com **33 testes novos verdes** e a
baseline de tipos intacta. O que **não** aconteceu, e não podia acontecer aqui, é o único passo
que o plano chama de razão de o tracer existir: **o deploy e a prova ao vivo**. Esse é o
checkpoint aberto ao fim deste documento.

**Nenhuma linha de candidato foi lida, escrita ou apagada.** Nada tocou PROD.

## O que a EF encoda, em uma tabela

| Passo | O quê | O que o teste prende |
|---|---|---|
| 1 | AUTHENTICATE — `getUser()` | (3) 401 **e zero chamadas ao client admin** |
| 2 | AUTHORIZE — resolve o titular de `auth.uid()` | (4) 403 sem linha · (5) **erro de query → 500, nunca 403** |
| — | o corpo do request **não é lido** | (6) duas execuções, projeção byte-idêntica |
| 3 | COOLDOWN de 24 h, lido da TABELA | (7) 429 com `liberado_em` e **zero INSERT** · (8) expirado segue |
| 4 | REGISTRA `pendente` | (9) **a ORDEM**: o INSERT vem antes da primeira leitura de payload |
| 5 | PROJETA por allowlist | (10) select == junção da allowlist, por tabela · (11) chave do artefato |
| 6 | MARCA `atendido` | (12) `situacao`+`atendido_em`, escopado por `id` |
| 7 | RESPONDE 200 | (12) `{ ok, versao_allowlist, gerado_em, payload }`, 30 blocos |
| catch | linha **fica** `pendente` com `causa` | (13) `falha_geracao` · (14) log só com `{ pedido_id }` |

**14/14 verdes** em `deno test`.

## As três asserções que fazem esta suíte valer mais que a média

### 1 · A ordem, não a presença (caso 9)

O caso (9) assere o ÍNDICE do INSERT contra o índice da primeira leitura de payload. Uma
asserção de *presença* passaria numa EF que registra o pedido só quando a montagem dá certo — e
aí a fila de supervisão do RH, cujo valor inteiro está na FALHA (o caminho feliz é automático),
ficaria vazia exatamente quando importa. Pior: o cooldown não morderia no caminho que falhou, e
o endpoint viraria amplificador de exfiltração para quem soubesse fazê-lo falhar.

### 2 · A fase de projeção é isolada pelo INSERT

`candidatos` e `solicitacoes_dados` são lidas **duas vezes cada** — uma no gate, uma no payload.
Sem o recorte "só as leituras posteriores ao INSERT", a projeção `"id"` do passo 2 reprovaria a
asserção de allowlist da própria tabela, e a correção provável seria afrouxar a asserção. O
recorte custou três linhas de helper e é o que mantém a asserção estrita.

### 3 · O corpo ignorado é provado comparando DUAS execuções (caso 6)

Um `POST` com `{"candidato_id": "<uuid de outra pessoa>"}` e um `POST` sem corpo produzem a MESMA
assinatura de projeção — tabela, colunas e filtros. E o teste ainda varre todos os valores de
filtro e assere que o id da outra pessoa **não aparece em nenhum**. Ler o código para concluir
"não há `req.json()`" seria uma asserção sobre a versão de hoje; esta é sobre o comportamento.

## O achado de projeto: duas passadas, e por quê

O esboço da pesquisa itera `Object.entries(allowlist.tabelas)` numa passada só. **Isso quebraria.**
As 22 tabelas de ligação indireta filtram por `candidatura_id`, e os ids vêm da projeção de
`candidaturas` — que é a ponte declarada no artefato (`ligacao: "via:candidaturas"`).

A ordem do artefato é alfabética, e **`agendamentos_entrevista` vem antes de `candidaturas`**.
Uma passada só leria a primeira tabela indireta com a lista de ids ainda vazia. O código faz duas
passadas explícitas — diretas primeiro (é a passada que produz os ids), indiretas depois — e o
comentário no arquivo diz que depender da ordem do artefato seria depender de um acidente do
gerador.

Duas consequências que ficaram escritas:

- **Ponte ausente falha FECHADO.** Se a tabela-ponte não tiver sido lida, o código lança em vez de
  ler sem escopo. Ler sem escopo é exatamente o vazamento que a função existe para evitar.
- **Zero candidatura ⇒ zero round-trip.** O bloco existe no payload, vazio, dizendo a verdade —
  em vez de 22 consultas com `IN ()`.

## `chaveDoTitular` é leitura do artefato, nunca inferência

O mapa tabela→chave é **dado**. Uma tabela sem declaração lança. A justificativa está no
44-03 e é literal: `redacoes_candidato.referencia_match` (`uuid[]` de candidaturas de OUTRAS
pessoas) e `agendamentos_entrevista.entrevistador` (o nome de um funcionário) são duas colunas que
uma regra por sufixo `_id` **não pegaria**. Uma allowlist "gerada por regra" as teria produzido em
silêncio; um filtro inferido por nome erraria a linha do mesmo jeito.

## O lado cliente: o corte que torna a lei testável

`gerarJsonExport` é **pura** — objeto dentro, string fora, e o caso (a) prova com um espião de
`document.createElement` que nunca é chamado. `dispararDownloads` é o único ponto que toca o
navegador (`Blob` → object URL → anchor → clique → revoke, verbatim de `baixarIcsAgendamento`).

É o mesmo corte de `gerarIcsAgendamento`/`baixarIcsAgendamento`, e é ele que torna o arquivo que a
lei exige testável **sem simular um clique**.

| Contrato | Prova |
|---|---|
| invoke **sem corpo** | (e) `invoke.mock.calls[0][1]` é `undefined` |
| `COOLDOWN` preserva `liberado_em` | (e2) o erro tipado carrega `liberadoEm` |
| vocabulário fechado, código desconhecido → `SERVER_ERROR` | (e3), 4 casos |
| transporte sem corpo legível → `NETWORK` | (e4) |
| **mensagem crua nunca atravessa** | (f)/(f2): `message` é a copy do projeto, e o `PGRST301` não aparece |
| **nenhuma URL assinada no arquivo** | (c), duas sondas montadas em runtime + META-TEST |
| nome do arquivo sem PII | (d2) `beauty-smile-meus-dados-2026-08-04.json`, exato |

### `extractEfErrorCode` não serve aqui, e a razão é mecânica

O helper compartilhado devolve **só o código** e descarta o resto — correto para os consumidores
dele. Aqui `liberado_em` é o dado que a copy de cooldown renderiza. E o corpo de uma `Response`
só pode ser consumido **uma vez**: chamar os dois leria o segundo sobre um stream já esgotado, e
o sintoma seria um `liberado_em` sempre `undefined` sem erro nenhum no console. `lerRecusa` lê o
corpo uma vez e devolve os dois campos.

## A emenda do docblock, no mesmo commit

`PrivacidadeCandidatoPage.tsx` afirmava, no próprio docblock, **"A página NÃO tem CTA primário,
por desenho"**. A partir desta fase ela tem. A afirmação foi **substituída** pela emenda registrada
na 44-UI-SPEC — com a justificativa (a Invariante 4 da 43 proíbe fricção sobre uma intenção JÁ
expressa; aqui **sem botão não existe forma de expressar a intenção** — o botão não é confirmação
sobre o pedido, ele **é** o pedido) e as três restrições de mitigação.

Um arquivo que passa a mentir sobre si é o mesmo defeito que a Phase 43 mandou corrigir junto com
a copy. `git diff` da página: **32 adições, 3 remoções** — e as 3 remoções são exatamente as três
linhas da afirmação antiga. **Seções 1 e 2 byte-idênticas.**

## Desvios do plano

### 1. [Regra 2] A copy "Você recebe dois arquivos" foi OMITIDA desta fatia

A 44-UI-SPEC §Seção 3 traz a linha **"Você recebe dois arquivos: um feito para você ler e outro em
formato de dados…"**. Esta fatia entrega **um** arquivo, o `.json`, por desenho declarado do plano.

Renderizar a copy dos dois arquivos agora seria a tela **afirmando ao titular que recebeu mais do
que recebeu** — precisamente a mentira que a §Invariantes desta fase nomeia como não-recuperável
por outra via que não retratação escrita. A copy entra no **44-06, junto com o `.html` que a torna
verdadeira**.

Pelo mesmo critério ficaram de fora `sobreCurriculo` (fala de "o botão abaixo", que é o 44-07) e o
estado de sucesso persistente, que nomeia dois arquivos.

⚠ **O que o 44-06 tem de fazer:** acrescentar `comoChega` e o estado de sucesso a
`COPY_PEDIR_COPIA` **no mesmo commit** em que o `.html` entrar na lista de `dispararDownloads`.
Separar os dois reintroduz a mentira por uma janela de commits.

### 2. [Regra 3] O RED de `src/` não pôde ser um commit próprio

O `.husky/pre-commit` deste repositório **congela a baseline em 97 erros `tsc`** e aborta o commit
acima dela. Um teste RED que importa um módulo ainda inexistente soma **+9** — o commit é
rejeitado.

Três saídas, e a escolha:

| Saída | Por que não / por que sim |
|---|---|
| `--no-verify` | **Proibido** pelo plano e pelo precedente da fase (44-03/44-04: zero ocorrências) |
| criar stubs vazios para o tsc resolver | Embarca stub no histórico — a classe de defeito que o `## Known Stubs` existe para caçar |
| **RED provado por execução, commit único `feat`** | ✅ escolhido |

**A execução RED aconteceu e está registrada:** `npx vitest run` sobre os dois arquivos novos
devolveu `2 failed | no tests` com `Failed to resolve import "../exportacaoService"`. Só depois os
módulos foram escritos.

Note que o RED da **Task 1 é commit de verdade** (`b0b2f21`) — `supabase/functions/**` está fora do
projeto `tsc`, então o portão não se aplica lá. O ciclo RED→GREEN está no histórico para a EF; para
`src/`, está neste registro.

### 3. [Regra 2] `ENCARREGADO_EMAIL` importado do componente para o serviço

`exportacaoService` importa `ENCARREGADO_EMAIL` de `components/AutorizacoesLista`. É uma inversão
de camada (serviço → componente), e foi escolhida contra a alternativa de **duplicar o endereço**:
duas verdades sobre o mesmo canal humano é o defeito pior, e é o canal que a copy de erro oferece
quando o caminho automático falha. `GuardaCurriculoBloco` já consome a mesma constante da mesma
origem. Registrado para que um plano futuro que crie um módulo neutro saiba por que ela está aqui.

## TDD Gate Compliance

| Gate | Task 1 (EF) | Task 2 (cliente) |
|---|---|---|
| RED | ✅ `b0b2f21` — `test(44-05)`, 14/14 vermelhos por module-not-found | ⚠ executado, **não commitado** — ver Desvio 2 |
| GREEN | ✅ `0a04bed` — `feat(44-05)`, 14/14 verdes | ✅ `bf2ae4c` — `feat(44-05)`, 19/19 verdes |
| REFACTOR | não necessário | não necessário |

## Verificação

| Critério | Resultado |
|---|---|
| `deno test … supabase/functions/exportar-meus-dados` | **14/14** ✓ |
| `npx vitest run` sobre os dois arquivos novos | **19/19** ✓ |
| `npm run test:run` | **159 arquivos / 1461 testes** ✓ (era 157/1442) |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada, zero regressão ✓ |
| `.husky/pre-commit` | rodou e passou nos **3** commits. **Zero `--no-verify`** ✓ |
| import estático de `esm.sh` | **1** ocorrência; forma construída em runtime: **0** ✓ |
| projeção total no código-fonte da EF | **0** ✓ |
| leitura do corpo do request (`req.json/text/formData`) | **0** ✓ |
| `COOLDOWN` / `429` na EF | **9** / **3** ✓ |
| import do espelho `_shared/exportAllowlist` | **1** ✓ |
| `document.`/`window.` no serviço | **3**, todas dentro de `dispararDownloads` ✓ |
| `beauty-smile-meus-dados-` no serviço | **2** ✓ · nome sem PII provado por (d2) |
| `'NÃO tem CTA primário'` na página | **0** ✓ |
| accent / `text-xs` no bloco novo | **0** / **0** ✓ |
| diff da página | **+32 / −3**, as 3 remoções são a afirmação emendada ✓ |
| **deploy da EF · prova ao vivo** | ⛔ **NÃO EXECUTADO** — checkpoint abaixo |

## Known Stubs

Nenhum stub de código. Zero `TODO`/`FIXME`/placeholder, zero `t.skip`/`test.todo`.

**Aberto por bloqueio de ambiente, nomeado — é a Task 3 inteira:**

1. **A EF não está deployada.** Nenhum byte desta função rodou contra o Postgres real.
2. **A assunção A1 continua ABERTA.** Se o import de `../_shared/exportAllowlist.ts` não sobreviver
   ao bundler do `functions deploy`, a função falha **no boot** e nunca alcança o corpo do
   `Deno.serve`. O discriminador do 41-05 (401 com corpo do próprio código = o grafo de módulos
   carregou) é o que fecha isso — e ele exige a função no ar.
3. **Nenhuma prova ao vivo:** ninguém baixou um `.json`, `solicitacoes_dados` segue com **0 linhas**,
   e o cooldown nunca foi exercido contra o banco.

Nada disso é contornável daqui: subagentes GSD não recebem os tools MCP do Supabase
(anthropics/claude-code#13898), premissa registrada em `STATE.md` desde o kickoff do M8.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. As oito mitigações foram implementadas;
seis são **provadas por teste**, duas dependem do checkpoint:

| Threat | Mitigação | Prova |
|---|---|---|
| T-44-01 | projeção por allowlist, zero projeção total | testes (10) + grep no fonte |
| T-44-02 | o corpo não é lido | teste (6), duas execuções + grep `req.json` = 0 |
| T-44-05 | authenticate ≠ authorize | testes (3)(4)(5) — 403 e 500 separados |
| T-44-04 | cooldown server-side com 429 | testes (7)(8) · ⚠ **prova ao vivo pendente** |
| T-44-11 | registro antes da montagem | testes (9)(13) |
| T-44-03 | nenhum signed URL no payload/arquivo | testes (14a) e (c), sondas em runtime |
| T-44-24 | log redigido | teste (14b): `console.error` só com `{ pedido_id }` |
| T-44-25 | import do artefato no boot | ⛔ **PENDENTE** — só o deploy fecha (A1) |

## Requirements — nada marcado Complete

| Req | Marcado | Por quê |
|---|---|---|
| **EXPORT-01** | ❌ | *"Candidato solicita cópia dos próprios dados pelo painel"*. O caminho existe em código e **nunca correu**. A EF não está no ar; um clique hoje falha no transporte. Marcar seria afirmar um caminho que ninguém percorreu. |
| **EXPORT-02** | ❌ | *"Export em JSON por allowlist explícita"*. A projeção está escrita e testada contra mocks — **nenhum byte projetou dado real**. Fecha no checkpoint. |

O 44-01 teve de **reverter** uma marcação falsa nesta fase; o 44-02, o 44-03 e o 44-04
**recusaram-se** a fazer uma. Esta é a quinta vez que a tentação aparece, e a mais forte — o código
está inteiro e verde. **Código verde não é direito exercido.**

## Commits

| Hash | O quê |
|---|---|
| `b0b2f21` | RED — 14 asserções da EF, o tracer da fase |
| `0a04bed` | GREEN — a EF com os sete passos e os cinco desvios |
| `bf2ae4c` | o outro lado: serviço, hook, bloco e a seção 3 na página |

## Self-Check: PASSED

- Arquivos criados/modificados: **8/8 FOUND**
- Commits: `b0b2f21`, `0a04bed`, `bf2ae4c` — **3/3 FOUND** no histórico
- 14/14 deno · 19/19 novos Vitest · 1461 testes verdes · tsc **97** (baseline intacta)
- Zero `--no-verify`, zero stub, zero `t.skip`
- ⚠ Plano **não concluído**: a Task 3 (deploy + prova ao vivo) é checkpoint do orquestrador
