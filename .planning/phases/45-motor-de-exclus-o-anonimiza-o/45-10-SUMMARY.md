---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 10
subsystem: edge-function
tags: [lgpd, exclusao, storage, auth-admin, resend, idempotencia, tdd, deno]

requires:
  - phase: 45-motor-de-exclus-o-anonimiza-o
    provides: "45-02 (`RECIBO_EXCLUSAO`, o espelho gerado), 45-03 (o esqueleto da EF, `Deps`/`handler`/`causaDaFalha`), 45-06 (a EF v1 deployada e as 2 RPCs de estado aplicadas), 45-07 (`plano_exclusao_titular` + `anonimizar_candidato`, escritas e NÃO aplicadas), 45-08 (o contrato de recorte do recibo)"
provides:
  - "`acao='executar'` — a máquina de estados dos 4 passos, retomável por carimbo"
  - "`enumerarObjetosTitular` — o laço paginado de `storage.list()`, a primeira ocorrência do repositório"
  - "`unirEDeduplicarCaminhos` — a união autoritativa com `curriculo_url`, com divergências viradas achado"
  - "`corpoReciboExclusao` / `assuntoReciboExclusao` — o recibo em `texto_passado`, fora do ledger"
  - "O `plano jsonb` esvaziado no fecho, restando só contagens e achados agregados"
  - "O portão CONSOL-04 FECHADO: a promessa de exclusão na superfície do candidato deixou de ser órfã"
affects: [45-11, 46-purga, 47-consolidacao]

actuals:
  tokens: 40473
  tasks: 3
  commits: 9

tech-stack:
  added: []
  patterns:
    - "Plano-primeiro, executores idempotentes: o passo 0 é o ÚNICO produtor de informação; 1–3 só consomem"
    - "Idempotência por ESTADO carimbado, jamais por `try/catch`"
    - "A pré-condição do passo irreversível é relida do BANCO, nunca do espelho local que o próprio código escreveu"
    - "O retorno de `storage.remove()` é CONFERIDO contra os caminhos do plano"
    - "Falha ATRIBUÍDA a um passo (`ErroDePasso`) para que o `catch` genérico saiba em qual SISTEMA parou"
    - "A assinatura como controle de privacidade: `corpoReciboExclusao` aceita uma data e dois booleanos, e nada mais tem por onde entrar"

key-files:
  created: []
  modified:
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/helpers.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - src/__tests__/copyPortoesLgpd.test.ts
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/deferred-items.md

key-decisions:
  - "A pré-condição do passo 3 RELÊ `solicitacoes_dados` do banco em vez de confiar no espelho em memória — antes da única chamada sem volta, a autoridade é o banco"
  - "`enumerarObjetosTitular` descarta linhas de PASTA (`id === null`): elas não são objetos, `remove()` nunca as devolve, e mantê-las produziria um `falha_storage` FALSO numa exclusão correta"
  - "A falha estrutural do passo 0 é `ponteiro vivo + enumeração vazia`, não `ponteiro vivo + união vazia` — a segunda é logicamente inalcançável e teria sido um guard morto"
  - "O guard non-prod (`exigirSinkTeste` + `resolverDestinatarioComLabel`) foi acrescentado ao passo 4: sem ele, um run em staging manda a um endereço real um e-mail afirmando que a conta da pessoa deixou de existir"
  - "`modo` e `fetchImpl` entram nas `Deps` como opcionais — `resolverModo()` lê `Deno.env`, e a suíte roda sem permissão de env por contrato da fase"
  - "`recibo_enviado_em` e o esvaziamento do `plano` vão num ÚNICO `UPDATE`: dois updates abririam a janela em que o endereço some sem o envio registrado, e a retomada perderia o destinatário"

requirements-completed: [ERASE-03, ERASE-04, ERASE-07, ERASE-09, ERASE-10]

