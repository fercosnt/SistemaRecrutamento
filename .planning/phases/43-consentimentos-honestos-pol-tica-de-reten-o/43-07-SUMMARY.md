---
phase: 43
plan: 07
subsystem: prod-checkpoint
tags: [checkpoint, prod, migration, ledger, md5, edge-function, deploy, db-types, zero-destrutivo, consent-06]
status: complete
requires:
  - 43-01 · 43-03 · 43-04 · 43-05 · 43-06 (os quatro arquivos de migration + os quatro smokes, escritos e RED)
  - MCP Supabase (apply_migration / execute_sql / deploy_edge_function) — subagentes GSD nao os recebem
provides:
  - as 4 migrations VIVAS em PROD, na ordem, com version reparada e md5 provado
  - EF cadastrar-candidato v16 (fail-closed + hash de consentimento), byte-identica ao repo
  - database.types.ts regenerado — desbloqueia 43-08 e 43-09
  - a resposta da questao aberta 1 da pesquisa (autorizacoes e 1:1 na pratica)
affects:
  - 43-08 / 43-09 (desbloqueados: os tipos existem)
  - 46 (config_retencao_etapa.origem='seed' e o discriminador que a purga tem de consultar)
  - 47 (CONSOL-03: o todo novo sobre o DEFAULT de autorizacao_analise_video)
tech-stack:
  added: []
  patterns:
    - "fidelidade de apply PROVADA por md5(statements[1]) do ledger contra o md5 do arquivo, nunca presumida — 4/4 byte-identicas"
    - "fechamento de dependencias de deploy lido nos IMPORTS e no runtime, nunca no files_modified do plano"
    - "verificacao de deploy por diff byte a byte contra o repo (get_edge_function), nao por inspecao visual"
    - "delecao no diff de tipos e sinal de PARADA — investigar a causa antes de escrever, e preservar por merge quando a causa e escopo de ferramenta"
---

# 43-07 — O checkpoint de PROD: as quatro migrations vivas, a EF deployada, os tipos regenerados

**Executado:** 2026-08-02, pelo ORQUESTRADOR (subagentes GSD nao recebem os tools MCP
do Supabase — anthropics/claude-code#13898; o Supabase CLI nao esta instalado nesta
maquina, entao `supabase db push` e `npm run db:types` nao eram opcoes).

**Autonomia:** aplicado sem pausa, sob a decisao registrada do operador de 2026-07-30
— *migrations aditivas, deploys de Edge Function e smokes rodam sem pausa, reportando
cada apply; o destrutivo volta como portao explicito*. Nada nesta fase e destrutivo:
o criterio e reversibilidade, e ele foi satisfeito.

---

## Passo 0 — as seis medicoes ANTES de qualquer apply

| # | Medido | Esperado | |
|---|--------|----------|---|
| 0.1 | `autorizacoes` = **17** · `candidatos` = **21** · `candidaturas` = **9** | 17 · 21 · (medir) | ✓ |
| 0.2 | **3** policies em `autorizacoes` | 3 | ✓ |
| 0.3 | CHECK de `evento` com **6** valores, terminando em `revisao_respondida`, **sem clausula alem da lista** | idem | ✓ |
| 0.4 | **0 candidatos com mais de uma linha** em `autorizacoes` | (medir) | ▸ ver abaixo |
| 0.5 | **4** candidatos sem linha nenhuma | 4 (linha de base BD-4) | ✓ |
| 0.6 | `cron.job` = **3** | 3 | ✓ |

As 3 policies vieram exatamente como medidas em 2026-08-01: SELECT own-row do
candidato, SELECT do RH ativo, e UPDATE own-row com `qual` **E** `with_check`.
Nenhuma condicao de PARADA disparou — nao ha 4ª instancia de drift.

**0.5 foi medicao, nao gatilho.** Os 4 candidatos sem linha NAO foram back-fillados
(BD-4). A ausencia deles permanece como o registro honesto.

### A resposta da questao aberta 1 da pesquisa

