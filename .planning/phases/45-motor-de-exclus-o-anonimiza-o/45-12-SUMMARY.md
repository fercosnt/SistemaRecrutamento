---
phase: 45-motor-de-exclus-o-anonimiza-o
plan: 12
subsystem: auth
tags: [supabase, edge-functions, postgrest, jwt, rls, security-definer, acl, lgpd, deno, vitest]

requires:
  - phase: 45-10
    provides: o motor destrutivo (4 passos) e as duas medições do `DI-45-10-01` / `DI-45-10-02`
  - phase: 45-07
    provides: `plano_exclusao_titular` e `anonimizar_candidato` (escritas, não aplicadas)
  - phase: 45-09
    provides: `retirar_candidatura` (RPC) e o hook/card do titular
provides:
  - "terceiro client na EF `executar-direito-titular`: service key + `Authorization` do titular, com as 4 RPCs da fase saindo dele e nenhuma outra chamada mudando de papel"
  - "migration `20260805000009` (NÃO aplicada): `GRANT EXECUTE ... TO authenticated` nas 5 RPCs alcançáveis pelo titular, com REVOKE nominal de `anon` e auto-verificação por catálogo"
  - "metade (b) do guard de `plano_exclusao_titular` e `anonimizar_candidato` estendida para aceitar `rh`, `administrador` OU o próprio titular, por `IS DISTINCT FROM`"
  - "ação `retirar_candidatura` no vocabulário fechado da EF, ponta a ponta, com o `22023` traduzido para o motivo de domínio correto"
  - "`traduzirErro` do hook lendo o campo `motivo` (domínio) em vez do `error_code` (transporte)"
  - "asserção C1 do smoke reescrita: ACL diferenciada por função, `authenticated` EXIGIDO nas quatro"
affects: [45-11, 46, bias-audit, ui-retirada]

actuals:
  tokens: 30600
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "três clients numa Edge Function, um por papel efetivo no PostgREST (anon / authenticated-com-claims / service_role)"
    - "mock que expõe SÓ a superfície permitida e LANÇA no resto, com meta-teste provando que ele reprova"
    - "tradução de SQLSTATE por AÇÃO quando o mesmo código carrega dois fatos de domínio diferentes"
    - "migration de ACL puro com auto-verificação que pergunta ao catálogo (`has_function_privilege`), nunca ao texto do arquivo"

key-files:
  created:
    - supabase/migrations/20260805000009_p45_claims_do_titular.sql
    - src/features/vagas/hooks/__tests__/useRetirarCandidatura.test.ts
  modified:
    - supabase/functions/executar-direito-titular/index.ts
    - supabase/functions/executar-direito-titular/index.test.ts
    - src/features/vagas/hooks/useRetirarCandidatura.ts
    - supabase/migrations/20260805000005_p45_plano_e_dry_run.sql
    - supabase/migrations/20260805000006_p45_anonimizar_candidato.sql
    - supabase/tests/p45_motor_exclusao_smoke.sql

key-decisions:
  - "O repasse das claims vive num TERCEIRO client, e o `supabaseAdmin` permanece sem `Authorization`: o mesmo header governa PostgREST, Storage e Auth Admin, e movê-lo quebraria `deleteUser`, `ler_resend_api_key` e os carimbos DEPOIS da mutação irreversível"
  - "A metade (b) do guard das duas funções do motor foi ESTENDIDA (rh | administrador | dono), nunca afrouxada: a metade (a) — `auth.uid() IS NULL` → 42501 — não foi tocada em função nenhuma"
  - "`candidatura_id` é a ÚNICA emenda ao DESVIO 1 da EF, e ele SELECIONA sem AUTORIZAR: quem autoriza é o guard da RPC comparando o dono da linha com o `auth.uid()` re-derivado do JWT dentro do banco"
  - "O SQLSTATE `22023` é traduzido POR AÇÃO: 'não há pedido cancelável' e 'candidatura já decidida' são dois fatos de domínio com o mesmo código, e uma tradução única faria o titular ler a copy do outro caminho"
  - "O hook lê o `motivo` (domínio) com precedência sobre o `error_code` (transporte), mantendo o fallback TOTAL para `SERVER_ERROR`"
  - "A contradição medida entre a C1 e `20260805000003` sobre `gerar_bias_snapshot` foi REGISTRADA, não resolvida: a asserção foi escrita como especificada e a decisão é do code review bloqueante do 45-11"