coverage:
  - id: D1
    description: "Passo 0 captura e persiste ANTES de mutar: caminhos ORDENADOS, achados, recorte e endereço"
    requirement: ERASE-04
    verification:
      - kind: unit
        ref: "index.test.ts (s) — o índice de `escreve:solicitacao` é MENOR que o de `storage:remove` no diário de ordem"
        status: pass
      - kind: unit
        ref: "index.test.ts (t) — duas execuções com o `list()` paginando em ordens diferentes produzem a MESMA lista"
        status: pass
    human_judgment: false
  - id: D2
    description: "`storage.list()` paginado: um titular com mais objetos que o `limit` tem TODOS capturados"
    requirement: ERASE-03
    verification:
      - kind: unit
        ref: "index.test.ts (n) — 3 páginas, união das três, offsets 0/2/4; (y) 12 páginas → 1200 caminhos"
        status: pass
    human_judgment: false
  - id: D3
    description: "União com `curriculo_url` deduplica por caminho COMPLETO; divergência é achado, nunca fusão silenciosa"
    requirement: ERASE-03
    verification:
      - kind: unit
        ref: "index.test.ts (o)/(o2) — presente nas duas listas aparece UMA vez; `blob_orfao` e `ponteiro_morto` viram duas entradas e nenhum é descartado"
        status: pass
    human_judgment: false
  - id: D4
    description: "O retorno de `storage.remove()` é CONFERIDO contra os caminhos do plano"
    requirement: ERASE-03
    verification:
      - kind: unit
        ref: "index.test.ts (w) — `remove()` devolvendo menos objetos falha com `causa='falha_storage'` e NÃO carimba"
        status: pass
    human_judgment: false
  - id: D5
    description: "Zero objetos é SUCESSO: carimba, e nenhum passo é marcado como falho"
    requirement: ERASE-03
    verification:
      - kind: unit
        ref: "index.test.ts (u) — `curriculo_url` NULL + zero objetos → 200, `storage_concluido_em` carimbado, zero `causa` em todos os updates"
        status: pass
    human_judgment: false
  - id: D6
    description: "Idempotência por ESTADO nos quatro passos: re-executar não avança passo nenhum duas vezes"
    requirement: ERASE-04
    verification:
      - kind: unit
        ref: "index.test.ts (x) storage · (bb) postgres · (cc) auth · (jj) recibo — o mock do sistema externo NÃO é chamado em nenhum dos quatro"
        status: pass
    human_judgment: false
  - id: D7
    description: "A ordem `Storage → Postgres → Auth` é pré-condição de código verificada contra a AUTORIDADE"
    requirement: ERASE-10
    verification:
      - kind: unit
        ref: "index.test.ts (aa) — carimbo de postgres perdido faz o passo 3 recusar; `deleteUser` NÃO é chamado e `situacao` permanece `executando`"
        status: pass
    human_judgment: false
  - id: D8
    description: "`deleteUser(uid, false)` com o erro PROPAGADO — zero `.catch` que engula"
    requirement: ERASE-10
    verification:
      - kind: unit
        ref: "index.test.ts (dd) nas DUAS formas (retorno com `error` e rejeição) → `falha_auth`, sem carimbo, 500 sem SQLSTATE nem corpo cru; (dd2) o segundo argumento é `false`"
        status: pass
      - kind: other
        ref: "guard node do plano: zero `deleteUser(...).catch` e `shouldSoftDelete` explícito, em conteúdo com comentários removidos"
        status: pass
    human_judgment: false
  - id: D9
    description: "O SQLSTATE de dry-run (`P45DR`) no caminho real é tratado como DEFEITO, jamais como sucesso"
    requirement: ERASE-09
    verification:
      - kind: unit
        ref: "index.test.ts (ee) → 500, sem `postgres_concluido_em`, `causa='falha_postgres'`, `deleteUser` não chamado; (ee2) retorno sem `resultado` conhecido também falha"
        status: pass
    human_judgment: false
  - id: D10
    description: "`situacao` só vira `concluido` com os TRÊS carimbos (Invariante 5)"
    requirement: ERASE-04
    verification:
      - kind: unit
        ref: "index.test.ts (ff) — caminho completo conclui; passo 3 falho permanece `executando` e nenhum update declara conclusão cedo"
        status: pass
    human_judgment: false
  - id: D11
    description: "O recibo em `texto_passado`, com os dois recortes, sem PII e FORA do ledger"
    requirement: ERASE-07
    verification:
      - kind: unit
        ref: "index.test.ts (ll) fixture com nome/CPF/telefone/`candidato_id`/`solicitacao_id`/vaga/caminho e nenhum no HTML; (mm) omissão por recorte; (nn) `texto_passado` presente e `texto_futuro` ausente nos 20 itens; (kk) mock de ledger que falha se chamado, em 3 cenários"
        status: pass
      - kind: other
        ref: "guard node do plano: zero `notificacoes_enviadas`, zero escape próprio, `Idempotency-Key` presente, `reciboExclusao` consumido"
        status: pass
    human_judgment: false
  - id: D12
    description: "O `plano` é esvaziado no fecho, restando só contagens e achados agregados"
    requirement: ERASE-07
    verification:
      - kind: unit
        ref: "index.test.ts (oo) — `caminhos`/`email`/`auth_uid`/`achados` ausentes; nenhum resquício do `auth.uid` nem do endereço no jsonb serializado"
        status: pass
    human_judgment: false
  - id: D13
    description: "Log REDIGIDO com um erro em CADA passo"
    verification:
      - kind: unit
        ref: "index.test.ts (gg) — três cenários (storage/postgres/auth) e nenhum `console.*` recebe e-mail, nome, caminho, URL, `auth.uid` ou id completo"
        status: pass
    human_judgment: false
  - id: D14
    description: "Nenhuma resposta posterior ao início do passo 1 afirma que nada foi apagado"
    verification:
      - kind: unit
        ref: "index.test.ts (hh) — três cenários de falha, e nenhum corpo contém a frase"
        status: pass
    human_judgment: false
  - id: D15
    description: "O portão CONSOL-04 fechou: a promessa de exclusão na superfície do candidato deixou de ser órfã"
    verification:
      - kind: unit
        ref: "src/__tests__/copyPortoesLgpd.test.ts — o portão ficou VERDE sozinho, sem edição nele; o meta-teste irmão foi re-pinado com a conferência feita e ganhou a prova de discriminação (item 2b)"
        status: pass
    human_judgment: true
    rationale: "O portão mede o DISCO. Ele NÃO afirma que o motor roda — as migrations do 45-07 seguem não aplicadas, a EF não foi redeployada, e o `DI-45-07-01` impede o caminho real hoje. A distinção está escrita dentro do próprio teste."

