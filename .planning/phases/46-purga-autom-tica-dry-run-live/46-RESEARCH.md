# Phase 46: Purga Automática (dry-run → live) - Research

**Researched:** 2026-08-22
**Domain:** Automação destrutiva não-supervisionada em Postgres/Supabase — `pg_cron` + `pg_net` + Edge Function, sobre um motor de exclusão já provado em produção
**Confidence:** HIGH para o substrato in-repo (lido nesta sessão) · MEDIUM para as mecânicas de `pg_cron`/`pg_net` (docs oficiais) · LOW onde marcado `[ASSUMED]`

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Área 1 — Política do predicado: as exceções que a Phase 43 deixou abertas**

As quatro decisões abaixo se escrevem **dentro de `public.candidaturas_alem_da_janela()`**, em um
só lugar, valendo simultaneamente para a prévia (`previa_retencao()`) e para o `DELETE` real. O
`md5(prosrc)` pinado pelo smoke da 43 **vai mudar** — isso é esperado e o pin deve ser
re-carimbado com conferência cruzada, não contornado.

- **D-46-01: Candidaturas em rascunho (`is_rascunho = true`) NÃO ganham regra própria.** Seguem a
  matriz de `config_retencao_etapa` pelo estado em que estão (`inscricao`, 24 meses). Criar uma
  janela curta própria sem parecer jurídico seria tomar decisão de política por acidente de
  implementação — exatamente o que a Phase 43 evitou ao deixar esta exceção explicitamente aberta.
  — **Reversibility:** `reversible` — é um predicado no corpo de uma função; muda numa edição.

- **D-46-02: BD-1 mantido — `autorizacao_retencao_curriculo` NÃO encurta a janela.** Continua sendo
  **base legal citada** na superfície do candidato (RETEN-03, `/candidato/privacidade`), nunca
  encurtador. A regra "não autorizou ⇒ retenção = duração do processo" permanece decisão de
  política pendente de parecer, e esta fase a mantém pendente em vez de resolvê-la por omissão.
  — **Reversibility:** `reversible` — predicado; mas o efeito de tê-la aplicado é `one-way`.

- **D-46-03: Candidatura de vaga ainda ABERTA é protegida.** Exceção por `NOT EXISTS` contra
  `vagas`, no mesmo idioma NULL-safe herdado do INVENT-05 (`20260730000005`) — **jamais**
  `id NOT IN (…)`, que contra um conjunto com NULL devolve DESCONHECIDO e deixa o registro
  escapar. Fail-closed: processo vivo não se apaga, mesmo que a data-âncora já tenha estourado.
  — **Reversibility:** `reversible`.

- **D-46-04: `retencao_hold` nasce nesta fase, vazia por padrão.** Tabela consultada por
  `NOT EXISTS` dentro do predicado, para obrigação legal concorrente (trabalhista, fiscal),
  litígio em curso, ou qualquer motivo que exija segurar uma linha específica. Sem ela, o único
  jeito de proteger uma candidatura é **desligar a purga inteira** — um controle grosso demais
  para um caso que é por definição pontual. Estrutura aditiva e barata agora; ausente, custa uma
  migration sob pressão no dia em que for necessária.
  — **Reversibility:** `reversible` — tabela aditiva vazia.

**Área 2 — O cerco: modo, cap, kill switch**

- **D-46-05: O modo vive em TABELA DE CONFIG no banco**, não em secret nem env var. `config_purga`
  com **linha única** (guard de singleton), escrita **exclusivamente por RPC auditada**,
  espelhando o par `config_retencao_etapa` / `salvar_janela_retencao(...)` da Phase 43.
  **Razão dura:** PURGA-04 exige que o flip `dry_run → live` seja **checkpoint separado e
  evidenciado, nunca efeito colateral de um deploy**. Um secret de projeto muda sem deixar
  trilha e sem recusar nada; uma linha alterada por RPC deixa trilha de auditoria atômica e pode
  **recusar**. O kill switch "sem deploy" (PURGA-05) cai no mesmo lugar pela mesma razão.
  ⚠ O espelho invocado pelo ROADMAP (`NOTIFICACOES_MODO=teste→producao`) é o espelho da
  **disciplina**, não do mecanismo. — **Reversibility:** `costly`.

- **D-46-06: `modo ∈ {off, dry_run, live}` — um só campo, três estados.** O kill switch é o estado
  `off`, não um booleano separado. Um só lugar a ler, e o estado contraditório (`live` +
  `ativo = false`) fica **inexprimível** em vez de meramente improvável.
  — **Reversibility:** `costly` — o tipo entra em CHECK constraint.

- **D-46-07: Cap de blast-radius = 50 titulares por execução**, gravado na mesma linha de
  `config_purga` e alterável sem deploy. Base atual: `auth.users` = 29 linhas. 50 é folgado para
  qualquer operação legítima e ainda assim para um runaway antes de ele virar incidente.
  — **Reversibility:** `reversible` — valor de configuração.

- **D-46-08: Conjunto elegível que EXCEDE o cap ABORTA a execução inteira — zero linhas tocadas.**
  Grava `cap_excedido` no ledger, emite sinal, e sai. **Não** processa "até o cap".
  **Razão dura:** com PITR desligado (D-45-10) e o backup do Supabase excluindo Storage
  inteiramente, um CV apagado é irrecuperável por qualquer meio. Um predicado quebrado que
  processa até o cap apaga 50 pessoas reais por dia, em silêncio, e cada dia de atraso na
  detecção é irreversível. Abortar torna a purga **recusável por desenho**: ela só roda quando o
  conjunto elegível cabe dentro do cerco.
  — **Reversibility:** `reversible` no código; o efeito de NÃO tê-la é `one-way`.

- **D-46-09: O kill switch é provado DESLIGANDO DE VERDADE**, nunca por leitura de config — SC#3
  é explícito. A prova é uma execução real que não apaga nada com `modo = off`, com asserção
  negativa registrada.

**Área 3 — O cron e a execução**

- **D-46-10: Cron diário, `0 3 * * *`** (03:00 UTC = 00:00 BRT, off-peak). Retenção é medida em
  **meses**; diário é folgado e dá granularidade de observação diária durante o período de
  dry-run. O `*/15` do `notif-retry-sweep` existe porque retry de notificação tem urgência —
  purga de retenção não tem. Agendamento **idempotente**: `cron.unschedule` guardado por
  `WHERE EXISTS` **antes** do `cron.schedule`, verbatim do padrão do `20260727000001`, para que
  re-aplicar a migration não duplique o job.
  — **Reversibility:** `reversible`.

- **D-46-11: O alvo é o TITULAR, quando TODAS as suas candidaturas estão além da janela.** O
  predicado da 43 é por **candidatura**; o wrapper da purga agrupa por `candidato_id` e mantém
  apenas os titulares em que **nenhuma** candidatura está dentro da janela. É isso que evita
  apagar meio candidato e é isso que torna o reuso do motor **provado** da Phase 45 correto —
  `anonimizar_candidato(p_candidato_id)` opera por titular.
  — **Reversibility:** `one-way` no efeito.

- **D-46-12: O alvo é o PACOTE COMPLETO — Postgres + CV no Storage + Auth — reusando o motor da
  Phase 45.** Uma "purga" que deixa o CV no Storage não é purga; e escrever um segundo caminho
  destrutivo ao lado de um motor que **já foi exercitado em produção** é a pior troca disponível.
  A ordem imposta pela plataforma (Storage → Postgres → Auth) e o tratamento do órfão já estão
  provados. — **Reversibility:** `one-way` — é o ponto da fase.

- **D-46-13: Cron → `net.http_post` → EF `purgar-retencao` (service_role).** Storage e Auth não
  são alcançáveis do Postgres; a RPC pura deixaria CV e usuário para trás. O hop espelha o
  `varrer_retry_notificacoes()` do `20260727000001` — Vault para `project_url` e
  `edge_invoke_key`, referência totalmente qualificada a `vault.decrypted_secrets` (imune a
  sequestro de nome), falha silenciosa que não derruba o cron.
  ⚠ O `at-most-once` do `pg_net`, que na P41 era um **problema** (a varredura não sabe se
  chegou), aqui é **fail-safe**: post perdido ⇒ nada apagado ⇒ a execução do dia seguinte recolhe.
  A assimetria é deliberada e deve estar documentada no corpo da migration.
  — **Reversibility:** `costly`.

- **D-46-14: Critério de flip `dry_run → live` = ≥ 14 dias corridos E ≥ 14 execuções com ledger
  não-vazio E ≥ 1 execução sobre conjunto elegível NÃO-VAZIO.**
  ⚠⚠ **Esta é a decisão que impede a fase de falhar em silêncio.** `previa_retencao()` devolve
  zero por **aritmética**, não por defeito: a matriz está em 24 meses e o sistema é mais novo que
  a janela. Catorze dias de zeros não provam **nada** sobre o caminho do delete — seriam
  exatamente o "dry-run que é decoração" que o SC#1 nomeia, e a mesma classe de falha do
  P39/CR-02 (uma guarda que era dead code). O conjunto não-vazio é montado como **fixture
  deliberada**, do mesmo modo que a FASE 0 da Phase 45 montou o blob órfão de propósito — foi só
  por isso que o caso difícil ficou testável.
  — **Reversibility:** `costly` — é o portão da fase.

**Área 4 — Ledger e RETEN-05**

- **D-46-15: Ledger em duas tabelas novas.** `purga_execucoes` (cabeçalho: modo vigente, cap
  vigente, elegíveis, processados, veredito, início/fim) + `purga_execucao_itens` (uma linha por
  alvo: `candidato_id`, etapa, janela aplicada, política citada). Sem a tabela de itens, "**o
  que** foi apagado" (PURGA-06) não é respondível — só "quantos".
  ⚠ **O item NUNCA grava nome, e-mail, CPF ou qualquer PII.** O ledger não pode reintroduzir o
  dado que a purga acabou de remover; ele grava identificadores que **deixam de existir** mais a
  política aplicada. Esta é uma asserção negativa obrigatória do smoke.
  **Não** reusar `data_deletion_log`: a Phase 47 o adotou (CONSOL-02, `20260809000002`) para
  outro fim, e colapsar dois registros com semânticas diferentes destrói ambos.
  — **Reversibility:** `costly` — tabelas novas com escritor vivo.

- **D-46-16: Retenção do próprio ledger é INDEFINIDA.** É registro de cumprimento de obrigação
  legal e, pelo desenho de D-46-15, não contém PII — as duas condições que tornam a retenção
  indefinida defensável. Registrar essa justificativa em `COMMENT ON TABLE`, porque é exatamente
  o tipo de "retenção indefinida sem razão escrita" que o RETEN-05 existe para eliminar.

- **D-46-17: RETEN-05 — `notificacoes_enviadas` expira em 24 meses, apagando a linha inteira**,
  alinhado à matriz de retenção.
  ⚠ **O que a FK já resolve e o que ela NÃO resolve:** `notificacoes_enviadas` já tem
  `ON DELETE CASCADE` para `candidaturas` e `candidatos` (`20260721000001:78-79`), então a purga
  de um titular **já leva as notificações junto**. O que o RETEN-05 pede **a mais** é a regra
  **independente**: notificações de candidaturas que **não** foram purgadas também expiram.
  Sem essa segunda regra o requirement fica meio-cumprido e o comentário em produção — "Retention
  INDEFINITE in v1 (LGPD-OPS purge deferred to M8)" — continua verdadeiro.
  O `COMMENT ON TABLE` do `20260721000001:144` **tem de ser reescrito** na mesma migration; deixar
  o comentário antigo vivo é precisamente a promessa-sem-código que o CONSOL-04 audita.
  — **Reversibility:** `one-way` no efeito.

### Claude's Discretion

- Nomes exatos de funções, tabelas e colunas, respeitando as convenções do projeto
  (snake_case pt-BR para domínio).
- Decomposição em planos e ordenação interna dos checkpoints.
- Forma concreta do sinal quando o cap é excedido (linha de ledger + qual canal).
- Estrutura interna do payload do `net.http_post` e do contrato da EF.
- Layout dos smokes e das asserções negativas, respeitado o mínimo do portão destrutivo.

### Deferred Ideas (OUT OF SCOPE)

- **Janela de retenção própria para rascunhos** — depende do parecer jurídico trabalhista que o
  CONTEXT da Phase 43 já registrou como pré-requisito. Quando vier, escreve-se em D-46-01, num só
  lugar, e vale para prévia e delete na mesma edição.
- **`autorizacao_retencao_curriculo` como encurtador de janela** — mesma dependência de parecer
  (D-46-02 / BD-1).
- **Leitura do ledger de purga pelo RH** (tela) — derivada, não a entrega desta fase. Backlog.
- **Alerta ativo (e-mail/webhook) quando o cap é excedido** — nesta fase o sinal é a linha de
  ledger; o canal de alerta ativo é melhoria posterior.