**`public.autorizacoes` e 1:1 por candidato NA PRATICA** — zero candidatos com mais
de uma linha, medido duas vezes (passo 0.4 e a fixture do smoke do guard).

A tabela continua sendo **estruturalmente 1:N** (a FK nao e UNIQUE —
`isOneToOne: false` em `database.types.ts`), entao a regra "linha mais recente vence"
de `pode_receber_marketing()` (`ORDER BY created_at DESC, id DESC LIMIT 1`) esta
correta e continua necessaria. Ela so nunca foi EXERCIDA ao vivo. Consequencia para
o 43-08: a leitura own-row da tela usa a mesma expressao, de proposito, para que no
dia da segunda linha tela e banco ja concordem sem depender de alguem lembrar.

---

## Passos 1–4 — os quatro applies, na ordem, com a fidelidade PROVADA

Cada um: `apply_migration` → reparo da `version` no ledger → `md5(statements[1])`
contra o md5 do arquivo → smoke numa UNICA chamada.

| # | Migration | md5 ledger | = md5 arquivo | Smoke |
|---|-----------|-----------|:---:|-------|
| 1 | `20260801000001` colunas de prova | `b577295077ee19a1aec0f8982816c631` | ✓ | **6/6 PASS** |
| 2 | `20260801000002` matriz de retencao | `8cb402b4474047a483a979571511ad80` | ✓ | **10/10 PASS** |
| 3 | `20260801000003` guard de marketing | `b73cd76c821931259e4776c33c29e70c` | ✓ | **9/9 PASS** |
| 4 | `20260801000004` predicado + previa | `ce9d8d5565912f33fb6d8aaf8385ed74` | ✓ | **9/9 PASS** |

**4/4 byte-identicas.** A classe de perda que descartou comentarios em dois applies
anteriores deste milestone (42-06) nao se repetiu.

O `apply_migration` carimbou a propria `version` nas quatro (a primeira saiu como
`20260802140019`, o instante do apply), e as quatro foram reparadas a mao para o
prefixo do arquivo — comportamento ja medido tres vezes na Phase 42, confirmado uma
quarta aqui.

### ⚠ Nota de md5: por que o pin de `…0001` e `…0003` mudou

O runbook manda transcrever as medicoes do vivo nas linhas `>>> antes:` dos
cabecalhos **antes** do apply, e as `>>> depois:` **depois**. Isso altera o arquivo
duas vezes. Logo:

- o md5 do ledger corresponde ao arquivo **no instante do apply** (`>>> antes:`
  preenchido, `>>> depois:` vazio);
- o md5 do arquivo commitado difere disso, porque o `>>> depois:` foi preenchido
  em seguida.

Isso e consequencia do desenho do proprio runbook, nao drift. Os pins anteriores ao
checkpoint (`8cc0fd44…` para a `…0001` e `baaa48a3…` para a `…0003`, registrados no
`.continue-here.md` e no 43-05-SUMMARY) ficam SUPERSEDIDOS pelos valores da tabela
acima. As migrations `…0002` e `…0004` nao tem linhas de transcricao e mantiveram os
pins originais — o que e, ele proprio, a confirmacao de que o mecanismo e esse.

### Prova por EXECUCAO, nao por leitura

Os quatro smokes provam comportamento vivo, nao texto de definicao. Os que mais
importam:

- **`…0003` (9/9)** — a recusa do marketing esta provada por **INSERCAO REAL**:
  um `INSERT` de `divulgacao_vagas` recebe `P0003` do guard. Fail-closed nos tres
  ramos (sem linha · coluna NULL · classe desconhecida), os **6 eventos vivos
  continuam sendo aceitos** (sem essa metade, um guard que recusasse tudo passaria
  em verde), e o caminho positivo DISCRIMINA — com consentimento gravado numa
  subtransacao revertida, o mesmo INSERT e aceito.
- **`…0002` (10/10)** — a asseracao (f): as DUAS funcoes recusam o chamador **sem
  claim nenhuma** com 42501. Um guard NULL-cego (`NOT IN`) passaria pela metade
  "papel errado" em verde e falharia ABERTO exatamente para o chamador mais suspeito.
  E a asseracao que fecha o defeito sistemico medido na 42-06.
