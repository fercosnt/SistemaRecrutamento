---
phase: 43
plan: 04
subsystem: retencao-lgpd
status: complete
tags: [lgpd, retencao, config-sem-deploy, security-definer, auditoria-atomica, migration, zero-destrutivo]
requires:
  - docs/compliance/reten06-veredito-retain-until.md (43-02 — o veredito PRECEDE a estrutura)
  - public.etapa_processo (enum vivo, 8 valores)
  - public.usuarios_rh (FK de autoria; admin-only desde a SEG-02)
  - public.tocar_atualizado_em() (P37 — REUSADA, nunca redefinida)
  - public.log_auditoria(...) (P28 — DEFINER com owner BYPASSRLS)
provides:
  - public.config_retencao_etapa (tabela + RLS admin-only + trigger + seed 8/8) — NÃO APLICADA
  - public.listar_matriz_retencao() — NÃO APLICADA
  - public.salvar_janela_retencao(etapa_processo, integer) — NÃO APLICADA
  - supabase/tests/p43_matriz_retencao_smoke.sql (10 asserções) — NÃO EXECUTADO
affects:
  - 43-06/43-08 (a tela /admin/retencao consome as duas RPCs)
  - 43-07 (checkpoint: apply da migration + reparo do ledger + md5 + smoke)
  - 46 (a purga LÊ esta matriz — e não pode ser ligada com ela no seed genérico)
tech-stack:
  added: []
  patterns:
    - "config alterável sem deploy COM caminho de escrita de aplicação: RPC DEFINER auditada em vez de policy de UPDATE"
    - "guard NULL-SAFE por IS DISTINCT FROM em SECURITY DEFINER — recusa também o chamador sem claim"
    - "REVOKE nomeando anon explicitamente (pg_default_acl concede EXECUTE a anon em todo CREATE FUNCTION)"
    - "asserção negativa de contagem de linhas de titular como prova MEDIDA da invariante zero-destrutiva"
key-files:
  created:
    - supabase/migrations/20260801000002_p43_config_retencao.sql
    - supabase/tests/p43_matriz_retencao_smoke.sql
  modified: []
decisions:
  - "Chave da matriz = etapa_processo (8) e não status_candidatura (5): candidaturas.etapa_atual é NOT NULL, então nenhuma candidatura cai em buraco silencioso; historico_candidatura dá data-âncora por estado; 8 valores é a granularidade que o parecer jurídico da Phase 46 precisa. Tradeoff registrado no COMMENT: o enum mistura funil com desfecho."
  - "Escrita é RPC SECURITY DEFINER e NÃO policy de UPDATE — uma policy não dá trilha de auditoria atômica nem guard server-side sobre o teto, que são as duas coisas que o RETEN-02 pede JUNTO com a escrita."
  - "listar_matriz_retencao ganhou o MESMO guard NULL-safe (Rule 2): sem ele, um DEFINER sem guard leria a tabela por baixo da RLS admin-only, tornando a policy única decorativa."
  - "p_meses IS NULL entra explicitamente no ramo de recusa 22023 — NULL < 1 avalia NULL e o IF não é tomado, a MESMA classe de defeito do NOT IN NULL-cego."
  - "md5 do arquivo da migration PINADO: 8cb402b4474047a483a979571511ad80"
metrics:
  duration: ~10min
  completed: 2026-08-01
  tasks: 3
  commits: 3
  tsc_antes: 97
  tsc_depois: 97
---

# Phase 43 Plan 04: A matriz de retenção nasce como DADO Summary

A janela de retenção por estado da candidatura passou a existir como configuração em
banco — semeada nos oito estados no teto de 24 meses que o candidato já leu e aceitou,
legível só por administrador, e alterável por uma RPC que grava a mudança e sua linha
de auditoria na mesma transação — **sem que uma única linha de candidato seja lida,
escrita ou apagada**.

## O que foi entregue

**Task 1 (tracer) — a tabela, a RLS, o trigger herdado e o seed.**
`public.config_retencao_etapa` com PK `etapa_processo`, `CHECK (janela_meses BETWEEN 1
AND 24)`, `origem` restrita a `{seed, admin}`, FK opcional para `usuarios_rh`. RLS
ligada com **uma** policy, de `SELECT`, `TO authenticated`, comparando
`app_metadata.role` a `'administrador'` — e **zero** policy de escrita. Trigger
`trg_config_retencao_atualizado_em` reusa `public.tocar_atualizado_em()` da P37 sem
redefini-la. Seed dos oito valores do enum em 24 meses com
`ON CONFLICT (etapa) DO NOTHING`.