duration: 47min
completed: 2026-08-06
status: complete
---

# Phase 45 Plano 10: O motor destrutivo — Summary

**Os quatro passos da exclusão dentro da Edge Function já provada — enumerar e apagar o Storage com o retorno conferido, chamar a metade Postgres, apagar o usuário do Auth sem engolir o erro, e mandar o recibo em tempo passado — todos idempotentes por carimbo, capturados antes de mutar, e nada disso deployado.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-08-06T11:31:00Z
- **Completed:** 2026-08-06T12:18:00Z
- **Tasks:** 3 (TDD RED/GREEN em cada uma)
- **Files modified:** 5 · **Commits:** 9 · **Zero `--no-verify`**

## Accomplishments

- **A mutação de três sistemas existe e é RETOMÁVEL.** O passo 0 é o único que produz
  informação; 1–3 só consomem o que ele gravou. Um crash entre a captura e a primeira mutação
  não perde os ponteiros — é literalmente o ERASE-04, e é o que torna aceitável uma mutação
  não-atômica sobre PII sem rede de segurança.
- **O apagamento do Storage confere o que de fato apagou.** O único precedente do repositório
  (`cvUploadService.ts:224`) descarta o array de retorno de `remove()`. Aqui a divergência entre
  o que foi pedido e o que foi apagado falha o passo com `causa='falha_storage'` e **não**
  carimba a conclusão.
- **A enumeração é AUTORITATIVA, não inferida do banco.** `storage.list()` paginado (zero
  ocorrências no repositório inteiro antes deste plano) unido a `curriculo_url`, com as
  divergências registradas como achado. Enumerar por `curriculo_url` sozinho deixaria para trás
  todo CV substituído sem `removeCV()` — e a SONDA 3 mediu 5 objetos para 9 candidaturas,
  consistente com essa hipótese.