- **Baixar a matriz de retenção de 24 meses** para valores realistas por etapa — decisão de
  política do operador, independente desta fase, e a razão pela qual o predicado devolve zero hoje.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PURGA-01 | Cron de purga espelhando o padrão já provado do `notif-retry-sweep` | §Pattern 1 (cron idempotente), §Pitfall 1 (o smoke da P42 fixa 3 jobs e vai reprovar), §Pitfall 5 (job que para de existir em silêncio) |
| PURGA-02 | Modo dry-run executa a **mesma** query do delete real, envolvida em rollback | §Q1 — As três camadas do dry-run, §Pattern 2 (o terminador `P45DR`), §Blocker B-01 |
| PURGA-03 | Primeira ativação em PROD é dry-run, por período documentado | §Validation Architecture (a fixture que torna 14 dias significativos), §Pitfall 4 |
| PURGA-04 | Flip dry-run→live é checkpoint separado e evidenciado | §Pattern 3 (`config_purga` + RPC auditada), §Q4 (forma da evidência) |
| PURGA-05 | Cap de blast-radius por execução + kill switch | §Q3 (onde a contagem tem de ser tirada), §Q4 (prova do kill switch), §Pattern 4 |
| PURGA-06 | Ledger de execuções — o que foi apagado, quando, sob qual política | §Pattern 5 (as duas tabelas + `ancora_origem`), §Pitfall 9 (ledger sem PII) |
| PURGA-07 | Predicado não engole linhas por NULL — `COALESCE` explícito e allowlist de estados terminais | §Q5 — leitura completa do predicado vivo, §Open Question OQ-2 (conflito com D-46-01) |
| RETEN-05 | Regra de retenção de `notificacoes_enviadas` definida e aplicada | §Q6 — a CASCADE está DORMENTE neste sistema, §Pattern 6 |
</phase_requirements>

## Summary

Esta fase não constrói um motor destrutivo — ele já existe, foi exercitado em produção em
2026-08-22, e tem `45-VERIFICATION.md` com veredito `passed`. Ela constrói **o cerco em volta
dele** e **o gatilho automático**, e o trabalho técnico real está em três lugares: (1) escrever as
quatro exceções de política dentro de uma função que já é a única definição do predicado, sem criar
uma segunda cópia; (2) armar um `pg_cron` que dispara um `net.http_post` para uma Edge Function
nova, com modo/cap/kill-switch vivendo em tabela de config auditada; e (3) provar, por execução, que
os três estados do modo produzem os três desfechos corretos sobre um conjunto elegível
**não-vazio** — porque hoje o conjunto é vazio por aritmética e toda asserção passaria por vacuidade.

**Há um bloqueador arquitetural que o CONTEXT não registra e que muda a decomposição da fase.**
O motor da Phase 45 recusa, com `42501`, qualquer chamador sem sessão: o `COMMENT ON FUNCTION` vivo
diz literalmente *"Um cliente service_role SEM Authorization de usuario tem auth.uid() NULO e recebe
42501 — passar as claims e obrigacao declarada da Edge Function"*
[VERIFIED: supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:1866-1869]. Uma purga
disparada por cron **não tem titular, não tem sessão e não tem claim de papel** — e além disso o
guard de intenção exige um pedido em `public.solicitacoes_dados` que a purga, por definição, não
tem. Reusar o motor provado (D-46-12) exige, portanto, **editar o guard do motor provado** — o que
muda o `md5(prosrc)` pinado pelo `p45_motor_exclusao_smoke.sql` e é uma alteração de **segurança**,
não de conveniência. Isso é checkpoint do operador, e está detalhado em §Blocker B-01.

A boa notícia é que quase toda a mecânica difícil já tem gêmeo provado neste repositório: o
terminador `RAISE ... USING ERRCODE = 'P45DR'` ao fim do mesmo corpo é exatamente a resposta ao
"dry-run pela mesma query envolvida em rollback"; o `cron.unschedule` guardado por `WHERE EXISTS` é
o agendamento idempotente; o par `config_retencao_etapa` + `salvar_janela_retencao` é o molde da
config auditada; e — a peça que ninguém escreveu ainda mas que a plataforma dá de graça —
**`net.http_post` só dispara no commit**, o que torna "abortar ⇒ zero linhas tocadas" uma
propriedade estrutural em vez de uma esperança.

**Primary recommendation:** planeje a fase em torno de um único ponto de decisão do operador — como
o cron autoriza o motor destrutivo (§Blocker B-01) — e trate a **fixture de conjunto elegível
não-vazio** como o primeiro plano da fase, não como o último: sem ela, todo o resto é medido por
vacuidade e o dry-run de 14 dias prova zero.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Predicado de retenção (quem está além da janela) | Database / Postgres | — | Já é a única definição (`candidaturas_alem_da_janela`), pinada por md5. Sair do banco criaria a segunda cópia que o SC#1 proíbe |
| Agrupamento por titular (D-46-11) | Database / Postgres | — | `previa_retencao_total()` já implementa exatamente essa forma (`20260801000004:358-376`); a purga tem de consumir a MESMA, não uma paralela |
| Modo / cap / kill switch | Database / Postgres (tabela + RPC auditada) | — | D-46-05: um secret muda sem trilha e não recusa; uma linha por RPC deixa trilha atômica e pode recusar |
| Decisão de abortar por cap | Database / Postgres | — | A contagem e o dispatch têm de estar na MESMA transação, senão a checagem é corrível (§Q3) |
| Agendamento | Database / `pg_cron` | — | Roda como `postgres` no próprio banco; nenhum orquestrador externo existe neste projeto |
| Transporte cron → executor | Database / `pg_net` | — | Storage e Auth não são alcançáveis do Postgres (D-46-13) |
| Mutação de Storage | Edge Function (service_role) | — | `DELETE FROM storage.objects` por SQL órfã o blob PARA SEMPRE; só a Storage Admin API remove de verdade [VERIFIED: supabase/functions/executar-direito-titular/index.ts:842-844] |
| Mutação de Postgres (tombstone) | Database / RPC `SECURITY DEFINER` | Edge Function (chamadora) | A EF não tem transação; o RPC tem, e a atomicidade É o requisito [VERIFIED: 20260805000006:266-272] |
| Mutação de Auth | Edge Function (`auth.admin.deleteUser`) | — | Só a Admin API; e depois dela não existe sessão nem tela |
| Ledger (cabeçalho + itens) | Database / Postgres | Edge Function (fecha os itens) | O cabeçalho nasce na mesma transação da seleção; os itens só fecham quando a EF sabe o desfecho dos 3 sistemas |
| Retenção de `notificacoes_enviadas` (RETEN-05) | Database / Postgres (`DELETE` puro) | — | Não toca Storage nem Auth; não precisa de EF nem de hop HTTP |
| UI | **Nenhuma** | — | ROADMAP explícito: "não é frontend; trabalho de cron/ops/DB" |

## Standard Stack

Esta fase **não instala nenhum pacote novo**. Todo o substrato já está vivo em produção.

### Core
| Componente | Versão / estado | Purpose | Why Standard |
|---|---|---|---|
| `pg_cron` | instalado; 3 jobs vivos [VERIFIED: docs/compliance/cron-inventory.md:22-28] | Agendamento in-database | Único agendador do projeto; padrão já provado em 3 jobs |
| `pg_net` | instalado; usado por `varrer_retry_notificacoes` [VERIFIED: 20260727000001:177] | Hop assíncrono Postgres → Edge Function | Único caminho do banco para fora; Vault + `net.http_post` é idioma estabelecido |
| Supabase Vault | `project_url`, `edge_invoke_key` já provisionados [VERIFIED: 20260727000001:155-158] | Segredos do hop | **Nenhum segredo novo é necessário** (CONTEXT §Integration Points) |
| `public.candidaturas_alem_da_janela()` | `STABLE SECURITY DEFINER SET search_path=''` [VERIFIED: 20260801000004:174-201] | A única definição do predicado | md5 pinado; a Phase 46 é a primeira consumidora real |
| `public.anonimizar_candidato(uuid, boolean)` | `VOLATILE SECURITY DEFINER`, `GRANT` só a `service_role` [VERIFIED: 20260805000006:273-282, :834-836] | O motor destrutivo | Exercitado em PROD 2026-08-22, 5/5 |
| `public.plano_exclusao_titular(uuid) RETURNS jsonb` | `STABLE SECURITY DEFINER` [VERIFIED: 20260805000005:114-119] | O plano/dry-run por titular | A única forma honesta de dry-run de Storage/Auth |
| Deno (Edge Functions) | runtime do Supabase | Executor Storage → Postgres → Auth | Já é onde vive `executar-direito-titular` |

### Supporting
| Componente | Estado | Purpose | When to Use |
|---|---|---|---|
| `public.config_retencao_etapa` + `salvar_janela_retencao()` | vivo [VERIFIED: 20260801000002:133-139, :322-438] | Molde de config auditada por RPC | Copiar a FORMA para `config_purga` |
| `public.log_auditoria(...)` | vivo, `SECURITY DEFINER` com owner `BYPASSRLS` [VERIFIED: 20260801000002:424-436] | Trilha atômica da mudança de config | Toda escrita em `config_purga` |
| `cron.job_run_details` | tabela do `pg_cron` | Observabilidade do agendador | Diagnóstico, **nunca** como ledger (§Pitfall 5) |
| `net._http_response` | UNLOGGED, TTL ~6 h [CITED: supabase.com/docs/guides/database/extensions/pg_net] | Prova de que o post subiu (ou não) | Asserções negativas — **dentro da janela de 6 h** |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|---|---|---|
| `pg_cron` + `pg_net` + EF | Supabase Scheduled Edge Functions | Não usado neste projeto; sairia do padrão provado do `notif-retry-sweep` que o PURGA-01 nomeia literalmente |
| `config_purga` (tabela) | Secret do projeto / env var da EF | **Recusado por D-46-05** — muda sem trilha e não recusa nada |
| `RAISE ... USING ERRCODE` como terminador de dry-run | `SET TRANSACTION READ ONLY` | Recusado — aborta no PRIMEIRO write e não prova nada sobre os passos seguintes (§Q1) |
| `RAISE ... USING ERRCODE` | `SAVEPOINT` explícito | **Impossível** — plpgsql não pode emitir `SAVEPOINT`/`ROLLBACK TO`; o `BEGIN…EXCEPTION` É o savepoint [CITED: postgresql.org/docs/current/plpgsql-control-structures.html] |
| Um `http_post` por titular | Um `http_post` para a execução inteira | Recusado — o EF tem teto de 150 s (free) / 400 s (paid) e 2 s de CPU por request; 50 titulares × (Storage+RPC+Auth) estoura (§Pitfall 7) |

**Installation:** nenhuma. `npm install` não é executado nesta fase.

## Package Legitimacy Audit

**Esta fase não instala nenhum pacote externo em nenhum ecossistema.** Todo o trabalho é SQL
(migrations), TypeScript de Edge Function usando apenas `@supabase/supabase-js` já presente em
`supabase/functions/_shared/`, e configuração de `pg_cron`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| — | — | — | — | — | — | Nenhum pacote novo |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## ⛔ Blocker B-01 — A purga não consegue chamar o motor provado

> **Este é o achado mais importante da pesquisa. Ele não está no CONTEXT, e muda a decomposição
> da fase.** É checkpoint do operador, não discricionariedade do planejador.

### O que foi medido

`public.anonimizar_candidato(uuid, boolean)` tem um guard de **três metades** [VERIFIED:
supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:340-449]:

**(a) sessão** — verbatim das linhas 346-349:

```sql
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: chamador sem sessao nao anonimiza ninguem'
      USING ERRCODE = '42501';
  END IF;
```

onde `v_uid uuid := auth.uid();` (linha 312).

**(b) papel, ramo destrutivo** — verbatim das linhas 397-403:

```sql
  ELSE
    IF v_role IS DISTINCT FROM 'administrador'
       AND v_dono IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN: a anonimizacao REAL so pode ser executada por administrador ou pelo proprio titular daquele candidato. …'
        USING ERRCODE = '42501';
    END IF;
  END IF;
```

onde `v_role text := (select auth.jwt() #>> '{app_metadata,role}');` (linha 313).

**(c) intenção** — verbatim das linhas 436-448:

```sql
  IF NOT v_dry_run THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.solicitacoes_dados s
       WHERE s.candidato_id = p_candidato_id
         AND s.tipo         = 'exclusao'
         AND s.situacao     = 'executando'
         AND s.executar_em <= now()
         AND s.storage_concluido_em IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN: anonimizar_candidato so executa DENTRO do motor. …'
        USING ERRCODE = '42501';
    END IF;
  END IF;
```

E o `COMMENT ON FUNCTION` vivo declara a consequência em uma frase [VERIFIED:
20260805000006:1866-1869], verbatim:

> `'⚠ OBRIGACAO DO CHAMADOR: o guard le a CLAIM (auth.uid e app_metadata.role), nao o papel do '`
> `'banco. Um cliente service_role SEM Authorization de usuario tem auth.uid() NULO e recebe 42501 '`
> `'— passar as claims e obrigacao declarada da Edge Function do 45-10, e a assercao C2 do smoke a '`
> `'exige das cinco funcoes da fase. '`

E, na linha 1871, que aceitar o contrário é uma saída **já recusada** pelo operador:

