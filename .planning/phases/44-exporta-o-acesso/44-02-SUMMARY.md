---
phase: 44
plan: 02
subsystem: banco
status: complete
tags: [lgpd, export, art19, sla, rls, security-definer, bd-8, smoke, 42601]

requires:
  - "20260730000001_p42_revisao_art20.sql:280-513 — molde das duas RPCs e da tabela de config"
  - "20260607000006_rls_policies_m2_backbone.sql:38-42 — predicado own-row espelhado"
  - "20260730000002_p42_revisao_art20_authz_fail_closed.sql — guard NULL-safe e REVOKE nominal de anon"
  - "public.tocar_atualizado_em() (P37, 20260722000002:144) — reusada, nunca redefinida"
  - "44-CONTEXT §BD-8 — a decisão do operador sobre o escopo da fila"
provides:
  - "public.config_sla_dados (tabela + seed acesso_dados 7/12 + trigger de carimbo)"
  - "public.solicitacoes_dados (tabela com tipo/situacao/causa fechados por CHECK + índice de cooldown + RLS own-row)"
  - "public.listar_pedidos_dados(boolean) — RPC SECURITY DEFINER, 7 colunas nomeadas, LIMIT 200"
  - "public.contar_pedidos_dados_pendentes() — RPC SECURITY DEFINER, mesmo predicado"
  - "supabase/tests/p44_pedidos_dados_smoke.sql — 14 asserções, cinco negativas"
  - "contrato de colunas da fila do RH consumido pelo espelho cliente de 44-08/44-09"
affects:
  - "44-04 — aplica as duas migrations, repara o ledger, mede M3 e RODA este smoke"
  - "44-05 — a EF escreve nesta tabela com service_role e lê solicitado_em para o cooldown"
  - "44-06/44-07 — o painel do candidato lê a própria linha por RLS own-row"
  - "44-08/44-09 — a fila e o badge do RH consomem as duas RPCs"
  - "Phase 45 — herda a coluna tipo já com exclusao aceito, sem migration de retrofit"

tech-stack:
  patterns:
    - "migration sem wrapper BEGIN/COMMIT (gatilho documentado do 42601)"
    - "guard NULL-safe com IS DISTINCT FROM em SECURITY DEFINER (nunca NOT IN, que falha aberto)"
    - "REVOKE que NOMEIA anon (pg_default_acl concede EXECUTE como grant direto)"
    - "smoke gate-GUC com esperado FIXO + contador incrementado FORA da subtransação revertida"
    - "prova de ordenação por WITH ORDINALITY sobre função de conjunto"

key-files:
  created:
    - supabase/migrations/20260804000001_p44_config_sla_dados.sql
    - supabase/migrations/20260804000002_p44_solicitacoes_dados.sql
    - supabase/tests/p44_pedidos_dados_smoke.sql

decisions:
  - "O smoke NÃO fabrica candidatos: resolve identidades vivas e escreve só em solicitacoes_dados. Fabricar exigiria escrever em auth.users (candidatos.user_id é NOT NULL UNIQUE REFERENCES auth.users) em PRODUÇÃO — preço alto demais por conveniência de asserção."
  - "O recrutador do cenário negativo de (k) é um uuid SINTÉTICO com papel rh. A função só usa v_uid para casar com vagas.created_by, então um dono-de-nada é o negativo mais forte disponível e não exige identidade nova em PROD."
  - "O contador do gate-GUC é incrementado FORA da subtransação. Alterações de GUC são transacionais: incrementar dentro de um bloco revertido perderia o incremento e o RESUMO reprovaria um run correto."
  - "A ordenação é provada por WITH ORDINALITY, não por row_number() OVER () — a segunda dependeria de um detalhe de execução que o Postgres não contrata."
  - "O par de cifrões não aparece literalmente nem em comentário na migration 1, cuja premissa é não ter corpo assim delimitado. Zero migrations aplicadas do repositório o fazem."
  - "Nenhum requirement marcado Complete: os arquivos nem sequer foram aplicados (isso é 44-04), e EXPORT-05 só é observável quando a fila do RH renderizar (44-08/44-09)."

metrics:
  duration: ~35min
  completed: 2026-08-03
  tasks: 3
  commits: 4
  files: 3

actuals:
  tokens: 21653
  tasks: 3
  commits: 4
---

# Phase 44 Plan 02: Registro do pedido de dados + as duas RPCs do BD-8 — Summary

As duas tabelas que fazem o pedido de cópia existir como fato durável — o registro que **é** o
cooldown e **é** o marco do Art. 19, II, e a config de limiares alterável sem deploy — mais as duas
RPCs de supervisão do RH com o predicado de escopo do BD-8 escrito uma vez e usado nas duas, e o
smoke de 14 asserções que prova tudo isso por **execução**.

