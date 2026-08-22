# Phase 46: Purga Automática (dry-run → live) - Context

**Gathered:** 2026-08-22
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 áreas cinzentas, 16 decisões, todas aceitas pelo operador

<domain>
## Phase Boundary

O dado expira sozinho, dentro de um cerco — e a primeira coisa que a purga faz em produção é
**não apagar nada**.

Esta fase entrega a automação de retenção: o predicado de política completo, o cerco operacional
(modo/cap/kill switch), o cron, o executor e o ledger. Ela consome duas peças já pagas e provadas:

- `public.candidaturas_alem_da_janela()` (Phase 43 / migration `20260801000004`) — **a única
  definição do predicado**, cujo `md5(prosrc)` o smoke `p43_previa_smoke.sql` pina. A Phase 46
  **chama** essa função; nunca copia o corpo, nunca reescreve "só a parte que interessa", nunca
  inlina o `JOIN`. Uma segunda cópia é como o dry-run passa a mentir sobre a purga sem que
  ninguém perceba.
- `public.anonimizar_candidato()` + EF `executar-direito-titular` (Phase 45) — o motor destrutivo
  **exercitado em produção em 2026-08-22**, `45-VERIFICATION.md` com veredito `passed`, 5/5.

**Fora do escopo desta fase:** o `DROP` de `autorizacao_analise_video` (CONSENT-05 → Phase 47),
as páginas públicas de transparência (TRANSP → Phase 47), e qualquer alteração na fila do RH.

**Portão de fase destrutiva: INTEGRAL.** Os 5 itens são condição de fechamento — `VERIFICATION.md`
com veredito (nunca ausente/`draft`) · code review bloqueante **antes** do apply em PROD ·
asserções **negativas** (o que NÃO aconteceu) · **zero `--no-verify`** · dry-run/rollback
exercitado pela **mesma query** do delete real.

</domain>

<decisions>
## Implementation Decisions

### Área 1 — Política do predicado: as exceções que a Phase 43 deixou abertas

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

### Área 2 — O cerco: modo, cap, kill switch

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

### Área 3 — O cron e a execução

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

### Área 4 — Ledger e RETEN-05

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

### Área 5 — Emendas pós-pesquisa (operador, 2026-08-22)

A `46-RESEARCH.md` levantou um bloqueador arquitetural que o discuss não previa, e as medições
read-only contra PROD abaixo o converteram de hipótese em fato. As duas decisões seguintes foram
tomadas pelo operador **depois** dessas medições.