> `'NAO foi tocada, e aceitar auth.uid() IS NULL sob service_role continua sendo a saida RECUSADA '`
> `'(DI-45-07-01 e decisao do operador de 2026-08-05). '`

Confirmação do lado do chamador: a EF `executar-direito-titular` chama a RPC com o **JWT do
titular**, não com o client de serviço — `await supabaseTitular.rpc("anonimizar_candidato", { …
p_dry_run: false })` [VERIFIED: supabase/functions/executar-direito-titular/index.ts:976-978], e o
docblock explica que acrescentar o `Authorization` ao client de serviço quebraria `deleteUser` e as
demais chamadas [VERIFIED: index.ts:414-424].

### Por que isso bloqueia

Um sweep disparado por `pg_cron` roda como `postgres` no próprio banco: `request.jwt.claims` não
está setado, logo `auth.uid()` → NULL e `auth.jwt()` → NULL. Uma EF chamada por `net.http_post`
com Bearer do Vault também não carrega JWT de usuário. E não existe pedido em
`solicitacoes_dados` — a purga é por **política**, não por pedido do titular. **As três metades
recusam.**

### As três saídas, e a recomendação

| Saída | O que é | Custo / risco |
|---|---|---|
| **A — credencial de operador permanente** | A EF autentica como um usuário real com `app_metadata.role='administrador'` e cria uma linha em `solicitacoes_dados` por titular | ⛔ Credencial standing capaz de destruir a PII de qualquer pessoa — blast-radius pior que o próprio cron. E poluiria a fila do RH com pedidos de exclusão que ninguém fez, misturando dois direitos legais na mesma tabela — exatamente o que o `COMMENT` de `tipo` proíbe [VERIFIED: 20260804000002:133-139] |
| **B — quarto caminho autorizado no guard** ✅ | As metades (a)/(b)/(c) ganham um ramo `OR` que aceita o chamador quando existe linha viva em `purga_execucao_itens` para aquele `candidato_id`, sob execução em `situacao='executando'` e `config_purga.modo='live'` | `md5(prosrc)` de `anonimizar_candidato` muda ⇒ o pin `8c86e0f040219e7eade47eb587dbf5de` do `p45_motor_exclusao_smoke.sql` [VERIFIED: supabase/tests/p45_motor_exclusao_smoke.sql:1591] tem de ser re-carimbado com conferência cruzada. A segurança do guard passa a ser a segurança de `purga_execucao_itens` |
| **C — segundo motor destrutivo, só para a purga** | Uma RPC nova que faz o tombstone sem passar pelo motor da 45 | ⛔ **Recusada por D-46-12** — "escrever um segundo caminho destrutivo ao lado de um motor que já foi exercitado em produção é a pior troca disponível" |

**Recomendação: Saída B**, com quatro obrigações que a tornam defensável:

1. O ramo novo é escrito no mesmo idioma: `IS DISTINCT FROM` em comparações de papel, `NOT EXISTS`
   (nunca `NOT IN`) na verificação de estado, e falha FECHADA quando qualquer lado for NULL.
2. Ele exige o **estado que só o motor da purga produz** — a mesma tese da metade (c) atual:
   `purga_execucoes.situacao='executando'` **e** `modo_vigente='live'` **e** item ainda não
   concluído. Um `modo` que não seja `live` não autoriza nada.
3. A migration carrega um bloco de auto-verificação que **aborta o apply** se `authenticated`
   puder escrever em `purga_execucoes`/`purga_execucao_itens` — espelho verbatim de
   [VERIFIED: 20260805000006:1022-1027], onde a mesma pergunta é feita ao catálogo sobre
   `solicitacoes_dados`. O pressuposto vira asserção, não confiança.
4. O re-pin do `md5` é registrado com os dois lados medidos (vivo × arquivo), na disciplina que o
   cabeçalho do smoke já define [VERIFIED: supabase/tests/p45_motor_exclusao_smoke.sql:217-263].

⚠ **Consequência para a decomposição:** a fase ganha um plano que **edita uma função destrutiva
provada em produção**. Ele é candidato natural a code review bloqueante próprio, e é onde o
`/gsd-secure-phase` tem mais a dizer.

---

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────────────────────────────────┐
                         │  OPERADOR (checkpoint, nunca deploy)     │
                         │  RPC auditada: salvar_config_purga(...)  │
                         └────────────────┬─────────────────────────┘
                                          │ log_auditoria (mesma transação)
                                          ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ POSTGRES                                                                 │
   │                                                                          │
   │  cron.job 'purga-retencao-sweep'  0 3 * * *                              │
   │        │  (corpo: SELECT public.varrer_purga_retencao();)                │
   │        ▼                                                                 │
   │  varrer_purga_retencao()  ── VOLATILE SECURITY DEFINER, search_path=''   │
   │        │                                                                 │
   │        ├─(1)─► LER config_purga (linha única)  ──► modo, cap             │
   │        │            modo = 'off' ──────────────────────┐                 │
   │        │                                               │                 │
   │        ├─(2)─► LER Vault (project_url, edge_invoke_key)│                 │
   │        │            NULL ⇒ graceful RETURN ────────────┤                 │
   │        │                                               │                 │
   │        ├─(3)─► SELEÇÃO — UMA expressão, todos os modos │                 │
   │        │        titulares_alem_da_janela()             │                 │
   │        │          └─► candidaturas_alem_da_janela()  ◄─┼── md5 PINADO    │
   │        │                └─► JOIN config_retencao_etapa │                 │
   │        │                └─► NOT EXISTS revisão Art.20  │                 │
   │        │                └─► NOT EXISTS retencao_hold   │  ← D-46-04      │
   │        │                └─► NOT EXISTS vaga aberta     │  ← D-46-03      │
   │        │                                               │                 │
   │        ├─(4)─► count(*) → n                            │                 │
   │        │            n > cap ────► ledger 'cap_excedido'┤   ← D-46-08     │
   │        │                          RETURN — zero posts  │                 │
   │        │                                               ▼                 │
   │        ├─(5)─► INSERT purga_execucoes (cabeçalho)  ────► LEDGER          │
   │        │       INSERT purga_execucao_itens (n linhas)   (sempre, mesmo   │
   │        │                                                 com n = 0)      │
   │        │                                                                 │
   │        └─(6)─► modo = 'live'?                                            │
   │                  não ──► FIM. ⚠ zero net.http_post  ← asserção negativa  │
   │                  sim ──► LOOP por titular:                               │
   │                            net.http_post(EF, {execucao_id,item_id,…})    │
   │                            └─ INSERT em net.http_request_queue           │
   │                               ⚠ só dispara NO COMMIT                     │
   └──────────────────────────────────┬───────────────────────────────────────┘
                                      │ (assíncrono, at-most-once, sem ack)
                                      ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ EDGE FUNCTION  purgar-retencao   (verify_jwt = false + Bearer do Vault)  │
   │                                                                          │
   │  0 · re-autoriza NO BANCO (o body SELECIONA, o banco AUTORIZA)           │
   │  1 · plano_exclusao_titular(id) ─► enumera caminhos de Storage           │
   │  2 · Storage Admin API: list + remove   ⚠ IRREVERSÍVEL, sem backup       │
   │  3 · anonimizar_candidato(id, false)    ⚠ ver Blocker B-01               │
   │  4 · auth.admin.deleteUser(uid)                                          │
   │  5 · fecha purga_execucao_itens (desfecho por sistema)                   │
   └──────────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────────────┐
   │ RETEN-05 — caminho SEPARADO, 100% Postgres, sem EF e sem hop HTTP        │
   │   DELETE FROM notificacoes_enviadas WHERE criado_em + janela < now()     │
   │   ⚠ independente das FKs CASCADE — que neste sistema estão DORMENTES     │
   └──────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
supabase/
├── migrations/
│   ├── 20260823000001_p46_config_purga.sql          # tabela + RPC auditada + seed
│   ├── 20260823000002_p46_retencao_hold.sql         # D-46-04, tabela vazia
│   ├── 20260823000003_p46_predicado_excecoes.sql    # CREATE OR REPLACE do predicado único
│   ├── 20260823000004_p46_ledger.sql                # purga_execucoes + purga_execucao_itens
│   ├── 20260823000005_p46_guard_purga.sql           # ⛔ Blocker B-01 — edita anonimizar_candidato
│   ├── 20260823000006_p46_sweep_e_cron.sql          # varrer_purga_retencao + cron idempotente
│   └── 20260823000007_p46_reten05_notificacoes.sql  # DELETE + COMMENT ON TABLE reescrito
├── functions/
│   └── purgar-retencao/
│       ├── index.ts
│       └── __tests__/index.test.ts   # ⚠ ver Pitfall 12 antes de criar este caminho
└── tests/
    ├── p46_purga_smoke.sql                          # novo
    ├── p42_invent05_cron_smoke.sql                  # ⚠ EMENDAR: 3 → 4 jobs
    ├── p43_previa_smoke.sql                         # ⚠ RE-PINAR md5(prosrc)
    └── p45_motor_exclusao_smoke.sql                 # ⚠ RE-PINAR se Saída B
supabase/config.toml                                 # ⚠ acrescentar [functions.purgar-retencao]
docs/compliance/cron-inventory.md                    # ⚠ re-coletar ANTES (o próprio doc manda)
```

### Pattern 1 — Agendamento idempotente (PURGA-01)

**What:** `unschedule` guardado por `WHERE EXISTS` **antes** do `schedule`, no mesmo statement pair.
**When to use:** todo `cron.schedule` em migration, sem exceção.
**Example** — verbatim do padrão provado [VERIFIED: supabase/migrations/20260727000001_p41_recon_retry.sql:220-227]:

```sql
SELECT cron.unschedule('notif-retry-sweep')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notif-retry-sweep');

SELECT cron.schedule(
  'notif-retry-sweep',
  '*/15 * * * *',
  $sweep$ SELECT public.varrer_retry_notificacoes(); $sweep$
);
```

Notas que o planejador precisa carregar:
- O corpo do job é **só a chamada da função** — nunca SQL solto. Isso mantém o corpo curto
  (`md5(command)` estável e comparável) e põe toda a lógica onde o `md5(prosrc)` a pina.
- `0 3 * * *` é **UTC**: `pg_cron` interpreta em GMT por padrão (`cron.timezone`)
  [CITED: github.com/citusdata/pg_cron]. 03:00 UTC = 00:00 BRT. O Brasil não observa horário de
  verão desde 2019, então o mapeamento não deriva [ASSUMED].
- Delimitador de cifrão **nomeado** (`$sweep$`, não `$$`) — o arquivo terá `COMMENT`/`REVOKE`
  adjacentes e é exatamente a combinação que o transaction pooler recusa com `42601`
  (CLAUDE.md §Migrations).

### Pattern 2 — O dry-run pela MESMA expressão, terminado por `RAISE` (PURGA-02)

**What:** o corpo destrutivo executa INTEIRO; a última coisa que acontece é um `RAISE EXCEPTION`
com `ERRCODE` próprio, que reverte a transação. Nunca `IF dry THEN <query A> ELSE <query B>`.
**When to use:** sempre que "o dry-run tem de ser a mesma query do delete real".
**Example** — verbatim do motor vivo [VERIFIED: supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:760-777]:

```sql
  -- ══ DRY-RUN — AO FIM DO MESMO CORPO, NUNCA UM SEGUNDO CORPO ═══════════════
  -- Tudo acima já executou de verdade; o `RAISE` reverte a transação inteira. É
  -- essa forma — e não `IF p_dry_run THEN <query A> ELSE <query B>` — que garante
  -- que o que o dry-run mostra é literalmente o que o delete real faz. A forma de
  -- dois corpos é o parente direto do CR-02 da P39, uma guarda que era dead code.
  IF v_dry_run THEN
    RAISE EXCEPTION 'P45 DRY-RUN concluido: … candidatos=% …', v_n_cand, …
      USING ERRCODE = 'P45DR';
  END IF;
```

E a normalização da intenção, uma única vez, no `DECLARE` [VERIFIED: 20260805000006:311]:

```sql
  v_dry_run    boolean := coalesce(p_dry_run, true);
```

⚠ **A razão pela qual isso funciona sem perder o relatório:** quando um `BEGIN … EXCEPTION` captura
o erro, *todas* as mudanças de estado persistente feitas dentro do bloco são revertidas, mas as
**variáveis locais mantêm os valores que tinham no instante do erro**
[CITED: postgresql.org/docs/current/plpgsql-control-structures.html]. É por isso que o `SQLERRM`
capturado sobrevive ao rollback e pode ser gravado no ledger **depois** do bloco.

Forma recomendada para o loop de dry-run da purga:

```sql
  FOR r IN SELECT * FROM public.titulares_alem_da_janela() LOOP
    BEGIN
      PERFORM public.anonimizar_candidato(r.candidato_id, true);
      -- Chegar aqui é DEFEITO: o dry-run TEM de terminar em P45DR.
      RAISE EXCEPTION 'P46: o dry-run de % NAO levantou P45DR — o terminador do dry-run sumiu e a transacao teria COMMITADO', r.candidato_id
        USING ERRCODE = 'P46NT';
    EXCEPTION
      WHEN SQLSTATE 'P45DR' THEN
        v_relato := SQLERRM;          -- sobrevive ao rollback (variável local)
      -- ⚠ NUNCA `WHEN OTHERS`: um erro REAL disfarçado de "dry-run concluído"
      --   seria o pior falso verde desta fase (20260805000006:765-768).
    END;
    INSERT INTO public.purga_execucao_itens (…, relato_dry_run) VALUES (…, v_relato);
  END LOOP;