**Zero contato com PROD.** Nenhum `db push`, nenhum `apply_migration`, nenhum `migration repair`. O
apply é o plano 44-04, que carrega o checkpoint humano exatamente por isso.

## O que foi construído

### Task 1 — `config_sla_dados` (`499fb1d`)

Espelho estrutural de `config_sla_revisao`: CHECK de ordem, RLS ligada, **uma** policy de SELECT
RH-only, zero policy de escrita, seed `ON CONFLICT DO NOTHING` (jamais upsert), trigger
`tocar_atualizado_em()` **reusada** e não redefinida.

Duas coisas do molde foram deliberadamente **não** copiadas, e as duas importam:

1. **A RLS de `config_sla_etapa`**, que é public-read por desenho do painel do candidato. Copiá-la
   poria o limiar interno ao alcance do papel anônimo e derrubaria a Invariante 8 da UI-SPEC *por
   baixo da tela* — e essa invariante não pode depender de a tela não renderizar.
2. **O enquadramento jurídico do COMMENT.** O análogo diz, corretamente, que o Art. 20 não fixa
   prazo. Copiar isso aqui produziria **documentação falsa**: o Art. 19, II fixa **15 dias
   corridos**. Nos COMMENTs desta tabela os 15 dias são **teto legal**; 7 e 12 são metas internas
   escolhidas **abaixo** dele, porque um alerta que dispara no dia do vencimento é constatação, não
   alerta.

**A constraint que não existe é uma decisão, e está escrita como tal.** Não há CHECK travando
`dias_atraso` abaixo de 15: a ANPD pode dispor prazo diferenciado por setor (Art. 19 §4º), e um
CHECK travaria uma alteração legítima numa tabela cuja razão de existir é ser alterável sem deploy.
O teto vive na copy e no comentário — que se alteram junto com a lei; a constraint não.

### Task 2 — `solicitacoes_dados` + as duas RPCs (`9a975b7`)

A tabela nasce com `tipo` fechado por CHECK em `acesso`/`exclusao` e **um só valor em uso**. A
economia é para a Phase 45, que é a fase de maior risco do milestone e não pode gastar orçamento de
risco com migration de retrofit sobre linhas vivas. O corolário obrigatório está nas duas RPCs:
filtro `tipo = 'acesso'` **no servidor**, senão as linhas de exclusão da P45 entram nesta tela em
silêncio, misturando dois direitos e dois prazos legais.

**`solicitado_em` é um marco com dois consumidores** — o cooldown da EF e a contagem de dias da fila
do RH. Um único marco é o que faz o SC#4 medir a coisa certa. Um segundo carimbo para "quando o RH
viu" não existe de propósito: o prazo corre do pedido, não da ciência de quem atende.

**A FK ficou sem `ON DELETE`, e o `COMMENT ON CONSTRAINT` diz por quê.** Se o pedido de acesso
sobrevive ao tombstone do candidato é decisão da Phase 45, que é quem carrega o portão destrutivo.
Escolher agora seria decidir por uma fase que ainda não leu o próprio problema — e a escolha errada
apagaria, junto com o titular, a prova de que ele exerceu um direito.

**RLS: uma policy, own-row, de leitura. Nenhum caminho de escrita para o candidato** — e o COMMENT
carrega a razão, porque ela não é óbvia: se ele pudesse inserir, poderia também **não** inserir
(furando o cooldown) ou inserir já `atendido` sem que nada tivesse sido entregue, zerando o relógio
de um prazo legal sobre uma entrega que não houve. O registro é afirmação do servidor sobre um fato
do servidor.

As duas RPCs compartilham guard NULL-safe (`IS DISTINCT FROM`, nunca `NOT IN`), `search_path` vazio,
filtro de tipo, e **o predicado do BD-8 em prosa idêntica** — com o administrador vendo inclusive os
órfãos, porque o órfão é justamente o pedido que queima o relógio sem dono natural. `anon` é
revogado **nominalmente** nas duas.

O `::text` em `nome_completo` não é estilo: é o `42804` que derrubou `/admin/retencao` na P43 com o
smoke em 10/10 verdes.

### Task 3 — O smoke gate-GUC (`f33cb6a`)

14 asserções rotuladas `(a)`–`(n)`, **cinco negativas**, com esperado **fixo** de 14 no RESUMO `(z)`.

As que carregam o peso:

- **(i)** chama as duas funções **sem claim nenhuma** e exige `42501`. É a asserção que o idioma
  `NOT IN` reprovaria — com `v_role` NULL o `IF` não é tomado e o guard falha **aberto**.
- **(f)** pergunta ao **catálogo** (`has_function_privilege`), nunca ao texto do `REVOKE`: ler o
  arquivo provaria que a linha existe, não que o privilégio sumiu.