patterns-established:
  - "Asserção negativa que vive no MOCK: o client do titular expõe `rpc` e lança em `auth`/`storage`/`from`, com meta-teste provando que ele de fato reprova — a lista de caminhos proibidos deixa de depender de alguém lembrar de atualizá-la"
  - "Auto-verificação de ACL por catálogo: um `GRANT` que não pega é indistinguível de um que pegou se ninguém perguntar, e o modo de falha é um `42501` que parece autorização funcionando"
  - "Guard de titularidade sempre por `IS DISTINCT FROM`: com um dos lados NULL, `NOT IN` avalia NULL, o `IF` não é tomado e o guard falha ABERTO para o chamador mais suspeito"

requirements-completed: [ERASE-02, ERASE-03, ERASE-05, ERASE-06, ERASE-10]

coverage:
  - id: D1
    description: "As claims do titular chegam às quatro RPCs da fase por um terceiro client, e nenhuma chamada que precisa de `service_role` mudou de papel junto"
    requirement: "ERASE-03"
    verification:
      - kind: unit
        ref: "deno test supabase/functions/executar-direito-titular/ — (ss), (ss2), (ss3), (ss4), (ss5), (ss6)"
        status: pass
      - kind: other
        ref: "GUARD T1 (node) — as 4 RPCs em `supabaseTitular.rpc`, zero em `supabaseAdmin.rpc`; `deleteUser` e `ler_resend_api_key` no client de serviço"
        status: pass
    human_judgment: false
  - id: D2
    description: "`retirar_candidatura` existe ponta a ponta na Edge Function, com o `22023` virando `400 VALIDATION` com motivo próprio e o `42501` virando `403`"
    requirement: "ERASE-05"
    verification:
      - kind: unit
        ref: "deno test supabase/functions/executar-direito-titular/ — (tt), (uu), (vv), (ww), (xx), (yy), (zz), (ab)"
        status: pass
      - kind: other
        ref: "GUARD T2 (node) — `ACOES` com quatro valores, RPC no client do titular, zero chave de serviço em `src/`"
        status: pass
    human_judgment: false
  - id: D3
    description: "O hook traduz o motivo de domínio para `NAO_RETIRAVEL` e degrada motivo desconhecido para `SERVER_ERROR` sem vazar transporte"
    requirement: "ERASE-05"
    verification:
      - kind: unit
        ref: "src/features/vagas/hooks/__tests__/useRetirarCandidatura.test.ts — 7 casos"
        status: pass
    human_judgment: false
  - id: D4
    description: "Migration `20260805000009` escrita: `GRANT EXECUTE ... TO authenticated` nas cinco RPCs alcançáveis pelo titular, com REVOKE nominal de `anon` e auto-verificação por catálogo"
    requirement: "ERASE-02"
    verification:
      - kind: other
        ref: "GUARD T3 (node) — cinco assinaturas completas, zero GRANT a `anon`, `gerar_bias_snapshot` ausente, sem wrapper `BEGIN;`"
        status: pass
      - kind: manual_procedural
        ref: "45-11 § ordem obrigatória de apply — o bloco `DO $verifica_claims_do_titular$` só roda no apply"
        status: unknown
    human_judgment: true
    rationale: "A migration NÃO foi aplicada por desenho (o portão destrutivo é do 45-11). O bloco de auto-verificação e o `GRANT` real só podem ser exercitados em PROD, atrás do code review bloqueante."
  - id: D5
    description: "A metade (b) do guard de `plano_exclusao_titular` e `anonimizar_candidato` reconhece o titular, e a metade (a) segue intacta"
    requirement: "ERASE-10"
    verification:
      - kind: other
        ref: "GUARD T3 (node) — `v_uid IS NULL` presente, zero `NOT IN` de papel, `proprio titular` nomeado, mensagem exclusiva antiga ausente dos RAISE e dos COMMENT"
        status: pass
      - kind: manual_procedural
        ref: "blocos de auto-verificação de `20260805000005` e `20260805000006` (titular ACEITO + não-dono RECUSADO com 42501) — só rodam no apply do 45-11"
        status: unknown
    human_judgment: true
    rationale: "Alterar um guard que protege uma função que apaga PII irreversivelmente exige revisão humana antes do primeiro apply — é o controle que a decisão do operador de 2026-08-06 nomeia."
  - id: D6
    description: "Asserção C1 do smoke reescrita: `anon`/PUBLIC proibidos nas cinco, `authenticated` EXIGIDO nas quatro, C2 byte-idêntica e contador fixo em 21"
    requirement: "ERASE-06"
    verification:
      - kind: other
        ref: "GUARD T3 (node) — contador 21, marcadores `PENDENTE-45-07` intactos, bloco `$c2$` inalterado"
        status: pass
      - kind: manual_procedural
        ref: "DI-45-12-01 — contradição com `20260805000003` sobre `gerar_bias_snapshot`, endereçada ao code review do 45-11"
        status: unknown
    human_judgment: true
    rationale: "A C1 contém uma contradição MEDIDA com uma migration deliberada. Resolver isso é decisão de desenho, não conserto mecânico, e afrouxar a asserção por conta própria é o reflexo que esta fase proíbe."