**Task 2 — as duas RPCs.** `listar_matriz_retencao()` (DEFINER, STABLE) resolve o nome
do último alterador no servidor por `LEFT JOIN`, devolvendo `NULL` quando ele não existe
mais — o caso "Não identificado" da UI-SPEC — para que a tela do admin nunca precise
tocar `usuarios_rh`. `salvar_janela_retencao(etapa, meses)` (DEFINER, VOLATILE) executa,
nesta ordem: guard de papel NULL-safe → resolução do ator a partir de `auth.uid()` →
teto imposto no servidor → leitura do estado anterior com `FOR UPDATE` → recusa de no-op
→ `UPDATE` → `PERFORM public.log_auditoria(...)`. `anon` revogado **nominalmente** nas
duas.

**Task 3 — o smoke que prova por execução.** Dez asserções no idioma gate-GUC, quatro
delas negativas, com toda escrita dentro de subtransação sempre revertida.

## A decisão que estruturou o arquivo inteiro

O precedente é `config_sla_revisao` (P42) — e ele chega **perto e não chega**. Aquele
arquivo declara em voz alta que *"alterar o limiar é operação de banco, não de
aplicação — e é justamente isso que o torna alterável SEM DEPLOY (um UPDATE resolve)"*.

Isso **não satisfaz o RETEN-02**. "Um DBA roda um `UPDATE`" e "um administrador clica em
salvar" são a mesma frase só para quem tem credencial de banco. Daí a única divergência
deliberada do molde: a matriz ganha um caminho de escrita de **aplicação**, que
`config_sla_revisao` não tem.

E esse caminho é RPC, não policy de `UPDATE`, porque uma policy não entrega nenhuma das
outras duas coisas que o requirement pede na mesma respiração — trilha de auditoria
atômica e guard server-side sobre o teto. Um trigger de auditoria chegaria perto, mas não
pode **recusar**: ele roda depois da decisão.

Na direção oposta, o que foi **deliberadamente não copiado**: a RLS de `config_sla_etapa`
(P37). Ela é public-read por design porque a P37 construiu aquela tabela para o painel do
candidato, e a própria `20260730000001:437-441` já registrou a armadilha in loco. As duas
tabelas têm a **mesma PK** (`etapa_processo`) e posturas de exposição **opostas** — a
semelhança é enganosa, e copiar a policy poria a política de retenção da empresa ao
alcance do papel anônimo.

## BD-1 dito dentro do banco, não em prosa de planning

Os `COMMENT ON TABLE` / `COMMENT ON COLUMN` carregam a decisão travada nas palavras que
o ROADMAP faz critério de sucesso:

> **24 meses é o TETO QUE O CANDIDATO JÁ LEU E ACEITOU na copy do cadastro — não é
> recomendação técnica, não é exigência estatutária, e não é um número afinado por
> estado.**

E, no mesmo `COMMENT`, a **dependência da Phase 46 registrada como dependência** e não
como lembrete:

> A Phase 46 **NÃO PODE LIGAR A PURGA** enquanto esta matriz estiver no seed genérico,
> sem que o operador confirme os prazos **por estado**. Uma coluna com `origem='seed'` em
> toda linha significa que **ninguém escolheu** esses números — significa apenas que
> ninguém os contestou ainda.

É por isso que `origem` existe como coluna e não como comentário: ela é o discriminador
que a Phase 46 tem de **consultar** antes de armar qualquer `DELETE`.

## Zero ação destrutiva — declarado E medido

A migration abre com o escopo negativo em uma linha: **não lê, não escreve e não apaga
nenhuma linha de candidato**. Nenhum `DELETE`, nenhum `DROP`, nenhum predicado de purga.

Mas "por desenho" só vale alguma coisa se for medido, e é isso que a asserção **(j)** do
smoke faz: a contagem de `public.candidaturas` e de `public.candidatos` tem de ser
**idêntica** antes e depois do smoke inteiro. Ela também é a asserção que um predicado de
purga acidentalmente ligado nesta fase reprovaria — precisamente o acidente contra o qual
a fase foi desenhada.

## Verificação executada

| Gate | Resultado |
|------|-----------|
| Task 1 `<verify>` (arquivo, sem `BEGIN;/COMMIT;`, `ON CONFLICT DO NOTHING`, RLS) | limpo |
| Policies de escrita na migration (`FOR INSERT/UPDATE/DELETE/ALL`) | **0** |
| Task 2 `<verify>` (`IS DISTINCT FROM`, `FROM PUBLIC, anon, authenticated`, `log_auditoria`) | limpo · `SET search_path = ''` × 3 |
| Dollar-quoting balanceado (2 × `AS $$` / 2 × `$$;`) | ok |
| Task 3 `<verify>` (`set_config`, `42501`, `23514`) | limpo |
| Blocos `DO $$` do smoke balanceados | 12 / 12 |
| Incrementos do contador × asserções rotuladas × esperado de (z) | **10 / 10 / 10** |
| `NOT IN` em predicado (lição INVENT-05) | **nenhum** — as 3 ocorrências são comentários que o condenam |
| `npm run -s lint` (`tsc`), nos 3 commits | **97** — baseline congelada intacta |
| Zero `--no-verify` | confirmado — os 3 commits passaram pelo hook |