```

⚠ Note `WHEN SQLSTATE 'P45DR'` e **não** `WHEN OTHERS`: o `ERRCODE` próprio existe precisamente
para distinguir "dry-run concluído" de "erro real", e o comentário vivo diz que a confusão nos dois
sentidos é o pior desfecho [VERIFIED: 20260805000006:765-768]. Bônus mecânico: `WHEN OTHERS` não
captura `QUERY_CANCELED` [CITED: postgresql.org/docs/current/plpgsql-control-structures.html], então
um `statement_timeout` continua derrubando a execução em vez de virar item de ledger falso.

### Pattern 3 — Config auditada por RPC, nunca por policy de UPDATE (PURGA-04 · PURGA-05)

**What:** tabela com RLS ligada, **uma** policy de SELECT restrita a `administrador`, **zero**
policy de escrita; a escrita passa por uma RPC `SECURITY DEFINER` que valida, muta e chama
`log_auditoria` no mesmo corpo (logo na mesma transação).
**When to use:** `config_purga`, e nada mais nesta fase.
**Example** — a estrutura vive em [VERIFIED: 20260801000002:133-165] e a RPC em [VERIFIED: 20260801000002:322-438]. Os elementos que **têm** de ser copiados:

```sql
-- guard NULL-SAFE — `IS DISTINCT FROM`, nunca `NOT IN` (20260801000002:351-354)
IF (select auth.jwt() #>> '{app_metadata,role}') IS DISTINCT FROM 'administrador' THEN
  RAISE EXCEPTION 'FORBIDDEN: …' USING ERRCODE = '42501';
END IF;

-- ator resolvido NO SERVIDOR, nunca por parâmetro (20260801000002:361-370)
SELECT u.id INTO v_actor FROM public.usuarios_rh u
 WHERE u.user_id = (select auth.uid()) AND u.ativo AND u.deleted_at IS NULL;

-- NO-OP É RECUSA (20260801000002:399-402)
IF v_antes = p_novo THEN
  RAISE EXCEPTION 'VALIDATION: … nada a alterar' USING ERRCODE = '22023';
END IF;

-- REVOKE que NOMEIA anon (20260801000002:472-478)
REVOKE ALL ON FUNCTION public.salvar_config_purga(...) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_config_purga(...) TO authenticated;
```

Acréscimos específicos de `config_purga`, derivados de D-46-05/06/07:
- **Singleton por construção**, não por convenção: `id boolean PRIMARY KEY DEFAULT true CHECK (id)`
  — a tabela fica com no máximo uma linha, e uma segunda linha é *inexprimível*.
- `modo text NOT NULL CHECK (modo IN ('off','dry_run','live'))` — D-46-06; o estado contraditório
  `live + inativo` não existe porque não há segundo campo.
- ⚠ **A transição `dry_run → live` deve ser recusável na RPC**, não só registrada: exigir que o
  chamador passe um argumento explícito de confirmação e que os critérios do D-46-14 sejam
  verificados **no servidor** (≥ 14 dias, ≥ 14 execuções com ledger, ≥ 1 execução com elegíveis > 0
  — todos consultáveis em `purga_execucoes`). Uma regra que só vive no checklist é uma regra que
  não existe; a Phase 43 registrou exatamente essa lição sobre o teto de 24 meses
  [VERIFIED: 20260801000002:372-380].

### Pattern 4 — Cap tirado e aplicado na MESMA transação (PURGA-05)

**What:** materializar o conjunto elegível uma vez, contar, comparar contra o cap lido na mesma
transação, e retornar **antes** de qualquer dispatch quando exceder.
**Why it's structurally safe:** `net.http_post` insere em `net.http_request_queue` e o worker só
processa linhas **commitadas** — "HTTP requests are not started until the transaction is committed"
[CITED: supabase.com/docs/guides/database/extensions/pg_net]. Logo, um `RETURN`/`RAISE` antes do
commit garante **zero requests**, e não "quase zero".

```sql
  -- UMA materialização. Contar de uma consulta e despachar de outra é a corrida.
  CREATE TEMP TABLE _elegiveis ON COMMIT DROP AS
    SELECT * FROM public.titulares_alem_da_janela();

  SELECT count(*) INTO v_n FROM _elegiveis;
  SELECT cp.modo, cp.cap_titulares INTO v_modo, v_cap
    FROM public.config_purga cp FOR UPDATE;   -- serializa contra um flip concorrente

  IF v_n > v_cap THEN
    INSERT INTO public.purga_execucoes (modo_vigente, cap_vigente, elegiveis, processados, veredito)
    VALUES (v_modo, v_cap, v_n, 0, 'cap_excedido');
    RETURN;                                   -- ⚠ zero post enfileirado, zero linha tocada
  END IF;
```

⚠ **Nunca `LIMIT v_cap` na seleção.** Isso é "processar até o cap", explicitamente recusado por
D-46-08. Se a contagem completa for cara um dia, o barato é `LIMIT v_cap + 1` **só para detectar o
excesso** — nunca para recortar o trabalho.

⚠ O `FOR UPDATE` sobre a linha de `config_purga` é o que impede o cenário "o operador flipou para
`live` no instante em que o sweep já tinha lido `dry_run`" — a transição serializa na linha, mesmo
idioma do `FOR UPDATE` de `salvar_janela_retencao` [VERIFIED: 20260801000002:384-387].

### Pattern 5 — Ledger que responde "o quê", não só "quantos" (PURGA-06)

Colunas mínimas derivadas de D-46-15 mais o que a §Q5 mostrou ser necessário para a resposta ser
interpretável meses depois:

`purga_execucoes` — modo vigente, cap vigente, elegíveis, processados, veredito
(`desligado | dry_run | despachado | cap_excedido | segredo_ausente`), `iniciada_em`, `concluida_em`.

`purga_execucao_itens` — `execucao_id`, `candidato_id`, `etapa`, `janela_meses_aplicada`,
**`ancora_origem`** (qual dos quatro degraus do `COALESCE` respondeu) e **`ancora_em`** (o timestamp
que respondeu), desfecho por sistema (`storage`, `postgres`, `auth`), `relato_dry_run`.

⚠ **`ancora_origem` não é zelo.** Sem ela é impossível, olhando uma linha do ledger, distinguir "foi
purgado porque a decisão saiu há 24 meses" de "foi purgado porque ninguém tocou a linha há 24
meses" — e as duas afirmações têm valor jurídico diferente. É a metade de "sob qual política" que
uma janela em meses sozinha não responde.

⚠ **Zero PII, e isso é asserção negativa obrigatória do smoke.** O ledger grava identificadores que
**deixam de existir** mais a política aplicada. Um `nome_completo` ali dentro reintroduziria
exatamente o dado que a purga acabou de remover — o mesmo defeito que o CR-04 fechou do outro lado
[VERIFIED: 20260805000006:793-796].

### Pattern 6 — RETEN-05 como regra independente (ver §Q6 para a análise completa)

```sql
DELETE FROM public.notificacoes_enviadas n
 WHERE n.criado_em + make_interval(months => (SELECT cp.janela_notificacoes_meses
                                                FROM public.config_purga cp)) < pg_catalog.now();
```

`criado_em` é a única coluna temporal **NOT NULL** da tabela [VERIFIED:
supabase/migrations/20260721000001_notificacoes_enviadas.sql:88 — `criado_em timestamptz NOT NULL DEFAULT now()`];
`enviado_em`, `entregue_em`, `bounce_em` e `reclamado_em` são todas nulas
[VERIFIED: 20260721000001:90-91 e 20260727000001:73-77]. Ancorar em coluna NOT NULL é a mesma
propriedade load-bearing do quarto degrau do predicado.

### Anti-Patterns to Avoid

- **Segunda cópia do predicado.** Copiar o `WHERE`, "inlinar o JOIN", ou reescrever "só a parte que
  interessa". A asserção (f) do smoke da 43 reprova quem referenciar `config_retencao_etapa`
  diretamente de um wrapper [VERIFIED: supabase/tests/p43_previa_smoke.sql:459-461].
- **`id NOT IN (…)`.** Contra conjunto com NULL devolve DESCONHECIDO e o registro escapa. Foi
  literalmente o INVENT-05 [VERIFIED: 20260801000004:99-102]. Sempre `NOT EXISTS`.
- **`REVOKE ... FROM PUBLIC` sozinho.** O `pg_default_acl` deste schema concede EXECUTE a `anon` e
  `authenticated` como grant **direto** em todo `CREATE FUNCTION`; revogar só de `PUBLIC` não
  remove nada. Medição de 2026-07-30: 61 funções DEFINER com EXECUTE para `anon`
  [VERIFIED: 20260801000002:461-471]. **Nomear `anon` e `authenticated`.**
- **`ADD COLUMN IF NOT EXISTS`.** É a causa medida do drift de `candidatos.user_id`
  [VERIFIED: 20260805000001:211-215]. Falhar alto é informação; passar em silêncio é dívida.
- **Wrapper `BEGIN;/COMMIT;` na migration.** Gatilho do `42601` no pooler quando há corpos `$$`
  adjacentes a `COMMENT`/`REVOKE`/`GRANT`/`cron.schedule` (CLAUDE.md §Migrations).
- **`supabase db push`.** Proibido neste projeto; apply é exclusivamente por MCP `apply_migration`,
  pelo orquestrador, com reparo da `version` e conferência do `md5(statements[1])`.
- **Usar `cron.job_run_details` como ledger.** Ver §Pitfall 5.
- **Tratar a contagem atual de `previa_retencao()` como sinal de correção.** Ela é zero por
  aritmética. Qualquer plano que a leia como validação está errado.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Dry-run que prova o delete | Um segundo corpo "equivalente" com `SELECT` no lugar do `UPDATE` | O corpo único terminado por `RAISE ... USING ERRCODE` | É o parente direto do P39/CR-02 — uma guarda que era dead code. O projeto já embarcou essa falha |
| Reverter um dry-run | `SAVEPOINT` / `ROLLBACK TO` em plpgsql | `BEGIN … EXCEPTION` (é o savepoint implícito) | plpgsql **não pode** emitir statements de controle de transação [CITED: postgresql.org/docs] |
| Enumerar o que seria apagado por titular | Uma consulta nova sobre as tabelas do titular | `public.plano_exclusao_titular(uuid)` | Já enumera do CATÁLOGO as FKs para `auth.users`, incluindo o que uma consulta escrita à mão esquece [VERIFIED: index.ts:1235] |
| Apagar CV do Storage | `DELETE FROM storage.objects` | Storage Admin API a partir da EF | Apagar por SQL remove só o metadado e **órfã o blob para sempre** [VERIFIED: index.ts:842-844] |
| Atomicidade da metade Postgres | Sequência de `await` na Edge Function | Uma RPC `SECURITY DEFINER` | A EF não tem transação; o RPC tem — e a atomicidade É o requisito [VERIFIED: 20260805000006:266-272] |
| Ordem Storage → Postgres → Auth | Confiar que a plataforma impõe | Carimbos em tabela + guard no banco | A SONDA 2 mediu que `storage.objects` **não** tem FK para `auth.users`; violar a ordem falha em **silêncio** [VERIFIED: 20260805000006:413-416] |
| Idempotência de re-execução | `try/catch` ("apagar de novo porque não dá erro") | Reconhecimento da sentinela por ESTADO | Funciona por acidente e para de funcionar no dia em que a enumeração devolver algo novo [VERIFIED: 20260805000006:470-474] |
| Confiar num id vindo do corpo do request | Autorizar por `candidato_id` do payload | O payload **seleciona**; o banco **autoriza** | Classe T-32-03: aceitar identificador do cliente é deixar forjar de quem são os dados destruídos [VERIFIED: index.ts:441-448 e :573-579] |

**Key insight:** neste domínio, todo controle que depende de alguém lembrar de uma regra é um
controle que já falhou uma vez neste repositório. As sete instâncias da Phase 45 eram todas defeitos
de **verificação**, não de motor — e a lição registrada é: *quando um defeito tem forma
reconhecível, varrer o repositório pela FORMA, nunca consertar só o sintoma*.

## Runtime State Inventory

> Incluída porque esta fase muda **estado vivo fora do repositório** — cron, config, Vault — e
> porque o próprio `cron-inventory.md` manda re-coletar antes de qualquer fase que toque cron.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Agendamentos vivos** | 3 jobs, todos `active`, rodando como `postgres`: `ai-cost-aggregation` (`30 1 * * *`), `ai-logs-retention-cleanup` (`0 2 * * *`), `notif-retry-sweep` (`*/15 * * * *`) [VERIFIED: docs/compliance/cron-inventory.md:22-28] | Re-coletar **antes** do apply (o doc é fotografia de 2026-07-29 e ele próprio declara esse limite na linha 241). O 4º job entra por migration; ⚠ `p42_invent05_cron_smoke.sql` assere `<> 3` e vai reprovar (§Pitfall 1) |
| **Config em banco** | `config_retencao_etapa`: 8 linhas. ⚠ Pelo menos uma já foi editada por admin — `rejeitado` foi para **18 meses** [VERIFIED: supabase/tests/p43_matriz_retencao_smoke.sql:231]. O `COMMENT` da coluna declara: *"a Phase 46 NAO PODE LIGAR A PURGA enquanto esta matriz ainda estiver no seed generico, sem que o operador confirme os prazos POR ESTADO"* [VERIFIED: 20260801000002:174-177] | **Medir `origem` das 8 linhas antes de armar o cron.** Uma linha `origem='seed'` significa que ninguém escolheu aquele número — só que ninguém o contestou. É pré-condição escrita *dentro do banco* |
| **Segredos / Vault** | `project_url` e `edge_invoke_key` existem e são consumidos por `varrer_retry_notificacoes` [VERIFIED: 20260727000001:155-158]. ⚠ A invariante `edge_invoke_key == chave de service-role` está **QUEBRADA por rotação** [VERIFIED: 20260727000001:49-53] | **Nenhum segredo novo.** A EF nova valida o Bearer contra `NOTIFICAR_SECRET`-equivalente próprio, jamais assume que o Bearer é a service-role key |
| **Estado de modo herdado** | `NOTIFICACOES_MODO=producao`, medido no ledger em 2026-08-11 e não lido de config [VERIFIED: .planning/STATE.md] | ⚠ **Qualquer smoke desta fase que dispare notificação manda e-mail REAL.** A purga escreve em `notificacoes_enviadas` (scrub do e-mail) — verificar que nenhum caminho da fase dispara envio |
| **Ledger de migrations** | Última aplicada: `20260822000001_p47_check_evento_vocabulario.sql` [VERIFIED: supabase/migrations/ listing] | Novas versões a partir de `20260823xxxxxx`. Cada apply exige `UPDATE supabase_migrations.schema_migrations SET version = '<do arquivo>'` e conferência de `md5(statements[1])` — duas das cinco migrations do M8 chegaram a PROD com comentários descartados |
| **Registro de EFs** | `supabase/config.toml` **não tem entrada** para `executar-direito-titular` [VERIFIED: supabase/config.toml — grep sem resultado] | Acrescentar `[functions.purgar-retencao] verify_jwt = false`. ⚠ Nota do próprio arquivo: `verify_jwt` pode ser ignorado no update (issues #4059/#41693) — conferir a postura viva por `curl` sem auth → 401/403 |
| **Artefatos de build / tipos** | `database.types.ts` é gerado pelo CLI e nunca editado à mão (CLAUDE.md) | Regenerar após as migrations (`npm run db:types`) — as tabelas novas e a coluna nova de `config_retencao_etapa` mudam o tipo |
| **Dados de titular** | `auth.users` = **29** após a execução da Phase 45; tombstones = 0 antes dela [VERIFIED: .planning/STATE.md] | Nada a migrar. O conjunto elegível é **vazio** e continuará vazio até a fixture (§Validation Architecture) |

## Common Pitfalls

### Pitfall 1 — O 4º job de cron reprova um smoke que hoje está verde
**What goes wrong:** `p42_invent05_cron_smoke.sql` assere `IF v_n <> 3 THEN RAISE EXCEPTION` sobre
`count(*) FROM cron.job` [VERIFIED: supabase/tests/p42_invent05_cron_smoke.sql:93-99]. A Phase 46
cria o 4º job e o smoke passa a reprovar com a mensagem *"Um a mais = guard de remoção condicional
falhou e o alvo ficou duplicado"* — um diagnóstico **falso** para uma mudança correta.
**Why it happens:** a asserção fixa um instantâneo em vez de um invariante — o mesmo erro que a
própria P43 já corrigiu no smoke da matriz em 2026-08-03, com o motivo escrito por extenso
[VERIFIED: supabase/tests/p43_matriz_retencao_smoke.sql:220-252].
**How to avoid:** emendar a asserção **na mesma migration/commit** que cria o job, trocando o
número por um invariante: *os 3 jobs herdados continuam existindo, intocados, e existe exatamente 1
job de purga*. Registrar a emenda no `cron-inventory.md`.
**Warning signs:** um plano que cria o cron sem tocar em `p42_invent05_cron_smoke.sql`.

### Pitfall 2 — O re-pin de md5 vira desculpa para afrouxar a asserção
**What goes wrong:** editar `candidaturas_alem_da_janela()` muda `md5(prosrc)` e reprova a asserção
(e) do smoke da 43 (pin atual `ddfa6542921d241323c0124fc1bd1f99`
[VERIFIED: supabase/tests/p43_previa_smoke.sql:400]). A tentação é trocar o md5 por um `strpos`.
**Why it happens:** o gate reprova trabalho correto, e um gate que reprova trabalho correto treina
quem executa a desligá-lo.
**How to avoid:** o cabeçalho do smoke já define o protocolo — re-pinar **por execução**, nunca
digitando o valor à mão, com o md5 vivo e o md5 do arquivo medidos e registrados. A rede estrutural
embaixo do md5 (`data-ancora presente`, `NOT EXISTS presente`, `NOT IN ausente`) deve **continuar**
e ganhar checagens novas para `retencao_hold` e `vagas`. ⚠ E o próprio smoke já assere que o md5 não
pode casar com a FORMA errada [VERIFIED: p43_previa_smoke.sql:423-425].

### Pitfall 3 — O dry-run "passa" porque não havia nada a fazer
**What goes wrong:** 14 dias de execuções com `elegiveis = 0`, ledger cheio, tudo verde — e zero
evidência sobre o caminho do delete.
**Why it happens:** `previa_retencao()` devolve zero por **aritmética** (matriz em 24 meses, sistema
mais novo que a janela), e as quatro exceções novas só podem **reduzir** o conjunto.
**How to avoid:** a fixture de conjunto não-vazio (§Validation Architecture) é o **primeiro** plano
da fase, não o último. Toda asserção tem de responder "isto passaria se o conjunto fosse vazio?"
antes de contar como prova — a Phase 45 mediu exatamente isso quando descobriu que 3 tabelas de
IA estavam VAZIAS em PROD e as asserções passariam por vacuidade.
**Warning signs:** um critério de flip que conta dias e execuções mas não conta `elegiveis > 0`.

### Pitfall 4 — O período de dry-run passa e ninguém consegue provar que passou
**What goes wrong:** o ledger existe, mas as evidências laterais que provariam "nada foi despachado"
já expiraram.
**Why it happens:** `net._http_response` é `UNLOGGED` com TTL padrão de ~6 h
[CITED: supabase.com/docs/guides/database/extensions/pg_net], e `net.http_request_queue` é
`UNLOGGED` — ambas somem num restart. As duas asserções negativas mais fortes da fase são
**perecíveis**.
**How to avoid:** toda asserção sobre `net._http_response` tem de ser tirada **dentro da janela** e
copiada para artefato durável (`46-*-EVIDENCIA-*.md`), com o `now()` do servidor no cabeçalho.
Complementar com a asserção durável equivalente: nenhuma linha de `purga_execucao_itens` com
desfecho de Storage/Postgres/Auth carimbado durante o período.

### Pitfall 5 — O cron para de rodar e o silêncio é indistinguível de "nada elegível"
**What goes wrong:** o worker do `pg_cron` morre, ou o job é desagendado, e a política de retenção
simplesmente deixa de existir. Ninguém percebe, porque zero-purgado e nada-agendado produzem a mesma
observação: nada acontece.
**Why it happens:** o processo `pg_cron scheduler` pode morrer; versões < 1.6.4 não têm auto-revive
[CITED: supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz]. E `RAISE WARNING`
dentro do corpo do job (o idioma do `varrer_retry_notificacoes`
[VERIFIED: 20260727000001:194-196]) **não** marca a execução como `failed` nem chega ao
`return_message`.
**How to avoid:** **heartbeat no ledger** — o sweep grava linha em `purga_execucoes` em TODA
execução, inclusive `modo='off'` e `elegiveis = 0`. Aí "nenhuma linha de ledger em > 36 h" vira uma
condição detectável, e é exatamente isso que torna o critério "≥ 14 execuções com ledger não-vazio"
(D-46-14) mensurável. Complementar: `cron.job_run_details` filtrado por
`status NOT IN ('succeeded','running')`.
⚠ E lembrar que `cron.job_run_details` **não é limpo automaticamente** e sobrevive ao `unschedule`
[CITED: supabase.com/docs/guides/cron/quickstart] — usá-lo como ledger é acumular disco sem gravar
política.

### Pitfall 6 — Execuções que não se sobrepõem, mas cujos EFEITOS se sobrepõem
**What goes wrong:** o sweep do dia N despacha 30 posts e retorna em milissegundos; as 30 EFs ainda
estão executando quando o sweep do dia N+1 roda, re-seleciona os mesmos titulares (ainda não
tombstoneados) e despacha de novo.
**Why it happens:** `pg_cron` garante que **um job não roda concorrente consigo mesmo** — uma segunda
disparada é enfileirada [CITED: github.com/citusdata/pg_cron] — mas o sweep é assíncrono e retorna
antes de o trabalho acontecer. A garantia do agendador não cobre o trabalho delegado.
**How to avoid:** claim no ledger. A seleção exclui, por `NOT EXISTS`, todo `candidato_id` que já
tenha item aberto (`concluido_em IS NULL`) numa execução recente. Com o `0 3 * * *` diário a janela
é larga, mas a exclusão tem de ser estrutural, não confiada ao intervalo.

### Pitfall 7 — A Edge Function estoura o relógio no meio do pacote irreversível
**What goes wrong:** uma invocação que processa vários titulares é cortada aos 150 s, deixando
Storage apagado e Postgres intacto — o estado exato que o `causa='falha_storage'` da Phase 45 existe
para nomear, agora sem ninguém para retomar.
**Why it happens:** Edge Functions têm wall-clock de 150 s (free) / 400 s (paid), CPU de 2 s por
request e timeout de gateway de 150 s [CITED: supabase.com/docs/guides/functions/limits]. E o
`net.http_post` tem timeout padrão curto (1–2 s conforme a versão)
[CITED: github.com/supabase/pg_net], então a resposta é registrada como `timed_out=true` **enquanto
a EF continua executando** — a ausência de resposta não significa ausência de efeito.
**How to avoid:** **um `net.http_post` por titular**, como faz o `varrer_retry_notificacoes` linha a
linha [VERIFIED: 20260727000001:167-197]. Cada invocação processa exatamente um titular, é limitada,
retomável, e a perda at-most-once de um post custa um titular adiado (fail-safe, D-46-13) em vez de
uma execução meio-aplicada. O cap de 50 limita o fan-out.

### Pitfall 8 — `statement_timeout` corta o sweep e a mensagem culpa o lugar errado
**What goes wrong:** o sweep roda longo (loop de dry-run com uma subtransação por titular) e é
cancelado, deixando o ledger sem linha nenhuma daquele dia.
**Why it happens:** jobs de `pg_cron` rodam como `postgres`, cujo `statement_timeout` é herdado do
global de 2 minutos [CITED: supabase.com/docs/guides/database/postgres/timeouts]. Um bloco
`BEGIN…EXCEPTION` é significativamente mais caro de entrar e sair que um bloco sem ele
[CITED: postgresql.org/docs/current/plpgsql-control-structures.html], e o loop de dry-run tem um por
titular. E `WHEN OTHERS` **não** captura `QUERY_CANCELED`, então o cancelamento derruba tudo — o que
é o comportamento certo, mas custa a linha de ledger.
**How to avoid:** gravar o **cabeçalho** de `purga_execucoes` numa transação própria antes do loop
(ou aceitar que o cabeçalho e os itens caem juntos, e detectar o dia faltante pelo heartbeat do
Pitfall 5). Declarar `ALTER FUNCTION public.varrer_purga_retencao() SET statement_timeout = '300s'`
explicitamente, e medir a duração real durante o dry-run em vez de estimá-la.
⚠ Nota mecânica adjacente: o cache de subtransações do Postgres é de 64 por backend; com o cap em 50
o loop fica abaixo do limite e não paga *suboverflow* [ASSUMED — não verificado nesta sessão].

### Pitfall 9 — O ledger reintroduz o dado que a purga acabou de apagar
**What goes wrong:** `purga_execucao_itens` ganha um `email` ou `nome_completo` "para facilitar a
auditoria", e o sistema passa a manter para sempre um registro identificável de pessoas que ele
declarou ter apagado.
**Why it happens:** é a forma mais natural de tornar o ledger legível, e é o mesmo defeito que o
CR-04 fechou do outro lado (gravar o uid do titular no registro que prova a exclusão dele)
[VERIFIED: 20260805000006:793-796].
**How to avoid:** asserção negativa no smoke sobre a **assinatura e o catálogo**, não sobre uma
execução — o molde é a asserção (a) do smoke da 43, que afere sobre `pg_get_function_result` porque
"a proibição tem de valer ANTES de qualquer render"
[VERIFIED: supabase/tests/p43_previa_smoke.sql:153-157]. Aqui o equivalente é uma banlist de nomes
de coluna sobre `information_schema.columns` das duas tabelas do ledger.

### Pitfall 10 — `SECURITY DEFINER` com `search_path` que o catálogo grava diferente
**What goes wrong:** uma asserção que compara `proconfig` contra `'search_path='` reprova a
implementação correta, porque o catálogo grava `search_path=""`.
**Why it happens:** é o portão nº 1 dos sete que reprovaram trabalho correto na Phase 45.
**How to avoid:** comparar contra a forma que o catálogo grava, medida — não contra a forma que a
migration escreve. E, do lado da implementação, manter `SET search_path = ''` com **toda** referência
totalmente qualificada, incluindo `pg_catalog.now()` (o idioma que o `varrer_retry_notificacoes` já
usa [VERIFIED: 20260727000001:172]).

### Pitfall 11 — A EF confia no `candidato_id` do payload
**What goes wrong:** a EF `purgar-retencao` recebe `{candidato_id}` e apaga. Quem conseguir forjar
um POST com o Bearer certo escolhe quem é destruído.
**Why it happens:** ao contrário de `executar-direito-titular`, esta EF **não tem sessão de onde
derivar o titular** — o id tem de vir do corpo. Isso reverte a proteção que o DESVIO 1 daquela EF
mantinha [VERIFIED: index.ts:441-448].
**How to avoid:** o payload **seleciona**, o banco **autoriza** — exatamente a emenda de um único
campo que o 45-12 documentou para `candidatura_id` [VERIFIED: index.ts:573-579]. A EF chama uma RPC
`SECURITY DEFINER` que verifica que aquele `item_id` existe, está aberto, pertence a uma execução em
`modo='live'`, e que o `candidato_id` do item bate com o do payload. Sem esse encontro, 403.

### Pitfall 12 — O teste da EF nova deixa `npm run test:run` vermelho
**What goes wrong:** criar `supabase/functions/purgar-retencao/__tests__/index.test.ts` faz o Vitest
coletá-lo (o `include` é `'**/__tests__/**/*.{test,spec}.{ts,tsx}'`
[VERIFIED: vite.config.ts:13]) e ele falha na **carga do módulo ESM** por causa dos specifiers Deno —
não por asserção. O repositório inteiro fica vermelho.
**Why it happens:** já aconteceu com `notificar-rh` [VERIFIED: vite.config.ts:73-76].
**How to avoid:** o precedente correto está escrito: a linha de `exclude` nasce **ANTES** do teste,
por caminho **LITERAL**, nunca glob de diretório — verbatim de
[VERIFIED: vite.config.ts:87-93] para `exportar-meus-dados`. Fazer a mesma coisa para
`supabase/functions/purgar-retencao/**/*.test.ts`, no mesmo commit que cria a pasta.

## Code Examples

### O predicado com as quatro exceções (D-46-01..04 + PURGA-07)

Base verbatim do corpo vivo [VERIFIED: supabase/migrations/20260801000004_p43_previa_retencao.sql:180-201]:

```sql
AS $candidaturas_alem_da_janela$
  SELECT c.id, c.candidato_id, c.etapa_atual
    FROM public.candidaturas c
    JOIN public.config_retencao_etapa m ON m.etapa = c.etapa_atual
   WHERE c.deleted_at IS NULL
     AND NOT EXISTS (
           SELECT 1
             FROM public.decisao_final d
            WHERE d.candidatura_id = c.id
              AND d.revisao_solicitada_em IS NOT NULL
              AND d.revisao_respondida_em IS NULL
         )
     AND COALESCE(
           (SELECT max(h.criado_em)
              FROM public.historico_candidatura h
             WHERE h.candidatura_id = c.id
               AND h.etapa_para = c.etapa_atual),
           c.data_decisao_final,
           c.updated_at,
           c.data_candidatura::timestamptz
         ) + make_interval(months => m.janela_meses) < now();
$candidaturas_alem_da_janela$;
```

Acréscimos recomendados (shape, não texto final):

```sql
     -- PURGA-07 · allowlist de estados elegíveis, como DADO e não como lista no código.
     -- Coluna nova em config_retencao_etapa, NOT NULL DEFAULT false: um estado novo
     -- nasce NÃO-purgável e só passa a ser por decisão explícita e auditada.
     AND m.elegivel_purga

     -- D-46-04 · hold pontual. NOT EXISTS, jamais NOT IN.
     AND NOT EXISTS (
           SELECT 1 FROM public.retencao_hold h
            WHERE h.candidatura_id = c.id
              AND h.liberado_em IS NULL
         )

     -- D-46-03 · vaga ainda aberta protege a candidatura.
     -- ⚠ A forma abaixo é NOT EXISTS (idioma NULL-safe exigido) E allowlist ao mesmo
     --   tempo: o que está DENTRO do NOT EXISTS é o COMPLEMENTO da allowlist de
     --   estados fechados. Um valor NOVO em status_vaga cai fora da allowlist, casa o
     --   NOT EXISTS, e PROTEGE — fail-closed por construção.
     AND NOT EXISTS (
           SELECT 1 FROM public.vagas v
            WHERE v.id = c.vaga_id
              AND v.status <> ALL (ARRAY['arquivada','inativa']::public.status_vaga[])
         )
```

Os oito valores de `etapa_processo` são, verbatim
[VERIFIED: database.types.ts:5839-5847 e 20260801000002:224-231]:
`'inscricao'`, `'triagem'`, `'avaliacao_assincrona'`, `'entrevista_online'`,
`'entrevista_presencial'`, `'decisao_final'`, `'aprovado'`, `'rejeitado'`.

Os quatro valores de `status_vaga` são, verbatim [VERIFIED: database.types.ts:5602]:
`"rascunho" | "ativa" | "inativa" | "arquivada"`.

⚠ **D-46-01 e D-46-02 são satisfeitas por AUSÊNCIA**: nenhuma cláusula sobre `is_rascunho` e nenhuma
sobre `autorizacao_retencao_curriculo` entram no predicado. Isso deve ser dito **em comentário e no
`COMMENT ON FUNCTION`**, porque uma decisão registrada como ausência é indistinguível de um
esquecimento quando o próximo leitor chega.

### O hop cron → EF, com Vault e falha silenciosa

Verbatim do padrão a espelhar [VERIFIED: supabase/migrations/20260727000001_p41_recon_retry.sql:154-197]:

```sql
BEGIN
  SELECT decrypted_secret INTO v_project_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_invoke_key
    FROM vault.decrypted_secrets WHERE name = 'edge_invoke_key';
  IF v_project_url IS NULL OR v_invoke_key IS NULL THEN
    RETURN;  -- segredos ausentes — varredura adiada, ledger intacto (graceful-skip)
  END IF;
  …
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_project_url || '/functions/v1/notificar-candidato',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_invoke_key
        ),
        body := jsonb_build_object(…)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'varrer_retry: dispatch falhou id=% (%: %)', r.id, SQLSTATE, SQLERRM;
    END;
  END LOOP;