duration: 22min
completed: 2026-08-06
status: complete
---

# Phase 45 Plano 12: As claims do titular e a retirada de candidatura — Resumo

**Os dois itens diferidos que travavam o portão destrutivo estão fechados no disco: as claims do titular alcançam as cinco RPCs da fase por um client que não muda o papel de nenhuma outra chamada, o guard das duas funções do motor reconhece o chamador que o desenho de fato tem sem afrouxar a metade que recusa quem não tem sessão, e a retirada de candidatura existe ponta a ponta com a copy certa — com zero apply, zero deploy e zero contato com PROD.**

## Performance

- **Duração:** ~22 min
- **Tarefas:** 3 de 3
- **Commits:** 5 (2 pares RED/GREEN + 1 de SQL), **zero `--no-verify`**
- **Suíte:** `npm run test:run` **1696/1696** (baseline era 1689 — o arquivo de teste do hook é novo)
- **Deno:** `deno test supabase/functions/executar-direito-titular/` **63/63**, com o comando **nu** (sem `--allow-net`, sem `--allow-env`; baseline era 49)
- **`tsc`:** **97**, exatamente a baseline congelada desde a Phase 42
- **`npm run check:recibo-exclusao`:** exit 0 — o plano não tocou os espelhos, e a checagem prova que não tocou

## Accomplishments

### Task 1 — O terceiro client (fecha a metade de escrita do `DI-45-10-01`)

`Deps` ganhou `supabaseTitular`: service key no `apikey` **e** o `Authorization` do titular. As quatro RPCs da fase (`registrar_pedido_exclusao`, `cancelar_pedido_exclusao`, `plano_exclusao_titular`, `anonimizar_candidato`) passaram a sair dele; **nenhuma outra chamada mudou de client**.