## Gate do tracer

Sendo a Task 1 do tipo `tracer`, seu `<verify>` foi re-executado ponta a ponta **antes**
de qualquer task de expansão: arquivo presente, sem wrapper de transação, RLS ligada,
seed idempotente, zero policy de escrita. A fundação estava verde, então as Tasks 2 e 3
puderam ser empilhadas sobre ela.

## Deviations from Plan

### 1. [Rule 2 — funcionalidade crítica ausente] `listar_matriz_retencao` ganhou o mesmo guard NULL-safe

- **Encontrado em:** Task 2, ao escrever a função de leitura.
- **Problema:** a `<action>` do plano detalha a ordem do corpo (guard incluso) apenas
  para `salvar_janela_retencao`; para `listar_matriz_retencao` descreve a projeção e o
  `LEFT JOIN`. Mas ela é `SECURITY DEFINER` — **e DEFINER bypassa RLS**. Sem guard no
  corpo, a policy única de `SELECT` admin-only da Task 1 viraria decoração: qualquer
  chamador com `EXECUTE` leria a política de retenção da empresa **somada aos nomes dos
  administradores**, por baixo da RLS que existe justamente para impedir isso (T-43-18 e
  T-43-19 do próprio `<threat_model>` do plano).
- **Correção:** o mesmo guard `IS DISTINCT FROM 'administrador'` → `42501`, e a asserção
  (f) do smoke passou a exercitar **as duas** funções sem claim, não só a de escrita.
- **Coerência com o plano:** a `<action>` já exigia `COMMENT ON FUNCTION` "para as duas,
  nomeando o guard" — logo o plano pressupunha guard nas duas; o que faltava era a ordem
  do corpo.
- **Arquivo:** `supabase/migrations/20260801000002_…sql` · **Commit:** `8d0a3f1`

### 2. [Rule 1 — bug de NULL-safety] `p_meses IS NULL` entrou explicitamente no ramo de recusa

- **Encontrado em:** Task 2, passo 3 do corpo.
- **Problema:** `IF p_meses < 1 OR p_meses > 24` com `p_meses` NULL avalia **NULL**, o
  `IF` não é tomado, e a chamada segue para o `UPDATE` — onde falharia com `23514`
  (violação do `CHECK`) em vez do `22023` que o contrato da função promete. É **a mesma
  classe de defeito** que o plano manda evitar no guard de papel (`NOT IN` NULL-cego) e a
  mesma lição do INVENT-05 sobre `NOT IN` contra subquery que pode render NULL: uma
  comparação com NULL não é `false`, é NULL.
- **Correção:** `IF p_meses IS NULL OR p_meses < 1 OR p_meses > 24`, com a razão escrita
  no comentário adjacente. O `COMMENT ON FUNCTION` documenta `22023` para NULL.
- **Arquivo:** `supabase/migrations/20260801000002_…sql` · **Commit:** `8d0a3f1`

### 3. [Rule 3 — contrato não coberto pelo plano] `p_recurso_id := NULL::uuid`

O plano especifica `p_recurso_id := NULL`. Um `NULL` sem tipo em chamada por parâmetro
nomeado é ambíguo para o resolvedor de sobrecargas. Tipado explicitamente. Trivial, mas
registrado porque é diferença literal em relação ao texto do plano.

### 4. [Além da letra do plano, dentro da intenção] a asserção (g) mede mais que a contagem

O plano pede que (g) prove "exatamente uma linha nova em `logs_auditoria`". A asserção
implementada também verifica, dentro da mesma subtransação, que `origem` virou `'admin'`
e que `alterado_por` aponta para o administrador **resolvido no servidor** a partir de
`auth.uid()`. As duas são o que distingue "a RPC escreveu algo" de "a RPC escreveu o que
prometeu", e a segunda é a que a Phase 46 vai consultar.

## ⚠ NADA APLICADO EM PROD — e o que o 43-07 tem de fazer, nesta ordem