- **(k)/(l)** provam o escopo do BD-8 por impersonação real, incluindo o **órfão**, que o admin vê e
  o recrutador não.
- **(m)** assere **fila ≡ contador em dois papéis**, mais uma sanidade de que os dois escopos
  realmente diferem — sem ela a igualdade passaria trivialmente.
- **(n)** prova a ordenação composta, que é o que torna **verdadeira** a copy "todos os não atendidos
  aparecem".

**(k)(l)(m)(n) também executam o CORPO das RPCs.** É a lição que a P43 pagou: uma função cujo único
teste é a recusa está, para efeito de corpo, sem teste nenhum — o guard levanta na primeira linha e o
`RETURN QUERY` nunca roda.

## Verificação

| Critério | Resultado |
|---|---|
| Greps de `<acceptance_criteria>` da Task 1 | **7/7** |
| Greps de `<acceptance_criteria>` da Task 2 | **11/11** |
| Greps de `<acceptance_criteria>` da Task 3 | **6/6** |
| Incrementos do contador × esperado fixo | **14 = 14** |
| Asserções rotuladas presentes | `(a)`–`(n)`, **14/14** |
| Subtransações revertidas × handlers | **4 = 4** |
| `INSERT INTO` no smoke | **8, todos em `solicitacoes_dados`** |
| Cifrões balanceados | migration 2: 4 (2 corpos) · migration 1: **0** · smoke: 32 (16 blocos) |
| `npm run lint` (`tsc --noEmit`) | **97** — baseline congelada 97, zero regressão |
| `.husky/pre-commit` | rodou e passou nos **4 commits**. **Zero `--no-verify`** |
| Contato com PROD | **nenhum** — sem `db push`, `apply_migration` ou `migration repair` |

Nenhum arquivo TypeScript foi tocado por este plano, então a baseline `tsc` não podia se mover — e
não se moveu.

## Desvios do plano

### 1. [Regra 1 — bug] O critério de aceite da Task 1 reprovava a prosa que o próprio plano mandou escrever

- **Encontrado em:** Task 1, na primeira execução dos greps.
- **Problema:** a `<action>` manda escrever, explicitamente, que *"um `CHECK (dias_atraso < 15)` foi
  deliberadamente NÃO escrito"*. O `<acceptance_criteria>` do mesmo task exige
  `grep -cE 'CHECK[^)]*dias_atraso[[:space:]]*<[[:space:]]*15'` **= 0**. O grep não distingue uma
  constraint real da prosa que documenta sua ausência: seguir a ação à letra reprovava o gate.