- **Nenhum dos dois erros que importam pode ficar invisível.** O `P45DR` chegando no caminho
  real é tratado como defeito (seria o pior falso verde da fase: pedido concluído com 100% da
  PII intacta e o currículo já apagado), e o erro de `deleteUser` é propagado — ao contrário dos
  dois precedentes vivos, que o engolem por razão correta em contexto diferente.
- **A ordem é verificada contra a AUTORIDADE, não contra o espelho.** Antes da única chamada sem
  volta, a EF relê `solicitacoes_dados` do banco. Um carimbo de `postgres_concluido_em` que não
  chegou faz o passo 3 recusar — que é exatamente o caminho que produziria 23503 **depois** de o
  currículo já ter sido apagado.
- **O recibo não deixa o endereço do titular para trás.** Ele não entra em ledger nenhum
  (D-45-12/R1), e o `plano` é esvaziado no fecho porque o caminho de Storage embute o
  `auth.uid()` — PII sobrevivendo dentro do próprio registro de exclusão.
- **⚠ O portão CONSOL-04 FECHOU.** A suíte foi de **1688/1689** para **1689/1689**. O portão
  ficou verde **sozinho**, sem uma linha editada nele — o desfecho projetado quando ele foi
  reescrito na Wave 1.
- **Zero deploy, zero apply, zero contato com PROD.**

## Task Commits

| # | Tarefa | RED | GREEN |
|---|---|---|---|
| 1 | Passo 0 (o plano) e Passo 1 (Storage) — `type="tracer"` | `27cff41` | `4f59484` |
| 2 | Passos 2 e 3 — a metade Postgres e o hard delete | `8388aea` | `48e8ed6` |
| 3 | Passo 4 — o recibo, fora do ledger, e o `plano` esvaziado | `fbac53c` | `bf51e36` |

**Desvios:** `c92c047` (re-pin do CONSOL-04) · `4bea827` (o docblock que afirmava o oposto).

## Files Created/Modified

- **`supabase/functions/executar-direito-titular/index.ts`** (+658) — `acao='executar'`, a
  máquina de estados dos 4 passos, `ErroDePasso`, `montarPlano`, `enviarRecibo`, e o docblock
  reescrito.
- **`supabase/functions/executar-direito-titular/helpers.ts`** (+296) — `enumerarObjetosTitular`,
  `unirEDeduplicarCaminhos`, `dividirEmLotes`, `assuntoReciboExclusao`, `corpoReciboExclusao`,
  `construirCorpoResendRecibo`, `chaveIdempotenciaRecibo`.
- **`supabase/functions/executar-direito-titular/index.test.ts`** (+1122) — de 14 para **49**
  asserções, todas sem rede.
- **`src/__tests__/copyPortoesLgpd.test.ts`** (+79/−38) — re-pin (ver Desvios).
- **`.planning/phases/45-.../deferred-items.md`** — `DI-45-10-01` e `DI-45-10-02`.

## Decisions Made

1. **A pré-condição do passo 3 relê o banco.** O plano pedia "só roda com
   `postgres_concluido_em` carimbado". Verificar isso contra a variável local que o próprio
   código acabou de escrever provaria apenas que o código concorda consigo mesmo. Custo: um
   `SELECT`. Benefício: um carimbo perdido entre o commit e o retorno não deixa `deleteUser`
   rodar fora de ordem — e esse é o cenário exato do pior estado da fase.
2. **Linhas de PASTA são descartadas na enumeração.** O Storage devolve marcadores de pasta com
   `id: null`; `remove()` nunca os devolve. Mantê-los produziria divergência **garantida** na
   conferência do passo 1 — um `falha_storage` falso numa exclusão correta, que é o pior tipo
   de alarme: o que ensina a ignorar o alarme.