END;
```

⚠ **Divergência obrigatória para a purga:** o `RAISE WARNING` do P41 é aceitável porque uma
notificação perdida é recuperada em 15 minutos. Aqui, um dispatch que falha tem de virar **linha de
ledger**, não `WARNING` — porque `WARNING` não marca a execução do cron como `failed` e não chega ao
`return_message`. O `graceful-skip` do Vault também deve gravar `veredito='segredo_ausente'` antes de
retornar, pelo mesmo motivo.

### Bloco de auto-verificação que ABORTA o apply

Molde vivo [VERIFIED: supabase/migrations/20260805000006_p45_anonimizar_candidato.sql:1022-1027] — a
mensagem completa está no arquivo; a forma é: perguntar ao **catálogo** se `authenticated` pode
escrever na tabela de que o guard depende, e `RAISE EXCEPTION` se puder, com a saída honesta nomeada
na mensagem. Para a Phase 46 as tabelas são `purga_execucoes` e `purga_execucao_itens`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `id NOT IN (subquery)` para exceções | `NOT EXISTS` correlacionado | P42 / INVENT-05, `20260730000005`, aplicada 2026-08-01 | O único `DELETE` em cron do sistema já foi convertido; a Phase 46 herda o idioma |
| Guard por `NOT IN ('rh','administrador')` | `IS DISTINCT FROM` (NULL-safe) | P42-06 / P43 `20260801000002` | `NOT IN` falha ABERTO para chamador sem claim; 61 funções DEFINER foram medidas com o defeito |
| `REVOKE ... FROM PUBLIC` | `REVOKE ... FROM PUBLIC, anon, authenticated` | P42-06 (medição do `pg_default_acl`) | Revogar só de PUBLIC não remove nada neste schema |
| `ADD COLUMN IF NOT EXISTS` | `ADD COLUMN` puro (falha alto) | P45 `20260805000001:211-215` | Causa medida do drift de `candidatos.user_id` |
| Dry-run como segundo corpo | Corpo único + `RAISE ... USING ERRCODE` | P45 `20260805000006:760-777` | O que torna PURGA-02 satisfeito por construção |
| `supabase db push --linked` | MCP `apply_migration` pelo orquestrador + reparo de `version` | P42, medido 3× | `db push` é **proibido** neste projeto |
| Smoke por instantâneo (`todas em 24`, `exatamente 3 jobs`) | Smoke por **invariante** | P43, reescrita de 2026-08-03 | ⚠ `p42_invent05_cron_smoke.sql` ainda é instantâneo — é o Pitfall 1 |

**Deprecated/outdated:**
- `n8n` como orquestrador: aposentado na P39; o trigger `trg_n8n_novo_candidato` foi removido, logo
  nenhum `INSERT` em `public.candidatos` dispara `net.http_post` [VERIFIED: 20260805000006:250-254].
  Isso importa para a fixture: inserir candidatos de teste **não** vaza para fora da transação.
- `data_deletion_log` como destino do ledger: adotado pela Phase 47 para outro fim
  (CONSOL-02, `20260809000002`). **Não reusar** (D-46-15).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | O Brasil não observa horário de verão desde 2019, então `0 3 * * *` UTC = 00:00 BRT o ano inteiro sem deriva | Pattern 1 | Baixo — a purga rodaria numa hora diferente da pretendida; nenhum efeito de correção |
| A2 | O cache de subtransações do Postgres é 64 por backend, e um cap de 50 fica abaixo do limite de *suboverflow* | Pitfall 8 | Baixo — degradação de performance no sweep, não incorreção |
| A3 | `auth.uid()` resolve NULL sob `pg_cron` (papel `postgres`, sem `request.jwt.claims` setado) — inferido do comportamento documentado sob `service_role` | Blocker B-01 | ⚠ **Alto** se errado no sentido oposto: se `auth.uid()` retornasse algo, o guard poderia ser contornado sem que ninguém percebesse. **Medir por execução** antes de escolher a saída |
| A4 | A EF `purgar-retencao` precisa de `verify_jwt = false` + Bearer do Vault, espelhando `notificar-candidato`/`cost-alerter` | Runtime State Inventory | Médio — postura de auth errada na EF nova; detectável por `curl` sem auth |
| A5 | Um `UPDATE` de RH em `candidaturas` bumpa `updated_at` e, portanto, reseta o degrau (3) da data-âncora | Q5 | Baixo — o efeito é conservador (retém mais tempo), nunca destrutivo. Mas afeta a interpretação do ledger |
| A6 | `plano_exclusao_titular(uuid)` é chamável por um client `service_role` sem JWT de usuário (o `GRANT` é a `service_role`, e ela é `STABLE`/leitura) | Architecture | ⚠ Médio-alto — se ela também tiver guard de sessão, a EF de purga não consegue nem enumerar o Storage. **Medir junto com A3** |
| A7 | `cron.job_run_details` na instância do projeto tem `pg_cron ≥ 1.6.4` (com auto-revive) | Pitfall 5 | Médio — sem auto-revive, o modo de falha "cron parou em silêncio" é mais provável e o heartbeat é mais necessário |

## Open Questions (RESOLVED)

> **As cinco foram resolvidas em 2026-08-22**, depois de quatro medições read-only contra PROD.
> As resoluções vivem em `46-CONTEXT.md` §Área 5 e são o que os 7 planos implementam.
>
> | OQ | Resolvida por | Resolução |
> |----|---------------|-----------|
> | OQ-1 | **D-46-18** | Saída B — quarto ramo autorizado no guard, com as 4 obrigações. Medido: `auth.uid()` é NULL como `postgres` sem claims, então o bloqueio era real, não hipótese |
> | OQ-2 | **D-46-19** | Allowlist = `aprovado`, `rejeitado`, `decisao_final`. Consequência declarada: rascunho e funil ativo nunca purgam automaticamente |
> | OQ-3 | **D-46-20** | Escalar próprio `janela_notificacoes_meses` em `config_purga`, não derivado da matriz |
> | OQ-4 | **D-46-21** | As duas fixtures — revertida no smoke, durável e namespaceada no dry-run, teardown escrito antes |
> | OQ-5 | **D-46-22** | Medido: 7 das 8 linhas ainda em `origem='seed'`. Confirmar os 3 estados da allowlist virou **pré-condição do flip** |

1. **OQ-1 — Como o cron autoriza o motor destrutivo? (⛔ bloqueava a decomposição) — RESOLVED: ver D-46-18**
   - What we know: as três metades do guard de `anonimizar_candidato` recusam um chamador sem
     sessão, sem papel e sem pedido em `solicitacoes_dados` — medido, verbatim, em §Blocker B-01.
   - What's unclear: qual das três saídas o operador aceita. É decisão de **segurança**, não de
     implementação, e a Saída B edita uma função destrutiva provada em PROD.
   - Recommendation: **checkpoint do operador no primeiro plano da fase.** Recomendação técnica:
     Saída B, com as quatro obrigações listadas. Antes do checkpoint, **medir** A3 e A6 por
     execução (uma chamada `SELECT auth.uid()` sob o corpo do cron resolve as duas em segundos).

2. **OQ-2 — `inscricao` entra na allowlist de estados elegíveis?** — RESOLVED: ver D-46-19
   - What we know: PURGA-07 pede "allowlist de estados **terminais**". D-46-01 diz que rascunhos
     seguem a matriz "pelo estado em que estão (`inscricao`, 24 meses)" — e `inscricao` não é
     terminal.
   - What's unclear: se D-46-01 pretende que rascunhos sejam de fato purgáveis após 24 meses (o que
     exige `inscricao` na allowlist) ou se o efeito pretendido é que eles simplesmente não tenham
     regra própria (o que os deixa nunca purgáveis).
   - Recommendation: perguntar ao operador nomeando os 8 estados um a um, com `elegivel_purga`
     default `false`. A resposta é uma linha de seed — barata de escrever, cara de assumir errado.

3. **OQ-3 — De onde vem a janela do RETEN-05?** — RESOLVED: ver D-46-20
   - What we know: D-46-17 diz "24 meses, alinhado à matriz". Mas `config_retencao_etapa` é chaveada
     por `etapa_processo` e `notificacoes_enviadas` não tem etapa.
   - What's unclear: escalar próprio em `config_purga`, ou derivado de `max(janela_meses)`.
   - Recommendation: escalar próprio em `config_purga` (`janela_notificacoes_meses`). O derivado
     mudaria em silêncio no dia em que um admin encurtar a janela de um estado, e a relação
     "notificação ↔ etapa" não existe no modelo.

4. **OQ-4 — A fixture do dry-run é durável ou por transação?** — RESOLVED: ver D-46-21
   - What we know: o smoke precisa de fixture revertida (idioma `20260805000006` §3); o dry-run de
     14 dias precisa de fixture que **sobreviva** entre dias.
   - What's unclear: se o operador aceita fixture durável em PROD por 14 dias, e como ela é isolada
     de telas de RH, do snapshot de bias k=5 e de `v_triagem_panel`.
   - Recommendation: as duas, com propósitos diferentes — revertida no smoke, durável e
     namespaceada para o período de dry-run, com plano de teardown escrito **antes** de criá-la.

5. **OQ-5 — A matriz ainda está no seed genérico?** — RESOLVED: ver D-46-22 (medido: 7/8 em seed)
   - What we know: o `COMMENT` da coluna, escrito dentro do banco, declara que a Phase 46 **não pode
     ligar a purga** enquanto a matriz estiver no seed sem confirmação por estado
     [VERIFIED: 20260801000002:174-177]. Pelo menos `rejeitado` já foi editado para 18 meses.
   - What's unclear: o estado atual das 8 linhas (`origem`, `janela_meses`, `alterado_por`).
   - Recommendation: `SELECT * FROM public.listar_matriz_retencao();` é a primeira medição da fase.
     Se houver linha `origem='seed'`, ela é um item de checkpoint, não um detalhe.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| `pg_cron` | PURGA-01 | ✓ | 3 jobs vivos [VERIFIED: cron-inventory.md:22-28] | — |
| `pg_net` | D-46-13 | ✓ | usado em produção pelo `notif-retry-sweep` | — |
| Supabase Vault (`project_url`, `edge_invoke_key`) | D-46-13 | ✓ | provisionados [VERIFIED: 20260727000001:155-158] | — |
| MCP Supabase `apply_migration` / `execute_sql` | todo apply e todo smoke | ✓ **só para o ORQUESTRADOR** | — | ⛔ **Sem fallback.** Subagentes GSD não recebem os tools MCP (bug upstream `anthropics/claude-code#13898`). Todo plano que aplica migration ou roda smoke tem de ser executado pelo orquestrador |
| Supabase CLI (`functions deploy`) | EF nova | ✓ | 2.115.0 via `npx` | ⚠ >7 min por função; rodar em **background** e conferir por MCP (`get_edge_function`), nunca esperar em primeiro plano. Exige `--project-ref isljnozzlvckrgjjbjwp` |
| `npm run lint` (`tsc --noEmit`) | tipos da EF | ✓ | — | — |
| Vitest 4.1.9 | testes de front | ✓ | `npm run test:run` | Testes de EF rodam sob `deno test`, não Vitest (§Pitfall 12) |
| PITR / backup de Storage | recuperação de erro | ✗ | — | ⛔ **Sem fallback, e é o fato que governa a fase.** Storage não é coberto por nenhum caminho de backup [VERIFIED: docs/compliance/backup-posture.md] |