- **D-46-18: Blocker B-01 resolvido pela SAÍDA B — um quarto ramo autorizado no guard de
  `public.anonimizar_candidato`.**

  **O problema, medido:** o guard tem três metades
  (`20260805000006_p45_anonimizar_candidato.sql:340-449`) — (a) sessão (`auth.uid()` não-NULL),
  (b) papel (`administrador` ou o próprio titular), (c) intenção (linha viva em
  `solicitacoes_dados` com `tipo='exclusao'`, `situacao='executando'`). Um cron não tem nenhuma
  das três. **Medição em PROD, 2026-08-22:** como `postgres` sem claims,
  `auth.uid() → NULL`, `auth.jwt() #>> '{app_metadata,role}' → NULL`,
  `current_setting('request.jwt.claims', true) → NULL`. As três metades recusam com `42501`.
  Isto fecha `[ASSUMED A3]` da RESEARCH por execução, não por leitura.

  **A decisão:** o guard ganha um ramo `OR` que aceita o chamador **exclusivamente** quando
  existe item vivo em `purga_execucao_itens` para aquele `candidato_id`, sob execução com
  `purga_execucoes.situacao = 'executando'` **e** `modo_vigente = 'live'` **e** item ainda não
  concluído. Um `modo` que não seja `live` não autoriza nada.

  **As quatro obrigações que a tornam defensável — todas condição de aceite, não conselho:**
  1. Escrito no mesmo idioma do arquivo: `IS DISTINCT FROM` em comparação de papel, `NOT EXISTS`
     (jamais `NOT IN`) na verificação de estado, e **falha FECHADA** quando qualquer lado for NULL.
  2. Exige o estado que **só o motor da purga produz** — mesma tese da metade (c) atual.
  3. A migration carrega bloco de auto-verificação que **ABORTA o apply** se `authenticated`
     puder escrever em `purga_execucoes` / `purga_execucao_itens` — espelho verbatim de
     `20260805000006:1022-1027`, onde a mesma pergunta é feita ao catálogo sobre
     `solicitacoes_dados`. O pressuposto vira asserção.
  4. O re-pin do `md5(prosrc)` (hoje `8c86e0f040219e7eade47eb587dbf5de`, pinado em
     `supabase/tests/p45_motor_exclusao_smoke.sql:1591`) é registrado com **os dois lados
     medidos** (objeto vivo × arquivo), na disciplina do cabeçalho do próprio smoke (linhas
     217-263). ⚠ O re-pin **não pode** virar desculpa para afrouxar a asserção (Pitfall 2).

  ⚠ **Consequência para a decomposição:** a fase ganha um plano que **edita uma função destrutiva
  provada em produção**. Esse plano é candidato obrigatório a code review bloqueante próprio e é
  onde `/gsd-secure-phase` tem mais a dizer. Saída A (credencial de operador permanente) e Saída C
  (segundo motor) foram **recusadas** — a primeira por criar credencial standing capaz de destruir
  a PII de qualquer pessoa e por poluir a fila do RH com pedidos que ninguém fez; a segunda por
  contradizer D-46-12. — **Reversibility:** `one-way` na prática — reverter exige migration sobre
  função destrutiva viva.

- **D-46-19: A allowlist de estados elegíveis é `aprovado`, `rejeitado`, `decisao_final`.**
  Os outros cinco (`inscricao`, `triagem`, `avaliacao_assincrona`, `entrevista_online`,
  `entrevista_presencial`) nascem `elegivel_purga = false`. Allowlist, jamais denylist —
  PURGA-07 na letra.

  ⚠ **Isto MUDA O EFEITO de D-46-01, e a mudança é declarada, não silenciosa:** rascunhos ficam
  em `inscricao`, que não está na allowlist, logo **rascunho nunca é purgado automaticamente**.
  O mesmo vale para qualquer candidatura parada em funil ativo. Essa retenção indefinida é uma
  **lacuna nomeada** desta fase — ela tem de aparecer no `COMMENT` da coluna e no ledger de
  decisões, porque uma lacuna escrita é auditável e uma lacuna silenciosa é o próprio modo de
  falha que o PURGA-07 descreve ("o sistema acredita ter uma política funcionando e apaga zero").
  — **Reversibility:** `reversible` — é uma coluna de flag por linha de matriz.

- **D-46-20 (recomendação da pesquisa, aceita): a janela do RETEN-05 é escalar PRÓPRIO** em
  `config_purga` (`janela_notificacoes_meses`, 24), **não derivada** de `max(janela_meses)` da
  matriz. Derivar mudaria a retenção de notificações em silêncio no dia em que um admin
  encurtasse a janela de um estado, e a relação "notificação ↔ etapa" não existe no modelo.

- **D-46-21 (recomendação da pesquisa, aceita): duas fixtures, com propósitos diferentes** —
  uma **revertida** dentro do smoke, e uma **durável e namespaceada** para o período de dry-run,
  com **plano de teardown escrito ANTES de criá-la**.
  ⚠ Modo de falha da própria fixture, nomeado pela pesquisa: `updated_at` é o degrau (3) do
  `COALESCE` da data-âncora e nasce `now()` — **sem retrodatá-lo explicitamente a fixture rende
  zero e se autoderrota**.

- **D-46-22: a matriz em seed é item de checkpoint do flip, não detalhe.** Medição em PROD
  2026-08-22: **7 das 8 linhas seguem `origem='seed'` em 24 meses**; só `rejeitado` foi editado
  (18 meses, `origem='admin'`). O `COMMENT` da coluna, escrito dentro do banco
  (`20260801000002:174-177`), declara que a Phase 46 **não pode ligar a purga** enquanto houver
  linha em seed sem confirmação por estado. Portanto: **confirmar as 3 linhas da allowlist é
  pré-condição do flip `dry_run → live`**, somada às de D-46-14.