- **Correção:** o COMMENT diz a mesma coisa sem reproduzir a sintaxe da constraint ("uma constraint
  CHECK impondo `dias_atraso` ABAIXO de 15 foi deliberadamente NÃO escrita"), e registra inline por
  que a sintaxe literal está ausente. O gate volta a medir o que afirma medir.
- **Commit:** `499fb1d`

### 2. [Regra 3 — bloqueio] O smoke não pode fabricar candidatos sem escrever em `auth.users`

- **Encontrado em:** Task 3, no projeto das fixtures.
- **Problema:** a `<action>` desenha `(k)` com *"dois recrutadores, duas vagas, dois candidatos com
  candidatura cada"* como fixtures criadas. Medido no DDL vivo:
  `candidatos.user_id` é `NOT NULL UNIQUE REFERENCES auth.users(id)` e `vagas.created_by` referencia
  `auth.users`. Criar essas fixtures exigiria **inserir em `auth.users` de PRODUÇÃO**.
- **Correção:** o smoke **resolve identidades vivas** (um administrador, um dono-de-vaga com
  candidatura, um candidato órfão) e escreve **exclusivamente** em `solicitacoes_dados`, que nasce
  vazia. O recrutador do cenário negativo é um **uuid sintético** com papel `rh`: a função só usa
  `v_uid` para casar com `vagas.created_by`, então um dono-de-nada é o negativo mais forte
  disponível e não custa identidade nenhuma. Se alguma identidade viva faltar, a FIXTURE **falha
  alto** nomeando exatamente o que falta — um skip silencioso aqui seria indistinguível de uma RPC
  que devolve tudo para todo mundo.
- **Commit:** `f33cb6a`

### 3. [Regra 1 — bug] O contador do gate-GUC seria perdido pelo rollback

- **Problema:** alterações de GUC são **transacionais**. As asserções comportamentais rodam dentro de
  subtransações revertidas; incrementar `smoke44.pass` lá dentro perderia o incremento e o RESUMO
  reprovaria um run **correto** — falso-vermelho da mesma família que a chamada única evita.
- **Correção:** cada asserção mede **dentro**, guarda em variáveis PL/pgSQL (que sobrevivem ao
  rollback), reverte, e só então julga e incrementa **fora**. É o idioma que a P43 já usava em `(g)`,
  aqui aplicado às quatro asserções com fixture. Documentado no cabeçalho.
- **Commit:** `f33cb6a`

### 4. [Regra 3 — higiene] Cifrões literais em comentário na migration 1

- **Problema:** a migration 1 escrevia o par de cifrões literalmente em três comentários — sendo que
  sua premissa declarada é **não ter corpo assim delimitado**, e ela existe para ser o teste barato
  do procedimento 42601. Medido: **zero** migrations já aplicadas do repositório escrevem esse par
  dentro de comentário.
- **Correção:** trocado por "delimitado por cifrões" (o idioma que a própria P43 usa), com nota
  inline. Não havia defeito funcional — o lexer descarta comentários — mas o projeto já pagou três
  vezes pela classe 42601 e duas por perda de conteúdo na retransmissão do `apply_migration`, e
  estrear a prática justamente neste arquivo não tem ganho que compense.
- **Commit:** `c85a3e8`

## Requirements — nenhum marcado Complete, deliberadamente

`EXPORT-01` e `EXPORT-05` continuam **em aberto**. Este plano produziu **arquivos**, não objetos
vivos: as migrations sequer foram aplicadas (isso é 44-04), e `EXPORT-05` só se torna observável
quando a fila do RH renderizar, em 44-08/44-09. O plano 44-01 já teve de **reverter** uma marcação
falsa de Complete nesta fase; reintroduzi-la aqui repetiria o erro com uma evidência ainda mais
fraca — arquivo em disco não é comportamento em produção.

## Contratos definidos aqui que outros planos consomem

**As sete colunas de `listar_pedidos_dados`**, na ordem, para o espelho cliente de 44-08/44-09:

```
id uuid · candidato_id uuid · candidato_nome text · situacao text · causa text
solicitado_em timestamptz · atendido_em timestamptz
```

⚠ **`candidato_nome` é NULÁVEL** e a UI resolve para "Não identificado" — o tipo da linha é escrito
à mão no cliente justamente porque o gerador declara toda coluna de `RETURNS TABLE` como não-nula.

⚠ **`causa`** só admite `falha_geracao` · `curriculo_ausente` · `permissao` (ou NULL). Divergência
entre este vocabulário e o do cliente produz **célula em branco** na fila — pior que um token cru,
porque lê como dado ausente em vez de vocabulário dessincronizado.

**Para 44-04**, na ordem: aplicar `20260804000001` → reparar ledger → aplicar `20260804000002` →
reparar ledger → medir M3 (`pg_policies` das duas tabelas) → rodar o smoke **numa única chamada**
`execute_sql`, esperando **14/14**.

## Threat Flags

Nenhuma superfície nova além do `<threat_model>` do plano. As sete mitigações declaradas foram
implementadas e cada uma tem asserção que a mede:

| Threat | Mitigação | Asserção |
|---|---|---|
| T-44-09 | predicado do BD-8 idêntico nas duas RPCs | (k), (l), (m) — impersonação real, inclui órfão |
| T-44-15 | `IS DISTINCT FROM` no guard | (i) — chamada sem claim exige 42501 |
| T-44-16 | `REVOKE` nomeando `anon` | (f) — `has_function_privilege` no catálogo |
| T-44-10 | policy RH-only em `config_sla_dados` | (b) — exatamente 1 policy, de SELECT |
| T-44-17 | zero policy de escrita p/ o candidato | (c) — negativa explícita |
| T-44-12 | `RETURNS TABLE` de 7 colunas nomeadas | revisão do DDL; sem e-mail/CPF/Storage |
| T-44-18 | filtro `tipo = 'acesso'` no servidor | grep (2 ocorrências) + (h) sobre o CHECK |

## Known Stubs

Nenhum. Zero `TODO`/`FIXME`/placeholder nos três arquivos criados. Zero `<verify>` não executado
**dentro do escopo deste plano**.

**O que continua em aberto por desenho, não por omissão:** as duas migrations **não estão aplicadas**
e o smoke **não foi executado** — ele é RED por construção, porque descreve objetos que ainda não
existem em PROD. Executá-lo exige os tools MCP do Supabase, que subagentes GSD não recebem
(anthropics/claude-code#13898), e o `<scope_boundary>` deste plano proíbe contato com PROD. Ambos são
trabalho nomeado do plano **44-04**.

## Self-Check: PASSED

- Arquivos criados: 3/3 **FOUND**
- Commits: `499fb1d`, `9a975b7`, `c85a3e8`, `f33cb6a` — 4/4 **FOUND**
- `tsc` na baseline (97), hook rodado em todos os commits, árvore limpa
- Zero contato com PROD