- **`…0004` (9/9)** — `md5(prosrc)` do predicado bateu o pin
  `ddfa6542921d241323c0124fc1bd1f99` (775 octetos) **de primeira**, sem discrepancia
  de extracao. Nenhum re-pin foi necessario. Os dois wrappers CHAMAM o predicado e
  nao releem a matriz por conta propria.

Os smokes que escrevem (`…0002` e `…0003`) o fazem em subtransacoes sempre
revertidas, e as asseracoes de teardown mediram que reverteram: matriz de volta ao
seed 8/8, `autorizacoes` de volta a 17 linhas, **zero consentimento fabricado
sobrevivente**, `classe_evento_notificacao` integra em 7 linhas.

---

## Passo 5 — as cinco asseracoes negativas: o que NAO aconteceu

| # | Medido | Esperado | |
|---|--------|----------|---|
| 5.1 | `cron.job` = **3** | idem 0.6 | ✓ esta fase nao cria cron nenhum |
| 5.2 | policies de `autorizacoes` = **3** | idem 0.2 | ✓ |
| 5.3 | **21** candidatos · **9** candidaturas · **17** autorizacoes | idem 0.1 | ✓ zero acao destrutiva |
| 5.4 | linhas com qualquer coluna nova nao-nula = **0** | 0 | ✓ zero back-fill, SC#1 intacto |
| 5.5 | `net._http_response` novas em 15 min = **0** | 0 | ✓ nada tocou o provedor |

O CHECK vivo pos-apply foi transcrito no `>>> depois:` da `…0003` e confere: os 6
valores preservados + `divulgacao_vagas`.

---

## Task 2 — o deploy da EF, DEPOIS das colunas

### O fechamento real de dependencias tinha SETE arquivos, nao seis

O plano previa 6. O fechamento real, lido nos `import` do entrypoint **e no
runtime**, e 7:

```
cadastrar-candidato/index.ts        (entrypoint)
_shared/constants.ts
_shared/schemas.ts                  → importa `zod` por especificador NU
_shared/consent-hash.ts
_shared/autorizacoes-registro.ts
_shared/consent-text.json
deno.json                           ← O QUE O PLANO OMITIU
```

`deno.json` e o import map que resolve `zod` → `npm:zod@3.25.76`. A versao 15 viva
tinha `import_map: false`; sem ele no bundle, o `zod` nu de `schemas.ts` nao
resolveria. **E a licao da 42-08 se repetindo com outro numero** (la o plano listava
4 e o real eram 5): o fechamento se le nos imports e no que o runtime exige, nunca
no `files_modified` de um plano.

### Uma tentativa falhou, e falhou do lado seguro

O primeiro `deploy_edge_function` foi enviado com 5 dos 7 arquivos (faltaram
`schemas.ts` e o proprio `index.ts`) e a plataforma o **recusou na validacao**:
`Entrypoint path does not exist`. Confirmado por `list_edge_functions` que a funcao
seguia na v15 com `ezbr_sha256` inalterado — a validacao acontece antes de qualquer
substituicao. Bom saber: um conjunto de arquivos incompleto nao produz uma funcao
meio-deployada.

### O deploy, e a conferencia de volta

**v15 → v16**, `verify_jwt: false` preservado (endpoint publico de cadastro; mudar
isso quebraria o cadastro inteiro), `import_map: true` (novo).

`get_edge_function` foi conferido de volta por **diff byte a byte contra o repo**,
nao por inspecao visual:

```
✓ cadastrar-candidato/index.ts       ✓ _shared/consent-hash.ts
✓ _shared/constants.ts               ✓ _shared/autorizacoes-registro.ts
✓ _shared/schemas.ts                 ✓ _shared/consent-text.json
✓ deno.json
RESULTADO: 7/7 fieis — zero perda na retransmissao
```

Os blocos longos de comentario voltaram integros. A classe de perda do drift P41 nas
EFs nao se repetiu.