Este plano produziu **dois arquivos**. Subagentes GSD não recebem os tools MCP do Supabase
(anthropics/claude-code#13898) e `supabase db push` é proibido neste projeto. **A tabela
não existe em PROD, as funções não existem, o smoke não foi executado, e o smoke está
deliberadamente RED contra o banco atual.**

Pendente do checkpoint 43-07:

1. **`apply_migration` de `20260801000002_p43_config_retencao.sql`** — sem wrapper
   `BEGIN;/COMMIT;`.
2. **Reparo obrigatório do ledger** — `apply_migration` carimba uma `version` própria
   (o timestamp do instante do apply), não a do nome do arquivo:
   ```sql
   UPDATE supabase_migrations.schema_migrations
      SET version = '20260801000002'
    WHERE name LIKE '%p43_config_retencao%';
   ```
3. **Prova de fidelidade — obrigatória, não opcional.** `apply_migration` recebe o SQL
   como **string** na chamada da ferramenta e o agente precisa **retransmiti-lo**; duas
   das cinco migrations do M8 chegaram a PROD com comentários descartados por essa via.
   ```sql
   SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations
    WHERE version = '20260801000002';
   ```
   **Esperado: `8cb402b4474047a483a979571511ad80`** (md5 do arquivo commitado em
   `b01e11e`). Divergência ⇒ o que foi aplicado **não é este arquivo** — e aqui a perda de
   comentário **não é benigna**: os `COMMENT` são o único lugar onde BD-1 e a dependência
   da Phase 46 vivem dentro do banco.
4. **Rodar `supabase/tests/p43_matriz_retencao_smoke.sql` numa ÚNICA chamada
   `execute_sql`.** Gate verde = **10 PASS** no RESUMO (z). Menos que 10 é run parcial e
   **não** deve ser tratado como verde.

Os passos 1 e 4 não têm dependência de deploy de Edge Function nem interação com a
migration `20260801000001` (plano 43-01) além da ordem numérica.

## ⚠ Dependência que a Phase 46 herda, dita aqui em voz alta

> **A Phase 46 não pode ligar a purga enquanto esta matriz estiver no seed genérico.**

Os oito estados nascem em 24 meses porque 24 é o teto já consentido — não porque alguém
avaliou que `rejeitado` e `entrevista_presencial` merecem a mesma janela. `origem='seed'`
em toda linha significa **ninguém escolheu**, e a Phase 46 tem de exigir do operador a
confirmação por estado (com o parecer jurídico trabalhista que o CONTEXT já define como
pré-requisito **dela**, não desta fase). O registro vive no `COMMENT ON COLUMN
janela_meses`, dentro do banco, onde quem for escrever a purga vai tropeçar nele.

## Known Stubs

Nenhum. Os dois artefatos SQL são deliberadamente **não-aplicados** — não são stubs, são
entrada do checkpoint 43-07, e este SUMMARY declara isso em seção própria. O smoke está
deliberadamente RED contra o banco atual: ele é a **especificação** da migration, não um
relatório dela, e se a implementação divergir corrige-se a implementação.

## Threat Flags

Nenhuma superfície nova fora do `<threat_model>` do plano. As sete mitigações previstas
foram implementadas:

| Threat | Como ficou |
|--------|-----------|
| T-43-15 (EoP na RPC) | guard `IS DISTINCT FROM` NULL-safe **nas duas** funções, ator resolvido de `auth.uid()`, `REVOKE … FROM PUBLIC, anon, authenticated` antes do `GRANT`; asserções (e), (f) e (h) |
| T-43-16 (adulteração do teto) | duas camadas — `CHECK` na tabela (asserção (d), por `UPDATE` real) e validação na RPC (asserção (e)); a tela é cosmética |
| T-43-17 (alteração sem trilha) | `PERFORM log_auditoria` no mesmo corpo; asserção (g) mede 1 linha nova dentro da subtransação |
| T-43-18 (política exposta a `anon`) | policy única de SELECT admin-only + a RLS de `config_sla_etapa` explicitamente rejeitada no `COMMENT`; asserções (a) e (b) |
| T-43-19 (`usuarios_rh` na tela) | `listar_matriz_retencao` devolve só o **nome**, por allowlist de 5 colunas |
| T-43-20 (seed sobrescrevendo operador) | `ON CONFLICT (etapa) DO NOTHING`, jamais upsert, com a razão no comentário |
| T-43-SC (pacotes) | zero pacote npm, zero extensão Postgres nova |

## Commits

| # | Hash | Tipo | Conteúdo |
|---|------|------|----------|
| 1 | `0681ca2` | feat | Task 1 (tracer) — tabela, RLS admin-only, trigger herdado, seed 8/8 no teto consentido |
| 2 | `8d0a3f1` | feat | Task 2 — as duas RPCs, guard NULL-safe, auditoria na mesma tx, `anon` revogado nominalmente |
| 3 | `b01e11e` | test | Task 3 — smoke gate-GUC com 10 asserções, quatro negativas |

## Self-Check: PASSED

Os dois arquivos criados existem em disco; os três hashes de commit existem em `git log`.
Verificado após a escrita deste arquivo.