A razão de ser um terceiro client, e não o header no que já existia, está medida nos call sites: o `Authorization` é o **mesmo header** para PostgREST, para a Storage API e para a Auth Admin API. Acrescentá-lo ao `supabaseAdmin` não "melhora as RPCs" — troca o papel de **todas** as chamadas dele para `authenticated` de uma vez: `deleteUser` passa a `403`, `ler_resend_api_key` está REVOGADA de `authenticated` desde a P36, e os carimbos em `solicitacoes_dados` passariam a depender de uma policy own-row que o tombstone quebra por desenho (D-45-11). Os dois últimos falhariam **depois** da mutação irreversível.

A asserção que carrega isso vive no **mock**, não numa lista: o dublê do client do titular expõe `rpc` e lança em `auth`, `storage` e `from`, nomeando o caminho tocado. E há meta-teste `(ss5)` provando que ele de fato reprova — sem ele, a asserção negativa poderia estar vazia.

O docblock do módulo deixou de descrever um defeito aberto e passou a descrever o **contrato de claims por chamada**. Esse arquivo já afirmou uma vez o oposto do que fazia (desvio 3 do 45-10); num módulo cujo modo de falha é irreversível, uma garantia velha é pior que nenhuma.

### Task 2 — `retirar_candidatura`, a ação que faltava (`DI-45-10-02`)

`ACOES` passou de três para quatro valores, e **as quatro permanecem distintas** — retirar uma candidatura encerra o funil na hora e não apaga dado nenhum; apagar os dados enfileira, espera a janela e executa (D-45-06).

O `candidatura_id` é a **única** emenda ao DESVIO 1 desta EF, e ela é defensável exatamente porque a Task 1 fez as claims chegarem: o id **seleciona** qual das candidaturas do titular e **não autoriza** nada — quem autoriza é o guard da RPC (`v_dono IS DISTINCT FROM v_uid` → `42501`), comparando o dono da linha com o `auth.uid()` re-derivado do JWT dentro do banco. Sem as claims, o guard recusaria todo mundo e a autorização não existiria em lugar nenhum.

O formato é validado antes de qualquer toque privilegiado (falha FECHADA), e um retorno que não seja timestamp não-vazio fecha em `500` — a RPC devolve `timestamptz` **escalar**, não `RETURNS TABLE`, então o helper de primeira linha não se aplica.

**O terceiro defeito, medido neste plano:** a recusa de domínio nunca alcançaria a copy certa. O `COMMENT` de `retirar_candidatura` manda traduzir `22023` para `400 VALIDATION com codigo proprio`, e esse código vive no campo `motivo` (Invariante 12) — mas o `traduzirErro` do hook casava contra `error_code`, cujo vocabulário fechado tem cinco valores e nenhum é `CANDIDATURA_NAO_RETIRAVEL`. Toda recusa legítima virava `SERVER_ERROR`: erro de servidor onde não há erro de servidor nenhum. O hook passou a ler o `motivo`, com o fallback total preservado.

### Task 3 — A metade SQL

- **`20260805000009_p45_claims_do_titular.sql` (nova, NÃO aplicada):** `REVOKE ALL ... FROM PUBLIC, anon` nominal e `GRANT EXECUTE ... TO authenticated` nas **cinco** RPCs alcançáveis pelo titular, com assinatura completa. `gerar_bias_snapshot` **não entra**. Sem wrapper `BEGIN;`/`COMMIT;`, com a nota inline explicando o `42601` do transaction pooler, e com o comando de reparo do ledger tanto no cabeçalho quanto num `RAISE NOTICE` do bloco de auto-verificação — para que ele exista também dentro do SQL que o ledger guarda.

  O bloco anônimo pergunta ao **catálogo** (`has_function_privilege`), função por função, se `authenticated` executa e `anon` não. Um `GRANT` que não pega é indistinguível de um que pegou se ninguém perguntar — e o desfecho de um `GRANT` silenciosamente ausente é o `42501` de hoje voltando em PROD, que é a falha que ninguém investiga porque **parece autorização funcionando**.