3. **A falha estrutural do passo 0 é `ponteiro vivo + enumeração VAZIA`.** A leitura literal
   ("`curriculo_url` não-nula e zero caminhos no plano") é logicamente inalcançável, porque a
   união contém os ponteiros por construção — teria virado um guard morto. A condição
   implementada é a que tem conteúdo: ponteiros existem e o bucket não devolveu nada, ou seja, a
   enumeração está quebrada (prefixo, permissão, convenção) e seguir apagaria só o que os
   ponteiros nomeiam, deixando os órfãos para trás com o pedido declarado concluído.
4. **Guard non-prod no passo 4** — ver Desvios, item 2.
5. **`recibo_enviado_em` e o esvaziamento do `plano` num único `UPDATE`.** Dois updates abririam
   uma janela em que o endereço já sumiu e o envio ainda não foi registrado; uma retomada nessa
   janela cairia em `sem_endereco` e o recibo morreria — o único desfecho que o plano proíbe
   nominalmente ("o recibo pode falhar; o que ele não pode é sumir em silêncio").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] O meta-teste do CONSOL-04 passou a reprovar o comportamento CORRETO**

- **Encontrado em:** ao rodar a suíte depois da Task 3.
- **Issue:** o pino `expect(efExecutaPassosDestrutivos()).toBe(false)` disparou, com a instrução
  literal *"Se virou true, o 45-10 escreveu os passos destrutivos na EF — confira se o portão do
  CONSOL-04 ficou verde sozinho e ajuste este meta-teste."* Ele disparou **como desenhado**.
- **Conferência exigida pelo próprio teste, e feita:** rodando só aquele arquivo, **13 de 14
  passaram** — a única falha era o pino, **não o portão**. O portão
  (`nenhuma promessa de exclusão futura sem código que a execute`) ficou **verde sozinho**, sem
  uma linha editada nele.
- **Fix:** os dois pinos passam de registro de AUSÊNCIA para asserção de **não-regressão**. E
  como, com o veredito em `true`, as duas condições fracas do item 2 **deixaram de
  discriminar**, a prova anti-regressão migrou para um **item 2b novo**, que mede o predicado
  FORTE contra três alvos que sabidamente não o satisfazem — incluindo
  `cadastrar-candidato/index.ts`, que **chama `deleteUser`** e não toca em Storage. É esse alvo
  que prova que o `&&` do predicado é real: citar a chamada de Auth sozinha não satisfaz o
  portão. `efExecutaPassosDestrutivos` ganhou parâmetro de alvo, com o default inalterado.
- **Zero asserção afrouxada.** O comentário registra explicitamente o que o portão **não**
  afirma: que o motor RODA.
- **Committed in:** `c92c047`

**2. [Rule 2 - Missing Critical] O recibo alcançaria um endereço real num run de staging**

- **Encontrado em:** Task 3, ao escrever o envio.
- **Issue:** o plano descreve o envio pelo Resend com `Idempotency-Key`, e não menciona o guard
  de modo. Sem ele, um deploy de staging manda **a um endereço real** um e-mail afirmando que a
  conta da pessoa deixou de existir — a exata classe de dano que `exigirSinkTeste` (DELIV-03 /
  T-41-01) existe para impedir, e aqui com uma afirmação falsa e irreversível no corpo.
- **Fix:** `resolverModo` + `resolverDestinatarioComLabel(para, 'recibo_exclusao', modo)` +
  `exigirSinkTeste`, todos os três **canônicos de `_shared/email-config.ts`** — nada reescrito.
  Falha do guard vira `causa='falha_recibo'`, retomável. `modo` entra nas `Deps` como opcional
  porque `resolverModo()` lê `Deno.env`, que `deno test` não concede.
- **Coberto por:** teste (rr).
- **Committed in:** `bf51e36`

**3. [Rule 1 - Bug] O docblock do módulo afirmava o oposto do que o arquivo faz**

- **Encontrado em:** auto-revisão após a Task 3.
- **Issue:** o cabeçalho dizia **"⚠ NESTA FASE ELA NÃO APAGA NADA"**. Era verdade no 45-03 e
  virou falso neste plano — num módulo cujo modo de falha é irreversível e sem rede. A primeira
  pessoa a abrir o arquivo leria uma garantia que não existe mais.