**Missing dependencies with no fallback:**
- PITR/backup de Storage — um CV apagado é irrecuperável. É a razão dura por trás de D-46-08.
- MCP Supabase em subagente — toda tarefa de apply/smoke tem de ser marcada como do orquestrador.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (front) | Vitest 4.1.9 [VERIFIED: package.json:94] |
| Config file | `vite.config.ts` (bloco `test`, linhas 9-94) |
| Framework (Edge Functions) | `deno test` — **não** Vitest [VERIFIED: vite.config.ts:14-18] |
| Framework (banco) | Smoke SQL em `supabase/tests/p<NN>_*_smoke.sql`, executado por MCP `execute_sql` numa **única chamada** (o contador é GUC de sessão) [VERIFIED: p43_matriz_retencao_smoke.sql:20] |
| Quick run command | `npm run lint && npm run test:run` |
| Full suite command | `npm run lint && npm run test:run && npm run test:e2e` + smokes por MCP |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PURGA-01 | Existe exatamente 1 job de purga, com o schedule e o corpo declarados; os 3 herdados intocados | smoke SQL | `p46_purga_smoke.sql` (a) via MCP `execute_sql` | ❌ Wave 0 |
| PURGA-01 | O smoke herdado não reprova por causa do 4º job | smoke SQL | `p42_invent05_cron_smoke.sql` (a) **emendado** | ⚠ existe, precisa de emenda |
| PURGA-02 | O predicado vivo casa byte a byte com a migration (md5 re-pinado) e mantém a FORMA | smoke SQL | `p43_previa_smoke.sql` (e) **re-pinado** | ⚠ existe, precisa de re-pin |
| PURGA-02 | Os wrappers CHAMAM o predicado único e não releem a matriz | smoke SQL | `p43_previa_smoke.sql` (f) | ⚠ ver OQ sobre `titulares_alem_da_janela` |
| PURGA-02 | O loop de dry-run termina em `P45DR` e **zero coluna** mutou | smoke SQL | `p46_purga_smoke.sql` (b) | ❌ Wave 0 |
| PURGA-03 | ⊖ `modo='dry_run'` sobre conjunto NÃO-VAZIO não apagou nada e não subiu `net._http_response` | smoke SQL | `p46_purga_smoke.sql` (c) | ❌ Wave 0 |
| PURGA-04 | A RPC RECUSA `dry_run → live` quando os critérios do D-46-14 não são satisfeitos | smoke SQL | `p46_purga_smoke.sql` (d) | ❌ Wave 0 |
| PURGA-04 | A mudança de modo grava linha em `logs_auditoria` na mesma transação | smoke SQL | `p46_purga_smoke.sql` (e) | ❌ Wave 0 |
| PURGA-05 | ⊖ `modo='off'` sobre conjunto NÃO-VAZIO: `elegiveis > 0`, `processados = 0`, zero mutação | smoke SQL | `p46_purga_smoke.sql` (f) | ❌ Wave 0 |
| PURGA-05 | ⊖ Conjunto acima do cap ABORTA — zero linha tocada, zero post, ledger `cap_excedido` | smoke SQL | `p46_purga_smoke.sql` (g) | ❌ Wave 0 |
| PURGA-06 | ⊖ Nenhuma coluna do ledger casa a banlist de PII (aferido sobre o CATÁLOGO) | smoke SQL | `p46_purga_smoke.sql` (h) | ❌ Wave 0 |
| PURGA-06 | Cada item registra `etapa`, `janela_meses_aplicada`, `ancora_origem`, `ancora_em` | smoke SQL | `p46_purga_smoke.sql` (i) | ❌ Wave 0 |
| PURGA-07 | ⊖ `retencao_hold` protege · ⊖ vaga aberta protege · ⊖ revisão Art. 20 aberta protege | smoke SQL | `p46_purga_smoke.sql` (j.1-3) | ❌ Wave 0 |
| PURGA-07 | Candidatura com `data_decisao_final IS NULL` é classificada pelo degrau correto, nunca omitida | smoke SQL | `p46_purga_smoke.sql` (k) | ❌ Wave 0 |
| PURGA-07 | ⊖ Um estado sem `elegivel_purga` NÃO entra no conjunto | smoke SQL | `p46_purga_smoke.sql` (l) | ❌ Wave 0 |
| RETEN-05 | Linha além da janela é apagada; linha dentro sobrevive; a regra roda **sem** DELETE de pai | smoke SQL | `p46_purga_smoke.sql` (m) | ❌ Wave 0 |
| RETEN-05 | ⊖ O `COMMENT ON TABLE` vivo **não** contém "INDEFINITE" e **contém** a janela e o âncora | smoke SQL | `p46_purga_smoke.sql` (n) | ❌ Wave 0 |
| Blocker B-01 | Se Saída B: o md5 de `anonimizar_candidato` bate o pin re-carimbado, e o guard novo recusa fora de `modo='live'` | smoke SQL | `p45_motor_exclusao_smoke.sql` (C3) + `p46_purga_smoke.sql` (o) | ⚠ existe, precisa de re-pin |
| EF | O contrato da EF `purgar-retencao`: 403 sem Bearer; 403 quando o item não confere | unit (Deno) | `deno test supabase/functions/purgar-retencao/` | ❌ Wave 0 |
| Tipos | `database.types.ts` regenerado e o repo compila | type-check | `npm run db:types && npm run lint` | ✓ |