- **D-46-23: o smoke herdado `p42_invent05_cron_smoke.sql` é emendado NO MESMO COMMIT que cria o
  4º job.** Medição em PROD 2026-08-22: `cron.job` tem exatamente 3 (`ai-cost-aggregation`,
  `notif-retry-sweep`, `ai-logs-retention-cleanup`). A asserção (a) da linha 98 exige 3 e a
  mensagem de falha diz *"Um a mais = guard de remoção condicional falhou e o alvo ficou
  duplicado"* — ou seja, o 4º job faria um portão verde reprovar trabalho correto **com
  diagnóstico falso**. Emendar o smoke é parte da entrega, não limpeza posterior.

### Área 6 — Resolução da ambiguidade de escopo em D-46-18 (operador, 2026-08-22)

- **D-46-24: o 4º ramo do guard tem ESCOPO DUPLO.** Resolve a contradição que o planejador
  levantou em `46-04` Task 1 e **pré-resolve aquele `checkpoint:decision`** — o executor lê esta
  decisão em vez de perguntar de novo.

  **A contradição, dita na letra:** D-46-18 escreveu *"Um `modo` que não seja `live` não autoriza
  nada."* Lido literalmente, isso recusa **o próprio laço de dry-run** durante os 14 dias inteiros
  da janela `dry_run`, e torna a asserção (b) da `46-VALIDATION.md` — *"o loop de dry-run termina
  em `P45DR` e zero coluna mutou"* — **impossível de satisfazer**. Ou seja: a frase, aplicada ao
  pé da letra, produziria exatamente o **dry-run decorativo** que o SC#1 desta fase existe para
  proibir, e que o P39/CR-02 já embarcou uma vez neste projeto.

  **A resolução:**
  - **Caminho de DRY-RUN** (o laço que termina em `RAISE ... USING ERRCODE = 'P45DR'`, revertendo
    a subtransação inteira): autorizado sob `modo IN ('dry_run', 'live')`.
  - **Caminho DESTRUTIVO** (a execução real que muta Storage/Postgres/Auth): autorizado
    **exclusivamente** sob `modo = 'live'`.
  - `modo = 'off'` **não autoriza nenhum dos dois** — é o kill switch de D-46-06, e continua sendo.

  **Por que isto não afrouxa o guard:** a assimetria não é nova, é a que a **metade (b) do guard
  já tem hoje** entre o ramo destrutivo e o não-destrutivo
  (`20260805000006_p45_anonimizar_candidato.sql:397-403` — o `ELSE` que exige `administrador` ou o
  próprio titular vale só para a anonimização REAL). O escopo duplo **espelha** essa forma em vez
  de inventar uma. **Nenhuma capacidade destrutiva ganha permissão nova**: o que o ramo passa a
  autorizar fora de `live` é um caminho cujo efeito o Postgres reverte por construção.

  ⚠ **Obrigação de aceite:** as duas metades do ramo têm de ser **fisicamente distintas** no
  código — nunca um só predicado com `modo IN (...)` que sirva aos dois caminhos. Um único
  predicado compartilhado é como, numa edição futura, o caminho destrutivo herda em silêncio a
  permissão do caminho reversível. O smoke assere as duas separadamente: ⊖ sob `dry_run` o
  caminho destrutivo **recusa**; sob `dry_run` o caminho de dry-run **passa** e não muta coluna.
  — **Reversibility:** `costly` — é uma edição em função destrutiva viva.

### Claude's Discretion

- Nomes exatos de funções, tabelas e colunas, respeitando as convenções do projeto
  (snake_case pt-BR para domínio).