- **Fix:** as três ações declaradas, a irreversibilidade **medida** (backup de 7 dias que exclui
  Storage; PITR desligado), e a nota de que aplicar e deployar é do 45-11. O docblock também
  passou a carregar os dois defeitos conhecidos (abaixo).
- **Committed in:** `4bea827`

**4. [ajuste de verificação] O guard estático de "zero remoção SQL de objeto de Storage" saiu
   do `deno test`**

- Escrito primeiro como um `Deno.test` que lê os dois arquivos, ele exigiria `--allow-read` —
  e o critério de aceitação do plano é a suíte rodando com o comando **nu**. Movido para o
  **idioma que o próprio plano usa nas Tasks 2 e 3**: um guard `node` de uma linha, executado na
  verificação e registrado abaixo. Nenhuma cobertura perdida; a asserção mudou de veículo.

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing-critical) + 1 ajuste de veículo de
verificação. **Nenhuma expandiu o escopo de código** — os três arquivos do `files_modified`
seguem sendo os únicos de produção tocados.

## ⚠ Os DOIS defeitos conhecidos: medidos, registrados e NÃO consertados aqui

Ambos foram atribuídos ao 45-10 pelo `STATE.md`, e **o `45-10-PLAN.md` não tem tarefa que os
cubra** — ele foi escrito antes de eles serem descobertos. Consertá-los exigiria sair do
`files_modified` (um deles exige **migration nova**), e é o `files_modified` que mantém o portão
desta fase auditável. Registrados em `deferred-items.md` como `DI-45-10-01` e `DI-45-10-02`, com
as medições que faltavam.

### `DI-45-07-01` — as claims do titular não chegam às RPCs · **CONTINUA ABERTO**

Medido no arquivo, depois do 45-10:

| fato | medição |
|---|---|
| `supabaseAdmin` sem repassar `Authorization` | `index.ts:958` |
| o repasse existe só no client anon | `index.ts:954-955` |
| RPCs afetadas | **quatro** — `registrar_pedido_exclusao` (`:318`), `cancelar_pedido_exclusao` (`:378`), `anonimizar_candidato` (`:560`), `plano_exclusao_titular` (`:695`) |

⚠ **O 45-10 acrescentou DUAS chamadas à lista.** A superfície do defeito cresceu; sua natureza
não. Efeito hoje: `auth.uid()` é NULL, as RPCs recusam com `42501`, e o passo 0 falha em
`rpc_plano` com `causa='falha_postgres'` e **zero mutação** — desfecho seguro, motor parado.

⚠ **E o conserto é maior do que a decisão registrada previa:** o PostgREST deriva o *role* do
MESMO JWT, então um client com `SERVICE_KEY` + `Authorization` do titular chega como
`authenticated`. Fechar isso exige **também** `GRANT EXECUTE ... TO authenticated` nas cinco
funções, numa **migration nova** — o precedente da P44 é exatamente esse (guard no corpo como
controle, `authenticated` no ACL). Afrouxar o guard é a saída **recusada**: reintroduziria o
defeito que a asserção C2 fecha, numa função que apaga PII irreversivelmente.

### `retirar_candidatura` — a retirada do 45-09 está morta na chegada

`useRetirarCandidatura.ts:46` define `ACAO_RETIRAR = 'retirar_candidatura'` e `:77-79` invoca
**esta** EF com esse valor. `ACOES` é `{pedir, cancelar, executar}` (`index.ts:170`). Caminho
medido: **400 `VALIDATION`** → o `traduzirErro` do hook cai no `default` → o titular vê
**`SERVER_ERROR`**. O botão nunca funciona, e falha com a copy errada.

⚠ O conserto tem aresta de desenho: aquela ação precisa de `candidatura_id`, e o **DESVIO 1**
desta EF é explícito — *nenhum identificador vindo do corpo é lido em lugar nenhum desta
função*, porque aceitar id do cliente é a superfície **T-32-03**. Resolver no servidor ou
validar contra a titularidade antes de qualquer toque privilegiado; nunca confiar. Não é
conserto mecânico.

## Verification