### A fixture — sem ela, 18 das 21 linhas acima passam por vacuidade

`previa_retencao()` devolve **zero por aritmética**, e as quatro exceções novas só reduzem o
conjunto. O conjunto elegível é vazio e continuará vazio.

**Forma recusada:** retrodatar uma candidatura real. Tornaria uma pessoa real purgável, e um erro é
irreversível (sem PITR, sem backup de Storage).

**Forma recomendada — titular sintético, construído para isso**, exatamente como a FASE 0 da Phase 45
montou o blob órfão de propósito (foi só por isso que o caso difícil ficou testável):

1. `auth.users` — conta descartável, e-mail em namespace reservado (ex.: `fixture-p46+<uuid>@invalido.local`).
2. `public.candidatos` — CPF **derivado do UUID da fixture**, nunca de `random()` sobre coluna
   `UNIQUE`: com sorteio, o apply é não-determinístico e uma colisão faz tudo falhar sem que a
   próxima pessoa entenda por quê [VERIFIED: 20260805000006:247-249].
3. `public.vagas` — uma vaga em status **fechado** (`arquivada`), criada para a fixture; senão a
   exceção de vaga aberta protege a candidatura e a fixture rende zero.
4. `public.candidaturas` — em etapa terminal e com **`data_candidatura` E `updated_at` retrodatadas
   além da janela**.
   ⚠⚠ **`updated_at` é o degrau (3) do `COALESCE` e nasce `now()`.** Se não for retrodatado
   explicitamente, o degrau (3) responde `now()`, a soma nunca é menor que `now()`, e a fixture
   rende **ZERO** — uma fixture que se autoderrota, e o modo de falha mais provável desta fase.
   Verificar antes se existe trigger de `updated_at` em `candidaturas` que sobrescreva o retrodate;
   **medir, não assumir**.
5. Uma **segunda** candidatura da mesma fixture, esta **com** linha em `historico_candidatura` cuja
   `etapa_para` = a etapa atual, para exercitar o degrau (1). Uma terceira sem histórico e com
   `data_decisao_final` preenchida exercita o degrau (2). Sem essas variantes, `ancora_origem` só
   é observada num valor e a coluna não prova nada.
6. **Cenários negativos**, cada um com sua fixture dedicada: uma em `retencao_hold`; uma de vaga
   `ativa`; uma com revisão do Art. 20 em aberto; uma em etapa sem `elegivel_purga`. Cada uma tem de
   estar **além da janela** — senão a asserção passa porque a data protegeu, não porque a exceção
   funcionou.