### Smoke discriminante (passo 2) — sem escrever nada

`POST` com as tres chaves NOVAS de autorizacao e um `email` deliberadamente
malformado:

```json
{"ok":false,"error_code":"VALIDATION","message":"Email inválido",
 "error":"Email inválido","field":"email"}
HTTP 400
```

**`field: "email"`** — o sinal do codigo novo. Prova, numa unica chamada que nao
escreve: a funcao sobe, o import map resolveu o `zod`, o `autorizacoesSchema`
ACEITOU `autorizacao_marketing_vagas` (chave que a v15 nao conhecia) e reprovou o
e-mail. Nao foi `200`, entao o `.strict()` esta intacto (se fosse `200`, seria
regressao de seguranca D-04/LGPD-01).

### Smoke do caminho feliz (passo 3) — OPCAO A, escolhida pelo operador

O operador escolheu a opcao A e forneceu um endereco interno real. Antes de criar,
foi confirmado que o endereco **nao existia** em `auth.users`, `candidatos` nem
`usuarios_rh` — criar por cima de uma conta viva, ou dar teardown nela, seria bem
pior que pular o teste.

Linha criada, conferida:

| Campo | Valor | |
|-------|-------|---|
| `consent_text_version` | `v2-2026-08` | ✓ |
| `consent_text_hash` | `dd8f573b…c88d6653` | ✓ **identico ao hex pinado em `consent-hash.test.ts`** |
| `consent_registrado_em` | preenchida | ✓ |
| `autorizacao_marketing_vagas` | **`false`** | ✓ **mandado `false`, gravado `false`** |
| `autorizacao_comunicacao` | `true` (fixo) | ✓ fato do sistema, Art. 7º V |
| `policy_version` | `v1.0-2026-04` | ✓ |
| `ip_aceite` | preenchida | ✓ |
| `user_agent_aceite` | NULL | ✓ segue nao-coletada |

**O `false` em `autorizacao_marketing_vagas` e a prova central do CONSENT-01:** o
servidor parou de repor `true`. O `.default(true)` que sobreviveu quatro meses esta
morto, medido por escrita real e nao por leitura de schema.

**Teardown**, na ordem inversa (`autorizacoes` → `candidatos` → usuario Auth):
de volta a **21 candidatos / 17 autorizacoes / 9 candidaturas**, zero residuo do
endereco em qualquer tabela, e **zero requisicao HTTP em 10 minutos** — confirmando
que um cadastro isolado nao dispara e-mail (a confirmacao vem de `INSERT` em
`candidaturas`, que nao houve).

### ⚠ ACHADO NAO PREVISTO: `autorizacao_analise_video` e `NOT NULL DEFAULT false`

A primeira escrita pos-enforcement revelou que a linha nova nasce com
`autorizacao_analise_video = false` — **nao NULL**.