- Decomposição em planos e ordenação interna dos checkpoints.
- Forma concreta do sinal quando o cap é excedido (linha de ledger + qual canal).
- Estrutura interna do payload do `net.http_post` e do contrato da EF.
- Layout dos smokes e das asserções negativas, respeitado o mínimo do portão destrutivo.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`public.candidaturas_alem_da_janela()`** — `20260801000004_p43_previa_retencao.sql`. A única
  definição do predicado. `STABLE SECURITY DEFINER SET search_path = ''`. Devolve
  `(candidatura_id, candidato_id, etapa)`. Data-âncora em 4 degraus terminando em coluna
  **NOT NULL** (`data_candidatura`) — o degrau final é load-bearing: se a ladeira resolvesse para
  NULL, `NULL + interval < now()` avaliaria NULL e a candidatura sairia **silenciosamente** da
  contagem. **A Phase 46 é a primeira consumidora real deste predicado.**
- **`public.previa_retencao()` / `previa_retencao_total()`** — agregados read-only sobre o mesmo
  predicado. Devolvem zero hoje por aritmética.
- **`public.anonimizar_candidato(...)`** — `20260805000006`. `VOLATILE SECURITY DEFINER`, devolve
  `jsonb` com resultado, plano e contagens por passo. **Exercitado em PROD 2026-08-22.**
- **`public.plano_exclusao_titular(p_candidato_id uuid) RETURNS jsonb`** — `20260805000005`. O
  plano/dry-run por titular; a peça que dá ao dry-run da purga a **mesma expressão** do delete.
- **EF `executar-direito-titular`** — o executor Storage → Postgres → Auth, com detecção de blob
  órfão (`achados_resumo.blob_orfao`) provada em produção.
- **`public.varrer_retry_notificacoes()` + job `notif-retry-sweep`** — `20260727000001`. O padrão
  de cron a espelhar: `cron.unschedule` guardado por `WHERE EXISTS` antes do `cron.schedule`;
  hop `net.http_post` + Vault; falha silenciosa que não derruba o cron.
- **`public.config_retencao_etapa` + `salvar_janela_retencao(...)` + `listar_matriz_retencao()`** —
  `20260801000002`. O padrão de config auditada por RPC (não por policy de UPDATE), com guard
  server-side sobre o teto e trilha atômica.
- **`public.ler_resend_webhook_secret()`** — o idioma de leitura de Vault totalmente qualificada.

### Established Patterns

- **Idioma NULL-safe de exceção:** sempre `NOT EXISTS`, **jamais** `id NOT IN (…)`. Origem:
  INVENT-05 / `20260730000005`. Foi literalmente este bug, do outro lado do mesmo predicado.
- **Guard NULL-safe por `IS DISTINCT FROM`** e `REVOKE` que **NOMEIA `anon`** — o
  `pg_default_acl` deste schema concede EXECUTE a `anon` como grant **direto** em todo
  `CREATE FUNCTION`; revogar só de `PUBLIC` **não remove nada**. Origem: `20260801000002`.
- **`SECURITY DEFINER SET search_path = ''`** com todos os objetos totalmente qualificados.
- **Migrations sem wrapper `BEGIN;/COMMIT;`** — o driver já envolve cada uma em transação
  implícita, e o par externo é o gatilho do SQLSTATE 42601 quando há corpos `$$` adjacentes a
  `COMMENT`/`REVOKE`/`GRANT`/`cron.schedule`. Ver CLAUDE.md §Migrations.
- **Tabela de config com seed idempotente** (`ON CONFLICT DO NOTHING`) + `CHECK` na tabela
  **e** guard na RPC — dupla camada deliberada.
- **Smoke SQL por fase** em `supabase/tests/p<NN>_*_smoke.sql`, com asserções nomeadas por letra e
  `RAISE EXCEPTION` descritiva. Ver `p45_motor_exclusao_smoke.sql` (24/24 em PROD) e
  `p43_previa_smoke.sql` (pin de `md5(prosrc)`).

### Integration Points

- **`supabase/migrations/`** — próximas versões a partir de `20260822xxxxxx` (a última aplicada é
  `20260822000001_p47_check_evento_vocabulario.sql`).