7. **Fixture de cap:** `cap` reduzido temporariamente via RPC (ex.: para 1) com 2+ elegíveis é
   muitíssimo mais barato que criar 51 titulares — e prova a mesma propriedade. O cap é config
   alterável sem deploy; usar isso.

**Teardown, duas disciplinas para dois propósitos:**

- **No smoke:** subtransação encerrada por `RAISE EXCEPTION` própria (ex.: `P46B0`), que o Postgres
  reverte inteira — inclusive DDL. Método exercitado em PROD [VERIFIED: 20260805000006:847-849].
  ⚠ E a lição nº 6 dos sete portões: **nenhuma asserção pode ser posicionada DEPOIS do rollback da
  própria fixture** — ela mediria um estado que ela mesma destruiu e reprovaria em toda execução,
  com o motor certo.
- **Durante os 14 dias de dry-run:** a fixture tem de **sobreviver**, logo não pode ser revertida.
  Teardown vira passo explícito e nomeado, e as linhas têm de ser greppáveis pelo namespace do
  e-mail. ⚠ Verificar contaminação de `v_triagem_panel`, da fila do RH e do snapshot de bias k=5
  antes de deixá-la viva.
- ⚠⚠ **Em `modo='live'` a fixture é DESTRUÍDA — e isso é a prova.** Ela precisa ser recriada antes
  de cada teste de modo live, e a conta do Auth é hard-deleted. Orçar esse custo no plano.

### Sampling Rate

- **Per task commit:** `npm run lint && npm run test:run`
- **Per wave merge:** o smoke da fase por MCP `execute_sql`, **numa única chamada**, mais os três
  smokes herdados afetados (`p42_invent05_cron`, `p43_previa`, `p45_motor_exclusao`)
- **Phase gate:** suíte completa verde + `46-VERIFICATION.md` com veredito (nunca ausente/`draft`)
  + code review bloqueante **antes** do apply em PROD + zero `--no-verify`

### Wave 0 Gaps

- [ ] `supabase/tests/p46_purga_smoke.sql` — cobre PURGA-01..07 e RETEN-05
- [ ] Emenda em `supabase/tests/p42_invent05_cron_smoke.sql` (a): instantâneo `<> 3` → invariante
- [ ] Re-pin de `supabase/tests/p43_previa_smoke.sql` (e): `ddfa6542921d241323c0124fc1bd1f99` → novo
- [ ] Decisão sobre `p43_previa_smoke.sql` (f) se `previa_retencao_total` for rewired (§Q5)
- [ ] Re-pin de `supabase/tests/p45_motor_exclusao_smoke.sql` (C3) se Saída B do Blocker B-01
- [ ] `supabase/functions/purgar-retencao/` + testes Deno
- [ ] **Linha de `exclude` em `vite.config.ts` ANTES de criar a pasta de testes da EF** (Pitfall 12)
- [ ] Entrada `[functions.purgar-retencao]` em `supabase/config.toml`
- [ ] Migration/script da fixture, com teardown escrito antes da criação

## Security Domain

Esta fase é **candidata obrigatória** a `/gsd-secure-phase` (ROADMAP): automação destrutiva
não-supervisionada, com cap e kill switch como controles de **segurança**, não de conveniência.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V1 Architecture | **sim** | Ordem `Storage → Postgres → Auth` imposta pelo banco, não pela plataforma; ledger como evidência da ordem |
| V2 Authentication | **sim** | EF com `verify_jwt=false` + Bearer do Vault (mirror `cost-alerter`); ⚠ Blocker B-01 é uma decisão de autenticação de máquina |
| V3 Session Management | não | Não há sessão de usuário no caminho da purga — e é exatamente esse o problema do Blocker B-01 |
| V4 Access Control | **sim** | `REVOKE` nominal de `anon`/`authenticated`; guard NULL-safe por `IS DISTINCT FROM` no corpo de toda função DEFINER; o payload seleciona, o banco autoriza (Pitfall 11) |
| V5 Input Validation | **sim** | Vocabulário fechado por `CHECK` (`modo`, `veredito`, `ancora_origem`); `format('%I')`/`USING` para qualquer identificador dinâmico [VERIFIED: 20260805000005:276, :317] |
| V6 Cryptography | não | Nenhuma operação criptográfica nova; segredos ficam no Vault e nunca são logados [VERIFIED: 20260727000001:113-116] |
| V7 Error Handling & Logging | **sim** | `ERRCODE` próprio por classe de recusa; ⚠ nenhum `RAISE`/`NOTICE` pode carregar PII nem valor de segredo |
| V8 Data Protection | **sim** | O ledger não pode reintroduzir o dado apagado (Pitfall 9); asserção sobre o CATÁLOGO, não sobre uma execução |
| V10 Malicious Code | **sim** | O corpo do cron é literal no banco e comparável por `md5(command)` — é o que torna um corpo alterado fora do repositório detectável (o `processo-origem-do-drift-desconhecida` segue aberto) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Cron destrutivo com predicado quebrado apagando em silêncio | Denial (irreversível) | Cap + abort integral (D-46-08); `elegiveis > 0` obrigatório no critério de flip |
| Predicado que para de apagar em silêncio (`NOT IN` + NULL) | Repudiation | `NOT EXISTS` correlacionado; degrau final NOT NULL; smoke que assere a ausência de `NOT IN` |
| Guard DEFINER falhando ABERTO para chamador sem claim | Elevation of Privilege | `IS DISTINCT FROM` em toda comparação de papel; asserção por execução com claim ausente |
| `anon` com EXECUTE por `pg_default_acl` | Elevation of Privilege | `REVOKE ... FROM PUBLIC, anon, authenticated` **nominal** em toda função nova |
| Forjar quem é purgado pelo payload do POST | Tampering (T-32-03) | O payload seleciona, o banco autoriza; encontro re-verificado em RPC DEFINER |
| Flip para `live` como efeito colateral de deploy | Tampering | Modo em tabela, escrita só por RPC auditada, transição recusável no servidor (D-46-05, PURGA-04) |
| Ledger virando novo repositório de PII | Information Disclosure | Banlist de colunas aferida no catálogo (Pitfall 9) |
| Corpo do job alterado fora do repositório | Tampering | `md5(cron.job.command)` comparado contra a migration — o idioma já existe [VERIFIED: p42_invent05_cron_smoke.sql:117] |
| Cron parado ⇒ política de retenção inexistente sem sinal | Repudiation (compliance) | Heartbeat no ledger em toda execução (Pitfall 5) |

## Project Constraints (from CLAUDE.md)

| Directive | Consequência para esta fase |
|---|---|
| `supabase db push` sofre `42601` com corpos `$$` adjacentes a `COMMENT`/`REVOKE`/`GRANT` | Todas as migrations desta fase têm essa combinação. **Sem wrapper `BEGIN;/COMMIT;`**, e o apply é por MCP `apply_migration` pelo orquestrador |
| **NUNCA** usar `supabaseAdmin`/service_role no client-side | A EF nova é o único lugar com service_role; nada em `src/` toca a purga (a fase não tem UI) |
| Operações privilegiadas vão para Edge Functions | Storage e Auth: sim. Postgres: RPC, porque a EF não tem transação |
| RLS habilitada em 100% das tabelas com dados de usuário | `retencao_hold`, `purga_execucoes`, `purga_execucao_itens`, `config_purga` — todas com RLS ligada e **zero policy de escrita** |
| Enums DB em snake_case pt-BR | `modo`, `veredito`, `ancora_origem` — vocabulário fechado por `CHECK`, em pt-BR |
| `database.types.ts` **NUNCA** editado à mão | `npm run db:types` após as migrations |
| Linguagem de produto: "avaliação comportamental/cognitiva" | Sem superfície de produto nesta fase, mas vale para qualquer `COMMENT` legível por humano |
| Sistema NUNCA rejeita candidato automaticamente por score | Ortogonal, mas a purga também não pode ser confundida com decisão — o ledger cita política, nunca mérito |

## Sources

### Primary (HIGH confidence) — lidos nesta sessão
- `supabase/migrations/20260801000004_p43_previa_retencao.sql` (401 linhas, integral) — o predicado único, a data-âncora, as exceções abertas
- `supabase/migrations/20260801000002_p43_config_retencao.sql` (479 linhas, integral) — o molde de config auditada por RPC
- `supabase/migrations/20260727000001_p41_recon_retry.sql` (227 linhas, integral) — cron idempotente + hop Vault/`pg_net`
- `supabase/migrations/20260805000006_p45_anonimizar_candidato.sql` (linhas 180-500, 740-850, 1860-1877) — o guard de três metades, o terminador `P45DR`, o `COMMENT` que declara a obrigação do chamador
- `supabase/migrations/20260805000001_p45_pedido_exclusao.sql` (linhas 210-319) — os `CHECK` de `situacao`/`causa` e os carimbos
- `supabase/migrations/20260804000002_p44_solicitacoes_dados.sql` (linhas 85-200) — a tabela de que o guard de intenção depende
- `supabase/migrations/20260721000001_notificacoes_enviadas.sql` (linhas 60-158) — as FKs CASCADE, `criado_em` NOT NULL, o `COMMENT` a reescrever
- `supabase/migrations/20260730000005_p42_invent05_not_exists.sql` (linhas 40-137) — o único `DELETE` em cron e o idioma `NOT EXISTS`
- `supabase/functions/executar-direito-titular/index.ts` (linhas 380-560, 680-1080) — o executor de três sistemas e o padrão de clients
- `supabase/tests/p43_previa_smoke.sql`, `p45_motor_exclusao_smoke.sql`, `p42_invent05_cron_smoke.sql`, `p43_matriz_retencao_smoke.sql` — os pins, as asserções que vão reprovar, o idioma de invariante
- `docs/compliance/cron-inventory.md` (246 linhas, integral) — os 3 jobs vivos e o mandato de re-coleta
- `docs/compliance/backup-posture.md` (linhas 1-60) — Storage sem backup
- `database.types.ts` (linhas 940-1000, 5552-5610) — os enums e as nulidades das colunas
- `vite.config.ts`, `package.json`, `supabase/config.toml`, `.planning/config.json`

### Secondary (MEDIUM confidence) — docs oficiais
- Supabase — pg_net: https://supabase.com/docs/guides/database/extensions/pg_net (transacionalidade, `net._http_response`, TTL de 6 h)
- Supabase — Cron quickstart: https://supabase.com/docs/guides/cron/quickstart (`job_run_details` sem limpeza automática, GMT)
- Supabase — Cron: https://supabase.com/docs/guides/cron (≤ 8 jobs concorrentes, ≤ 10 min por job)
- Supabase — pg_cron debugging: https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz (worker morto, ≤ 32 concorrentes, < 1.6.4 sem auto-revive)
- Supabase — Edge Function limits: https://supabase.com/docs/guides/functions/limits (150 s / 400 s, CPU 2 s, gateway 150 s)
- pg_cron upstream: https://github.com/citusdata/pg_cron (uma instância por job; segunda disparada é enfileirada; `cron.timezone` = GMT)
- pg_net upstream: https://github.com/supabase/pg_net (fila UNLOGGED, timeouts padrão)
- PostgreSQL — Trapping Errors: https://www.postgresql.org/docs/current/plpgsql-control-structures.html (subtransação implícita, variáveis locais sobrevivem, `OTHERS` não captura `QUERY_CANCELED`)

### Tertiary (LOW confidence)
- Supabase — Timeouts: https://supabase.com/docs/guides/database/postgres/timeouts (via WebSearch — `anon` 3 s, `authenticated` 8 s, `postgres` capado em 2 min). Confirmar por `SHOW statement_timeout` no contexto do cron antes de dimensionar o sweep.

## Metadata

**Confidence breakdown:**
- Substrato in-repo (predicado, motor, cron, ledger, smokes): **HIGH** — cada afirmação vem de um arquivo aberto com `Read` nesta sessão, com linha citada e trecho verbatim
- Blocker B-01: **HIGH** — o guard e o `COMMENT` que o declara foram lidos verbatim; ⚠ a inferência de que `auth.uid()` é NULL sob `pg_cron` é `[ASSUMED A3]` e precisa de uma medição de 10 segundos
- Mecânicas de `pg_cron`/`pg_net`/Edge Functions: **MEDIUM** — docs oficiais, sem execução contra a instância deste projeto
- Estado vivo (matriz, jobs, contagens): **MEDIUM** — lido de artefatos datados (`cron-inventory.md` é de 2026-07-29 e ele próprio manda re-coletar); nenhuma consulta ao banco foi feita nesta sessão (subagentes não têm MCP Supabase)
- Arquitetura recomendada (um post por titular, cap na mesma transação, heartbeat): **MEDIUM** — derivada de propriedades documentadas, não exercitada

**Research date:** 2026-08-22
**Valid until:** 2026-09-21 (30 dias) — **exceto** o inventário de cron e o estado da matriz de
retenção, que são fotografias e devem ser re-coletados no primeiro plano da fase.