| critério do plano | resultado |
|---|---|
| `deno test supabase/functions/executar-direito-titular/` verde, **sem `--allow-net`** | ✅ **49 passed \| 0 failed**, com o comando nu (14 → 49) |
| Guards da Task 2 (zero `deleteUser(...).catch`; `shouldSoftDelete` explícito `false`) | ✅ `GUARD T2 OK` |
| Guards da Task 3 (zero ledger; zero escape próprio; `Idempotency-Key`; consome o gerado) | ✅ `GUARD T1+T3 OK` |
| Guard da Task 1 (zero remoção SQL sobre a tabela de objetos do Storage) | ✅ mesmo guard node |
| `npm run check:recibo-exclusao` sai 0 | ✅ os três espelhos em sincronia com `pii-inventory.yaml` |
| `npm run lint` ≤ 97 erros `tsc` | ✅ **97 = baseline**, nos 9 commits |
| Suíte vitest | ✅ **173 arquivos, 1689/1689** — o CONSOL-04 fechou (era 1688/1689) |
| Nenhum deploy foi feito | ✅ zero `functions deploy`, zero `db push`, zero `apply_migration` |
| Zero commit com `--no-verify` | ✅ nos 9 |

**Verificação extra que este plano rodou por conta própria:** a prova de que
`efExecutaPassosDestrutivos` **discrimina** — medida contra três alvos, um deles uma EF que
chama `deleteUser` sem tocar em Storage. Sem ela, um predicado observado só em `true` seria
indistinguível de `() => true`, que é a mesma cegueira que derrubou a versão anterior do portão,
no sentido inverso.

## Known Stubs

**Nenhum.** Os quatro passos estão completos e exercitados por 49 asserções. O que falta é
**apply + deploy**, que é o 45-11 por desenho, e os **dois defeitos acima**, que são de outro
plano por escopo — nenhum dos três é stub.

## User Setup Required

Nenhum neste plano. Para o 45-11: `NOTIFICACOES_MODO` precisa ser confirmado no dashboard antes
de qualquer execução real — o passo 4 agora respeita o modo, e em `teste` ele desvia para o sink
em vez de alcançar o titular.

## Next Phase Readiness

**Pronto para o 45-11:**
- O motor inteiro escrito, com o `<verify>` de cada tarefa verde e os três guards estáticos
  passando.
- A ordem de apply do 45-07 permanece a do `45-07-SUMMARY.md`; os md5 daquele SUMMARY seguem
  válidos (**nenhuma migration foi editada por este plano**).

**Bloqueios que o 45-11 NÃO pode ignorar — agora são TRÊS:**
1. **G1 continua ABERTO.** O fluxo nunca foi exercitado ponta a ponta em PROD.
2. **`DI-45-07-01` continua ABERTO**, e o G1 **não consegue ser exercitado** enquanto ele
   estiver — é o mesmo defeito visto de dois ângulos. O conserto exige EF + migration +
   redeploy, indivisíveis.
3. **`20260805000004_p45_sever_user_id.sql` é pré-condição estrutural do passo 3.** Sem ela
   aplicada, `deleteUser` cascateia e falha com 23503 **depois** de o currículo já ter sido
   apagado.

⚠ **E uma nota de retomada que o 45-11 precisa levar em conta:** depois do passo 2 o
`.eq("user_id", user.id)` da autorização deixa de casar (D-45-11, efeito **desejado**), então a
retomada **por este caminho** só existe até o fim do passo 2. Uma execução que morra entre o
`deleteUser` e o recibo deixa o pedido com `causa='falha_recibo'` e o `plano` intacto — legível
e retomável **por um caminho de operador**, que esta fase não construiu.

---
*Phase: 45-motor-de-exclus-o-anonimiza-o*
*Completed: 2026-08-06*

## Self-Check: PASSED

- Os 4 arquivos de código/teste, o SUMMARY e o `deferred-items.md` existem em disco.
- Os 8 commits de tarefa e desvio existem no histórico (`27cff41`, `4f59484`, `8388aea`,
  `48e8ed6`, `fbac53c`, `bf51e36`, `c92c047`, `4bea827`).
- Nenhum contato com PROD: zero `functions deploy`, zero `db push`, zero `apply_migration`.