- **Guard estendido em `20260805000005` e `20260805000006`:** a metade (b) passou a recusar quem não é `rh`, não é `administrador` **e** não é o dono do `p_candidato_id` — três comparações, todas por `IS DISTINCT FROM`. A metade (a) **não foi tocada em nenhuma das duas**. Os blocos de auto-verificação ganharam o titular ACEITO **e** o não-dono RECUSADO com `42501` — sem o segundo, o primeiro não prova nada. Os `COMMENT` das duas descrevem o contrato novo com a razão datada do descompasso 45-07 × 45-10.

- **C1 do smoke reescrita, ENDURECENDO:** `anon` e PUBLIC seguem proibidos nas cinco; para as quatro alcançáveis pelo titular, `EXECUTE` a `authenticated` passa a ser **exigido** (ausência reprova — é o que impede a migration de sumir em silêncio). A **C2 não foi tocada**, e a verificação que autoriza a reescrita é verificável sem apply nenhum: o `uuid` que a C2 usa é sintético e inexistente, então o dono resolve NULL, `NULL IS DISTINCT FROM <uid>` é TRUE, e as dez recusas sobrevivem intactas. O contador fixo do cabeçalho segue **21** e os marcadores `PENDENTE-45-07` estão intactos.

## ⚠⚠ AS TRÊS OBRIGAÇÕES DE HANDOFF PARA O 45-11

### 1 · Os `md5(prosrc)` recomputados — **ESTE documento substitui o `45-07-SUMMARY.md`**

O guard das duas funções do motor mudou, logo o corpo delas mudou, logo o `md5(prosrc)` mudou. A asserção **C3** do smoke compara o md5 vivo contra um pin, e uma divergência é **parada imediata** no 45-11. Deixar a referência velha de pé transformaria uma edição legítima em incidente.

**A partir daqui, o 45-11 confere `md5(prosrc)` contra ESTES valores — não contra os do `45-07-SUMMARY.md`, que este plano INVALIDOU:**

| função | `md5(prosrc)` | octetos |
|---|---|---|
| `public.plano_exclusao_titular(uuid)` | `702dc0a6ef56b75104d940d94747760f` | 9964 |
| `public.anonimizar_candidato(uuid, boolean)` | `c6136674036d0b99f0c71c37d24e7bf8` | 18172 |

Receita — a mesma do smoke §PROVENIENCIA, corpo entre os dois delimitadores NOMEADOS de cifrão:

```
node -e 'const f=require("fs").readFileSync(process.argv[1],"utf8"),
  D="$"+process.argv[2]+"$", a=f.indexOf(D), b=f.indexOf(D,a+D.length);
  console.log(require("crypto").createHash("md5")
    .update(f.slice(a+D.length,b),"utf8").digest("hex"))' \
  supabase/migrations/20260805000006_p45_anonimizar_candidato.sql \
  anonimizar_candidato
```

Conferido: o delimitador aparece **exatamente duas vezes** em cada arquivo, e o corpo extraído começa em `\nDECLARE` e termina em `END;\n` — a extração não pegou prosa.

### 2 · A ordem de apply atualizada — `20260805000009` **POR ÚLTIMO**

```
deploy da EF `notificar-rh`
  → 20260805000007   (retirar_candidatura + evento)
  → 20260805000008   (v_triagem_panel_encerramento)   [sem ordem entre si]
  → 20260805000005   (plano_exclusao_titular)
  → 20260805000006   (anonimizar_candidato — exige 000003, 000004 e 000005 antes)
  → **20260805000009 (claims do titular — POR ÚLTIMO, sempre)**
  → db:types + remover a ponte de tipos
```

⚠ A `20260805000009` concede `EXECUTE` sobre funções que **ainda não existem em PROD**. Aplicá-la antes de `000005`, `000006` e `000007` falha com `undefined_function` — e o bloco de auto-verificação dela diz isso com todas as letras em vez de deixar o erro cru do Postgres explicar.