- **`supabase/functions/purgar-retencao/`** — EF nova, ao lado de `executar-direito-titular`.
  `supabase/functions/_shared/` para o que já existe.
- **`cron.job`** — o job novo convive com `notif-retry-sweep` e com o cron da prompt library
  (`20260609000003`).
- **Vault** — `project_url` e `edge_invoke_key` já existem; nenhum secret novo é necessário.
- **`public.notificacoes_enviadas`** — o `COMMENT ON TABLE` da linha 144 do `20260721000001`
  precisa ser reescrito quando RETEN-05 fechar.
- **UI: nenhuma.** O ROADMAP é explícito — "não é frontend; trabalho de cron/ops/DB". Se surgir
  uma leitura RH do ledger, é derivada, não a entrega.

### ⚠ Protocolo de apply — restrição operacional herdada, medida 3× na Phase 42

`supabase db push` é **proibido neste projeto**. O apply é **exclusivamente por MCP
`apply_migration`, pelo ORQUESTRADOR** — subagentes GSD não recebem os tools MCP do Supabase
(bug upstream `anthropics/claude-code#13898`). Duas consequências que **têm de** entrar em cada
plano que aplica migration:

1. **`apply_migration` carimba a própria `version`** (timestamp do instante do apply, não o do
   nome do arquivo). A linha **precisa** ser reparada com `UPDATE
   supabase_migrations.schema_migrations SET version = '<do arquivo>' WHERE name LIKE '%<slug>%'`.
   Sem o reparo, a ordenação do ledger diverge da dos arquivos.
2. **O ledger guarda o SQL literalmente aplicado.** A fidelidade é **provável, não garantida**:
   duas das cinco migrations do M8 chegaram a PROD com os comentários descartados. Conferir
   `md5(statements[1])` contra o `md5` do arquivo, com conferência cruzada.

</code_context>

<specifics>
## Specific Ideas

- **O dry-run tem de ser gerado pela MESMA expressão do delete real.** Não "uma query
  equivalente", não "o mesmo `WHERE` copiado" — a **mesma chamada de função**. A asserção (f) do
  smoke da Phase 43 já exige que os wrappers CHAMEM `candidaturas_alem_da_janela()`, e a asserção
  (e) pina o `md5` do corpo. A Phase 46 herda o requirement **satisfeito por construção** se
  respeitar isso, e o gate de md5 reprova quem tentar criar a segunda cópia.

- **`previa_retencao()` devolve ZERO por aritmética.** Qualquer plano que trate a contagem atual
  como sinal de correção está errado. O predicado é **não-exercitado**; a Phase 46 é a primeira
  a exercitá-lo, e a fixture de conjunto não-vazio (D-46-14) é o que o torna exercitado.

- **Espelho de disciplina da Phase 45 que vale repetir:** as 3 tabelas de IA/alertas estavam
  VAZIAS em PROD durante a verificação da 45, e sem as fixtures as asserções sobre as 5 tabelas
  `SET NULL` teriam passado **por vacuidade**. Toda asserção desta fase precisa responder à
  pergunta "isto passaria se o conjunto fosse vazio?" antes de contar como prova.

- **Asserções negativas obrigatórias** (o portão exige "o que NÃO aconteceu"), no mínimo:
  `modo = off` não apagou nada · `modo = dry_run` não apagou nada e o `net._http_response` não
  subiu · conjunto acima do cap não apagou nada · o ledger não contém e-mail/nome/CPF · a trilha
  de decisão humana (`historico_candidatura`, `decisao_final`) sobreviveu · candidatura com
  revisão do Art. 20 em aberto não foi tocada · candidatura em `retencao_hold` não foi tocada ·
  candidatura de vaga aberta não foi tocada.

- **`/gsd-secure-phase` é candidata obrigatória** para esta fase (ROADMAP): automação destrutiva
  não-supervisionada, com cap e kill switch como controles de **segurança**, não de conveniência.

</specifics>

<deferred>
## Deferred Ideas

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

</deferred>