A EF esta CORRETA: ela nunca emite a chave, exatamente como o BD-2 manda e como o
docblock de `autorizacoes-registro.ts` explica (*"emitir `false` tambem estaria
errado: `false` e uma afirmacao sobre uma pergunta que deixou de ser feita"*). Quem
preenche e o **`DEFAULT` da coluna**. O codigo se absteve; o banco respondeu por ele.

E a MESMA classe de defeito que o cabecalho da `…0001` condena por tres paragrafos
a respeito do `policy_version NOT NULL DEFAULT` — e a fase tomou o cuidado de fazer
suas quatro colunas novas nullable-e-sem-DEFAULT precisamente por isso, enquanto a
coluna pre-existente segue fazendo o oposto ao lado delas. Distribuicao viva:
**0 linhas com NULL**, 14 `false`, 3 `true` — "respondeu nao" e "nunca foi
perguntado" sao indistinguiveis nesta coluna.

**Nao corrigido aqui, de proposito:** a `…0001` declara escopo negativo explicito
sobre essa coluna e o DROP dela e decisao da Phase 47 (CONSOL-03). Ampliar o escopo
de um checkpoint de PROD sem plano e exatamente o movimento que esta fase existe
para nao fazer. Registrado em
`.planning/todos/pending/43-analise-video-default-false-fabrica-afirmacao.md`.

---

## Task 2, passo 4 — `database.types.ts`

`npm run db:types` **nao roda**: o script e `npx supabase gen types typescript
--linked` e o Supabase CLI nao esta instalado nesta maquina. Usado
`mcp__supabase__generate_typescript_types`, que como efeito colateral tambem evita a
armadilha que o plano alerta (o `>` do script TRUNCA o arquivo antes de executar).
Gerado contra arquivo TEMPORARIO primeiro, como o plano manda.

Estruturas novas conferidas, todas presentes: as 4 colunas de `autorizacoes`,
`config_retencao_etapa`, `classe_evento_notificacao`, e as funcoes
`listar_matriz_retencao`, `salvar_janela_retencao`, `previa_retencao`,
`previa_retencao_total`, `candidaturas_alem_da_janela`.

### O diff trouxe 28 DELECOES — e o plano manda PARAR nisso

Parado e investigado antes de escrever qualquer coisa. Diagnostico:

- as 28 delecoes eram **EXCLUSIVAMENTE** o bloco `graphql_public`;
- **nada do schema `public` sumiu**;
- `graphql_public` nao e referenciado em `src/` nem em `supabase/`;
- causa: escopo de geracao. O CLI (`gen types typescript --linked`, sem `--schema`)
  emite `public` + `graphql_public`; o gerador do MCP emite so `public`.

**Nao e drift lateral** — e diferenca de ferramenta. Mas estreitar o artefato
trackeado em silencio por acidente de tooling tambem nao e aceitavel, entao o bloco
foi **preservado por merge** em vez de descartado.

Diff final: **113 adicoes, 0 delecoes.** Que e o que o plano exige.

`tsc` = **97** (baseline congelada) · Vitest **1335/1335** no momento do commit.
Commit `6a1b13f`, hook ativo, zero `--no-verify`.

---

## Task 3 — CONSENT-06: ✅ FECHADO em 2026-08-02

Rodado pelo OPERADOR (a chave nao existe no ambiente local — ela vive no Vault do
Supabase / dashboard do Resend). Saida datada, verbatim:

```
check-resend-dominio — reporting on rh.beautysmile.com.br

DNS records emitted by Resend:
  mark  record   type   name                     status
  ✓     DKIM     TXT    resend._domainkey.rh     verified
  ✓     SPF      MX     send.rh                  verified
  ✓     SPF      TXT    send.rh                  verified

✓ domain status: verified
✓ region: sa-east-1
✓ open_tracking: false
✓ click_tracking: false
✓ read-only run (pass --verify to trigger verification; it changes provider state).

✓ check-resend-dominio PASSED — rh.beautysmile.com.br is verified, in sa-east-1, tracking off.
```

**Confirmacao POSITIVA dos dois flags, vinda da API do provedor** — nao "nao
reportado", que o plano ja descartava como nao-passe. O dominio verificado e
nomeado: `rh.beautysmile.com.br`. Run read-only; o `--verify`, unico caminho
state-changing, NAO foi usado.

**SC#3 fechado.**

### Ganho colateral: a metade "tracking desligado" do UAT-36-1

O UAT-36-1 esta `partial` desde o encerramento do v7.0, e uma de suas metades era
exatamente esta verificacao. Ela pode ser fechada. O que resta do UAT-36-1 e a
outra metade — teste de INBOX real em Gmail/Outlook com cabecalhos PASS e Reply-To
— que nao e observavel por API e segue pendente.

### Escopo: o `cost-alerter`

O `cost-alerter` tambem envia por Resend, com a chave em env secret da EF em vez do
Vault (divergencia rastreada em `36-resend-chave-divergencia`). E e-mail interno de
custo, fora do CONSENT-06 — **mas o tracking e configuracao de DOMINIO**, entao se
o remetente dele for o mesmo `rh.beautysmile.com.br`, esta verificacao o cobre de
graca. Nao foi medido qual e o caso.

### ⚠ Nota de credencial (2026-08-02)

A chave foi passada inline na linha de comando durante a sessao, o que a gravou no
transcript em texto claro. Recomendada ROTACAO ao operador no mesmo momento. Nada
no sistema depende daquela chave especifica: a EF a le de secret, nunca do repo, e
o reporter e opt-in. Registrado aqui porque uma exposicao de credencial que nao
fica escrita e uma exposicao que ninguem lembra de fechar.

---

## O que este checkpoint NAO entrega

> ### ✅ CORRECAO (2026-08-03) — a secao abaixo esta SUPERADA
>
> **O bundle do cliente FOI publicado.** `origin/main` = `581abe1`, deploy Ready, e o
> cadastro e a revogacao foram exercitados por um navegador real (ver §"Provado ao
> vivo" no `43-VERIFICATION.md` e § do bloqueador no `STATE.md`).
>
> A secao original fica AQUI, intacta, porque ela previu corretamente o risco — e
> porque foi exatamente o risco que ela nomeia que se materializou: entre 2026-08-02
> ~14h20 e 2026-08-03 ~00h30 o cadastro devolveu `400 VALIDATION` em producao. Apagar
> o texto que acertou o diagnostico para deixar o arquivo bonito seria remover a unica
> evidencia de que o aviso existia antes do incidente.
>
> **Tres causas empilhadas, e so a primeira estava prevista aqui:**
> 1. a EF v16 breaking contra o bundle publicado — **esta secao**;
> 2. o Vercel nao buildava desde 2026-06-27 (preset `vite` procura `dist/`, o repo
>    emite em `build/`); os 20 deployments visiveis estavam em ERROR e o site servia
>    um build de junho, congelado. **Nenhum artefato deste repositorio observava
>    isso** — cinco semanas de builds quebrados passaram invisiveis;
> 3. variaveis de ambiente ausentes no build → app quebrava no boot, tela em branco.
>
> Correcoes: `274de2a` (`outputDirectory`), `0adea38` (SPA fallback — nenhuma URL
> direta funcionava, nem `/cadastro`), `581abe1` (navbar compartilhada no dashboard,
> sem a qual `/candidato/privacidade` era inalcancavel), mais as env vars nas Project
> Settings.
>
> ⚠ **A licao de processo continua ABERTA:** publicar o cliente nao pertence a plano,
> fase ou todo nenhum — e as Phases 44, 45 e 47 tambem entregam frontend. Rastreado em
> `.planning/todos/pending/publicar-cliente-nao-pertence-a-plano-nenhum.md`.

**O bundle do cliente nao foi publicado.** Nenhum plano desta fase o publica. As 4
migrations estao vivas e a EF esta na v16, mas as telas dos planos 43-08 e 43-09
existem em codigo e em teste, nao no navegador de ninguem.

Isso importa por uma razao concreta: a EF v16 e **BREAKING para clientes antigos**.
O `autorizacoesSchema` ganhou `.strict()` e perdeu `autorizacao_analise_video` /
`autorizacao_comunicacao`, entao um bundle de browser desatualizado recebe
`400 VALIDATION` ao tentar cadastrar. Isso e o comportamento CORRETO (D-04 /
LGPD-01) e e exatamente por isso que a ordem migration → EF → cliente e obrigatoria
— mas significa que **publicar o cliente e passo pendente e ORDENADO**, nao
opcional.

## Self-Check

- [x] As 4 migrations vivas, na ordem, `version` reparada, md5 provado 4/4
- [x] Colunas ANTES da Edge Function — sem janela de consentimento sem prova
- [x] Os 4 smokes no total exato (6/6, 10/10, 9/9, 9/9)
- [x] As 5 asseracoes negativas confirmadas
- [x] Nenhuma linha de candidato criada/alterada/apagada alem da fixture, criada e removida
- [x] `database.types.ts` regenerado apos o ultimo apply, 113 adicoes / 0 delecoes
- [x] **CONSENT-06 — tracking do Resend: FECHADO** (2026-08-02, confirmacao positiva pela API)