### 3 · O **redeploy** de `executar-direito-titular` continua ABERTO

O `DI-45-10-01` descreve o conserto como indivisível em três: o terceiro client, a migration de `GRANT`, e o **redeploy**. Este plano fechou as **duas de escrita**. A terceira é do 45-11, e sem ela nada muda em produção: a versão viva da EF é a do 45-06, que não tem o terceiro client. O G1 exige exercitar o fluxo ponta a ponta — e ele só roda depois de **apply + redeploy**, nesta ordem.

## Deviations from Plan

### ⚠ Achado que exige decisão humana — NÃO resolvido por este plano

**1. [Rule 4 — Registrado, não decidido] A C1 e a `20260805000003` afirmam coisas OPOSTAS sobre `gerar_bias_snapshot`**

- **Encontrado durante:** Task 3c, ao reescrever a C1.
- **O quê:** o plano manda a C1 continuar proibindo `EXECUTE` a `authenticated` em `gerar_bias_snapshot`. Mas `20260805000003:500-501` faz `REVOKE ALL … FROM PUBLIC, anon, authenticated` **seguido de** `GRANT EXECUTE … TO authenticated`, e o bloco (6) do cabeçalho daquela migration declara a divergência com a razão medida: o chamador vivo é o cliente do navegador do administrador (`biasAuditService.ts:98`), que fala com o Postgres como `authenticated`. Revogar dali não endureceria nada — apagaria a tela de auditoria de viés.
- **A origem do descompasso é visível no próprio comentário da C1:** ela dizia sair *"VERMELHA para ela até o 45-05 reafirmar o REVOKE nominal"*. O 45-05 escolheu **não** reafirmar, por escrito, e ninguém reconciliou as duas peças.
- **O que foi feito:** a asserção foi escrita **como especificada** (o plano traz isso como *prohibition* nominal e como critério de aceitação literal), e a **mensagem de falha dela nomeia a contradição** e manda ler o item diferido antes de mexer em ACL. Reescrever a asserção para o contrário seria o executor afrouxando um gate por conta própria — precisamente o reflexo que esta fase proíbe.
- **Consequência:** a C1 vai reprovar no 45-11 por um privilégio que é deliberado. Não é defeito de ACL; é uma decisão pendente.
- **Registrado em:** `deferred-items.md` § `DI-45-12-01` e `.planning/WINDOWS.md`.
- **Fecha em:** o **code review bloqueante do 45-11 (Task 1)**, que é exatamente o controle humano nomeado pela decisão do operador de 2026-08-06 (*"Executar; revisar no portão"*).

### Ajustes menores, sem mudança de contrato

**2. [Rule 3 — Bloqueio] A leitura do dono foi movida/adicionada antes da metade (b) do guard**

- **Encontrado durante:** Task 3b.
- **Issue:** a metade (b) estendida precisa do dono de `p_candidato_id`, e em `plano_exclusao_titular` a leitura acontecia **depois** do guard; em `anonimizar_candidato` ela vinha depois da chamada a `plano_exclusao_titular`.
- **Fix:** em `20260805000005`, a leitura existente foi **movida** para cima (não há segunda consulta). Em `20260805000006`, foi acrescentada uma leitura de **uma coluna** (`v_dono`), escopada ao id recebido, antes do guard — nada é devolvido antes da recusa.
- **Efeito colateral esperado e registrado:** os dois `md5(prosrc)` mudaram, e é por isso que a obrigação de handoff nº 1 existe.

**3. [Rule 3 — Bloqueio] O bloco de auto-verificação de `20260805000005` passou a exigir candidato COM `user_id`**

- **Issue:** o bloco selecionava o primeiro candidato qualquer; sem `user_id` não haveria titular a impersonar e o caso ACEITO provaria metade do guard.
- **Fix:** `WHERE c.user_id IS NOT NULL`, com a mensagem de falha reescrita para dizer as duas razões.

**4. [Rule 2 — Legibilidade do gate] O comando de reparo do ledger também vive num `RAISE NOTICE`**

- **Razão:** o gate automático deste plano exige `supabase_migrations.schema_migrations` no SQL **executável** da migration, não apenas em comentário. Colocá-lo num `RAISE NOTICE` do bloco de auto-verificação satisfaz o gate e, mais útil, faz a própria migration imprimir o comando logo após o apply.

## Known Stubs

Nenhum. Não há valor vazio, placeholder nem componente sem fonte de dados introduzido por este plano.

⚠ O que existe, e é diferente de stub: **nada foi aplicado e nada foi deployado**. Os três artefatos SQL e a Edge Function estão corretos **no disco** e a produção continua exatamente como estava. Isso é o desenho da fase (nenhuma wave mistura escrever uma migration com aplicá-la), não uma pendência de implementação.

## Threat Flags

Nenhuma superfície de segurança nova além da que o `<threat_model>` do plano já enumera. As duas mudanças de superfície são as previstas e mitigadas:

| Ameaça | Mitigação entregue |
|---|---|
| T-45-12-01 · `GRANT` a `authenticated` nas 5 RPCs DEFINER | guard do corpo como controle único e explícito: metade (a) intacta, metade (b) por `IS DISTINCT FROM` com ramo de titularidade; C2 imutável prova as 10 recusas; C1 exige o `GRANT` presente nas quatro e ausente em `gerar_bias_snapshot` |
| T-45-12-02 · `candidatura_id` vindo do corpo | o id SELECIONA e não AUTORIZA; formato validado antes de qualquer RPC; guard da RPC recusa id alheio com `42501` → `403`; nenhum outro identificador do corpo é lido |
| T-45-12-03 · `Authorization` no client de serviço | terceiro client separado, com guard automático rejeitando Auth Admin, Storage e tabela no client do titular, e exigindo `deleteUser` e `ler_resend_api_key` no de serviço |
| T-45-12-08 · `GRANT` que não pega em PROD | bloco anônimo na própria migration pergunta ao catálogo, por função, as duas condições |

## Commits

| # | Hash | Mensagem |
|---|---|---|
| 1 | `bdb2415` | `test(45-12)`: RED — as claims do titular chegando às RPCs |
| 2 | `151eaba` | `feat(45-12)`: GREEN — o terceiro client e as 4 RPCs |
| 3 | `861e7fb` | `test(45-12)`: RED — a retirada e a copy que nunca chegaria |
| 4 | `e8d9bf7` | `feat(45-12)`: GREEN — a retirada ponta a ponta e o `motivo` no hook |
| 5 | `3adae00` | `feat(45-12)`: o `GRANT`, o guard que reconhece o titular e a C1 |

## Verificação

- [x] `deno test supabase/functions/executar-direito-titular/` — **63/63**, comando nu, > 49 do 45-10
- [x] `npm run test:run` — **1696/1696**, > 1689
- [x] `npm run lint` — **97** erros `tsc` (baseline)
- [x] `GUARD T1 OK`, `GUARD T2 OK`, `GUARD T3 OK`
- [x] contador FIXO do smoke em **21**; bloco `$c2$` **byte-idêntico** (zero linhas do diff o alcançam)
- [x] marcadores `PENDENTE-45-07` intactos
- [x] `npm run check:recibo-exclusao` — exit 0
- [x] **zero `apply_migration`, zero `db push`, zero `functions deploy`, zero contato com PROD**
- [x] **zero commit com `--no-verify`**

## Self-Check: PASSED

- `supabase/migrations/20260805000009_p45_claims_do_titular.sql` — FOUND
- `src/features/vagas/hooks/__tests__/useRetirarCandidatura.test.ts` — FOUND
- commits `bdb2415`, `151eaba`, `861e7fb`, `e8d9bf7`, `3adae00` — todos FOUND em `git log`
