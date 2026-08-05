# Phase 45: Motor de Exclusão & Anonimização - Context

**Gathered:** 2026-08-04
**Status:** Ready for planning

<domain>
## Phase Boundary

O candidato pede que seus dados sejam apagados e isso acontece de verdade — irreversivelmente,
na ordem imposta pela plataforma (`Storage → Postgres → Auth`), **sem levar junto a trilha de
decisão humana que a RNF-07a existe para proteger**.

⚠️ **FASE DE MAIOR RISCO DO MILESTONE.** Mutação de três sistemas genuinamente **não-atômica**,
**sem transação compartilhada**, sobre PII viva. Portão de fase destrutiva do M8 aplica-se
**integralmente**; `/gsd-secure-phase` é **obrigatório**.

**Fora de escopo:** a purga automática por cron (Phase 46) e as páginas públicas de
transparência (Phase 47). Esta fase entrega o MOTOR e o fluxo do titular, não o agendador.

</domain>

<decisions>
## Implementation Decisions

### Janela de arrependimento

- **D-45-01:** A janela é de **15 dias**, cancelável pelo próprio titular no painel.
  Escolhido para **espelhar o prazo do Art. 19, II** que a Phase 44 já usa na fila do RH:
  uma só constante governa o SLA de acesso e a janela de cancelamento, então há **uma fonte a
  auditar em vez de duas a divergir**. — **Reversibility:** `costly` — o número vira copy visível
  ao titular, valor de configuração e predicado de execução; mudá-lo depois exige tocar os três e
  reconciliar pedidos já enfileirados sob a janela antiga.

### BD-9 — a justificativa do recrutador em `decisao_final`

- **D-45-02:** **Preservar ANONIMIZADA.** O texto sobrevive como prova de não-discriminação
  (Art. 7º, VI / RNF-07a); o **vínculo com o titular, não**. Implica tratar a coluna por
  **tombstone/desvinculação**, nunca por `DELETE`.
- **D-45-03:** A mesma regra vale para **`decisao_final_historico.justificativa`**. Sem isso o
  histórico entrega exatamente o que a linha corrente protege — o mesmo raciocínio que a Phase 44
  aplicou ao excluir as duas colunas do export em par. — **Reversibility:** `one-way` — uma vez
  desvinculada em produção não há caminho de volta ao titular; é o efeito pretendido.

### k-anonymity no `gerar_bias_snapshot()`

- **D-45-04:** **Suprimir células com menos de 5 candidatos** (k=5, limiar clássico de
  k-anonymity). A célula suprimida tem a **presença declarada e a contagem oculta** — some o
  número, não o fato de a faixa existir.
- **D-45-05:** O `small_sample_warning` atual (**< 30**, `20260625100001_decisao_final_phase15.sql:374`)
  **permanece como sinal separado**. São coisas diferentes e não devem colapsar num só número: o
  `< 30` é sinal **estatístico** (a razão 4/5 é instável), o `< 5` é controle de
  **re-identificação**. Hoje o código só SINALIZA e nunca suprime — é essa a lacuna que a fase fecha.
- **Por que agora:** depois da anonimização a coorte encolhe, e uma faixa com 1–2 candidatos mais o
  desfecho de seleção re-identifica a pessoa dentro de um relatório que existe justamente para
  provar não-discriminação. — **Reversibility:** `reversible` — é um predicado no corpo da RPC.

### Candidatura em andamento no momento do pedido

- **D-45-06:** Pedir exclusão **encerra automaticamente as candidaturas em andamento** (equivale a
  "retirar candidatura" em todas) **e o RH é notificado**. A janela de 15 dias corre a partir daí.
- **D-45-07:** A alternativa "esperar o funil fechar sozinho" foi **rejeitada explicitamente**: um
  funil parado deixaria o pedido pendente **indefinidamente**, e o Art. 18 não tem cláusula de
  "quando der".
- **D-45-08:** A notificação ao RH exige **um evento novo** no vocabulário fechado de notificações
  — que é fechado em **dois lugares**: no código da EF `notificar-candidato` **e** numa
  **CHECK constraint no banco**. ⚠ Este é o mesmo arquivo que já embarcou 2 defeitos CRÍTICOS em
  produção (P39 CR-01/CR-02); a edição é cirúrgica e os dois lados têm de mudar juntos.
  — **Reversibility:** `costly` — o vocabulário fechado exige migration para reverter.

### Auth: hard delete, não soft delete — **medido, não assumido**

- **D-45-09:** A exclusão do usuário do Auth usa **hard delete** (`shouldSoftDelete = false`).
  **Medição read-only contra PROD em 2026-08-04** (o ROADMAP mandava medir e nunca assumir):

  ```sql
  CREATE UNIQUE INDEX users_email_partial_key
    ON auth.users USING btree (email) WHERE (is_sso_user = false)
  ```

  O predicado parcial é **`is_sso_user = false`**, **NÃO** `deleted_at IS NULL`. Ou seja: **no
  nível do banco, uma linha soft-deletada continua ocupando o slot único do e-mail.** Se o GoTrue
  não embaralhar o endereço ao soft-deletar, aquele e-mail fica **barrado para sempre**.

  Soft delete falharia a LGPD **duas vezes**: (i) o e-mail — que é PII — sobrevive em `auth.users`;
  (ii) a pessoa fica silenciosamente impedida de voltar a usar o serviço. Hard delete é também o
  que o **SC#3 já exige** ("o usuário do Auth deixa de existir"), e torna a incógnita restante
  (o GoTrue embaralha ou não?) **irrelevante por desenho**. `auth.users` tem 29 linhas e
  **0 soft-deletadas** — o caminho nunca foi exercitado neste projeto.
  — **Reversibility:** `one-way` — é o ponto da fase.

### PITR — risco aceito, datado

- **D-45-10:** **PITR NÃO será ligado** (decisão de gasto do operador, 2026-08-04).
  ⚠⚠ Consequência não-negociável: a fase executa mutação irreversível sobre PII viva com backup de
  **7 dias que EXCLUI STORAGE INTEIRAMENTE**. Um CV apagado por engano é **irrecuperável por
  qualquer meio** — não há segunda rede. Portanto o **dry-run deixa de ser processo e passa a ser
  o mecanismo de segurança**: nenhum apply destrutivo em PROD sem dry-run pela **MESMA query** do
  delete real, asserções negativas e code review bloqueante antes do apply.

### Travadas APÓS a pesquisa (operador, 2026-08-04) — as três que a `45-RESEARCH.md` escalou

> Não são refinamentos de discuss: a pesquisa **mediu o catálogo vivo** e encontrou um estado que
> torna o ERASE-10 inexecutável hoje. As três foram respondidas com a recomendação do researcher.

### `candidatos.user_id` — a FK que hoje garante o pior desfecho

- **D-45-11: saída S1** — `ALTER COLUMN user_id DROP NOT NULL` + FK recriada `ON DELETE SET NULL`.

  **O que a pesquisa mediu:** `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE
  CASCADE`, com o `CASCADE` **confirmado vivo em `pg_constraint`** — o repositório de migrations diz
  `SET NULL` e é **ficção**. Logo `UPDATE candidatos SET user_id = NULL` viola `NOT NULL`, e
  `gen_random_uuid()` viola a FK (23503). O ERASE-10 não é executável hoje.

  ⚠ **E a falha não é benigna.** Com `CASCADE` vivo, `deleteUser` cascateia `candidatos` →
  `candidaturas` → bate nas 3 FKs `NO ACTION` → 23503 → rollback → `500 Database error deleting
  user`. Se isso acontece **depois** do passo 1, o estado final é **currículo apagado do Storage
  (irrecuperável — sem PITR, sem backup de Storage) e 100% da PII do titular intacta no banco**.
  É o pior estado alcançável na fase, e hoje é o desfecho **garantido** de qualquer implementação
  que chame `deleteUser` sem tratar esta FK.

  **Por que S1:** o tombstone seta `NULL` (o índice `UNIQUE` aceita múltiplos NULLs — NULLs são
  distintos em Postgres), **e a FK vira rede**: um `deleteUser` fora de ordem passa a deixar órfão
  em vez de cascatear. Reconcilia o drift que o próprio repositório já descrevia.

  **Custos aceitos, a auditar no plano:** `database.types.ts` passa a `user_id: string | null` e os
  consumidores que assumem non-null precisam de varredura. Efeito colateral **desejado e medido**:
  a policy own-row de `solicitacoes_dados` (`candidato_id IN (SELECT id FROM candidatos WHERE
  user_id = auth.uid())`) deixa de casar com qualquer sessão depois do tombstone — dizer isso no
  plano, não descobrir depois.
  — **Reversibility:** `one-way` — migration destrutiva de schema sobre tabela viva. **Candidato
  número 1 a code review bloqueante + dry-run**, pelo portão destrutivo do M8.

### O canal do recibo — a PII que sobreviveria à própria exclusão

- **D-45-12: saída R1** — o recibo **não** entra em `notificacoes_enviadas`. Prova de envio é
  `solicitacoes_dados.recibo_enviado_em`; idempotência é essa coluna + header `Idempotency-Key`
  no Resend.

  **O que a pesquisa mediu, e é mais duro que a UI-SPEC descrevia:** `notificacoes_enviadas` tem
  `destinatario_email` **e** `destinatario_original`, ambos `NOT NULL` — o endereço é gravado
  **duas vezes por linha** — e exige `candidatura_id NOT NULL` + `candidato_id NOT NULL`. O recibo
  de exclusão é evento **de conta**; a tabela onde ele "deveria" ser registrado exige uma
  candidatura.

  **Por que R1:** elimina o problema na origem — nenhum endereço do titular é persistido pelo
  recibo. **Custo aceito:** perde bounce/reclamado para este e-mail específico. Defensável porque
  o recibo não tem retry útil: depois do hard delete não há a quem re-tentar.

  ⚠ **Independente da saída, as linhas de ledger PREEXISTENTES do titular ainda precisam de
  tratamento** (o inventário classifica `destinatario_email`/`destinatario_original` como `apagar`)
  — **com sentinela, porque `NULL` viola `NOT NULL` e aborta a transação de anonimização inteira**.

  ⚠ **O endereço tem de ser lido ANTES do tombstone e usado DEPOIS do `deleteUser`** (o recibo é em
  tempo passado e afirma que a conta não existe mais). Persistir no `plano` e limpar no fecho —
  retomável, coerente com a filosofia do ERASE-04 — em vez de variável local da EF, que não
  sobrevive a um crash. **Decisão de plano, não de código.**

### O encerramento e a trilha de etapas

- **D-45-13: saída (a)** — o encerramento a pedido vive em `candidaturas` (coluna aditiva
  `encerrada_a_pedido_em`), **não** em `historico_candidatura`, e o plano documenta por quê.

  **Razão:** o trigger `avancar_etapa()` só dispara em `UPDATE OF etapa_atual` e é o **único
  escritor** de `historico_candidatura` — invariante estabelecida no M2/Phase 6. Escrever a linha à
  mão exigiria um RPC DEFINER que fura essa invariante e daria dois escritores àquela tabela, que
  toda leitura futura da trilha precisaria conhecer. A trilha segue contando **decisões de etapa**,
  que é o que a RNF-07a existe para proteger.

  ⚠ **As outras duas modelagens foram medidas e recusadas:** `deleted_at` some de **5 serviços de
  RH** e de `candidaturas_alem_da_janela()` (a candidatura encerrada nunca entraria na retenção da
  Phase 46); valor novo em `etapa_processo` deixa o encerrado **na fila de trabalho do RH**, faz a
  candidatura **desaparecer da retenção em silêncio** pelo INNER JOIN em `config_retencao_etapa`, e
  toca 19 arquivos de `src/`.

  **Dependência declarada, não a descobrir na Phase 46:** a cláusula de `encerrada_a_pedido_em`
  precisa ser acrescentada explicitamente a `candidaturas_alem_da_janela()`.

### Claude's Discretion

- Forma do tombstone (quais colunas viram quê), estrutura da fila de exclusão, mecânica de
  idempotência e retomabilidade, e o desenho do recibo em duas colunas — todos a cargo do
  research/planner, dentro dos SC do ROADMAP.
- Ordem interna dentro de cada sistema (o `Storage → Postgres → Auth` entre sistemas é fixo).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Estado vivo do schema — precedência sobre qualquer arquivo de migration
- `.planning/research/FK-AUDIT-LIVE.md` — **fonte de verdade** para qualquer questão de
  `ON DELETE`. Lê `pg_constraint`, não arquivos. ⚠ **Achado que redesenha esta fase:**
  `candidatos.user_id → auth.users` está vivo como **`ON DELETE CASCADE`**, e **não** como o
  `SET NULL` que a migration `20260421000001_rate_limit_duplicate_check.sql:193` declara — o
  `ADD COLUMN IF NOT EXISTS` virou no-op contra o schema legado. **Apagar o usuário do Auth
  cascateia para `candidatos` → `candidaturas` e destrói a linha em vez de deixar tombstone**,
  batendo então nas 3 FKs `NO ACTION` com **23503**. É por isso que a ordem
  `Storage → Postgres → Auth` é estrutural, não estilística: o tombstone e a quebra de `user_id`
  precisam acontecer ANTES do delete no Auth.
- `.planning/research/FK-AUDIT-LIVE.md` §"Onde PII sobrevive a um CASCADE" — as 5 FKs `SET NULL`
  do SC#3 (`ai_call_logs`, `candidate_ai_decisions`, `logs_acesso`, `recruiter_alerts`,
  `autorizacoes`). `ai_call_logs` está com **0 linhas** — risco hoje teórico, débito registrado.

### Insumo direto desta fase (Phase 44)
- `supabase/functions/_shared/exportAllowlist.ts` — o inventário **é** o plano de exclusão
  (30 tabelas, 365 colunas, `chave_titular` + `ligacao` por tabela). Gerado, nunca digitado.
- `docs/compliance/export-scope-rules.yaml` — as regras de escopo e os vereditos por coluna.
- `.planning/phases/44-exporta-o-acesso/44-VERIFICATION.md` — ⚠ **`gaps_found`**. O inventário
  existe e está versionado, mas a cláusula "exercitado em produção" **NÃO** está cumprida:
  nenhum export foi jamais produzido ponta a ponta. Ver STATE.md §Deferred Verification.

### O que NÃO pode ser tocado
- `supabase/migrations/20260625100001_decisao_final_phase15.sql` — `gerar_bias_snapshot()`
  (linhas 283-441). A idade é derivada por JOIN em `candidatos.data_nascimento` **no momento do
  snapshot** — por isso a faixa etária tem de ser **materializada no tombstone ANTES** de qualquer
  anonimização, ou a série histórica muda retroativamente (SC#5).
- `.planning/STATE.md` §"Decisões travadas para a Phase 45" — as três decisões do operador.
- CLAUDE.md §Security Rules — RNF-07a: o sistema **nunca** rejeita candidato automaticamente.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Fila + SLA da Phase 44** (`src/features/pedidos-dados/`): `solicitacoes_dados` já tem
  `tipo` com o valor `exclusao` previsto, e as RPCs `listar_pedidos_dados` /
  `contar_pedidos_dados_pendentes` já implementam guarda de papel **NULL-safe** (`IS DISTINCT FROM`,
  provada mordendo em 2026-08-04). O pedido de exclusão nasce na MESMA tabela.
- **Pipeline COMM do M7** (EF `notificar-candidato` + `notificacoes_enviadas`): base da
  notificação ao RH de D-45-06. `UNIQUE(dedupe_key)` já protege contra double-send.
- **`get-curriculo-url`** — molde estrutural de EF privilegiada (D-23 two-client,
  authenticate-THEN-authorize), já reusado com sucesso pela EF da Phase 44.

### Established Patterns
- **Migrations via MCP `apply_migration`** + reconcile do ledger após CADA apply. `db push` é
  proibido (42601 em corpos `$$`).
- **Anonimização = tombstone `UPDATE` in-place via RPC `SECURITY DEFINER`.** A extensão `anon`
  está **ausente do catálogo** e é não-instalável — não existe atalho.
- **`DELETE FROM storage.objects` via SQL órfã o blob permanentemente.** O único caminho para
  apagar o arquivo é a **Storage Admin API a partir de Edge Function**.

### Integration Points
- ⚠ **Subagentes GSD não recebem os tools MCP do Supabase** (premissa registrada do M8). Toda
  migration, inspeção PROD e deploy de EF é **checkpoint do orquestrador** — premissa de
  planejamento de wave, não descoberta de meio de fase.
- **Débito herdado que morde aqui:** a EF `exportar-meus-dados` está em PROD na **v1
  pré-correção** (cooldown que falha ABERTO); os 8 commits de fix estão no `main` e o redeploy
  não aconteceu. Ver STATE.md §Deferred Verification G2.

</code_context>

<specifics>
## Specific Ideas

- O recibo é **em duas colunas** — "o que foi apagado" / "o que foi mantido, anonimizado, sob qual
  artigo" — e o SC#5 é explícito: **sem superestimar o que foi feito**. Um recibo que afirma mais
  do que aconteceu é pior que nenhum recibo, numa peça cuja premissa inteira é honestidade.
- A distinção **"retirar minha candidatura"** (encerra o funil na hora) × **"apagar meus dados"**
  (enfileira, executa após a janela) tem de ser legível na tela, não inferível. É a superfície onde
  uma ambiguidade de copy vira **ação irreversível** — daí o UI hint forte para `/gsd-ui-phase`.

</specifics>

<deferred>
## Deferred Ideas

- **Purga automática por cron** — Phase 46, estritamente sequencial após esta. Cabear um cron a um
  motor destrutivo não provado é como um bug vira incidente.
- **Página pública "o que guardamos e por quê"** e o zumbi `data_deletion_log` — Phase 47.
- **`ai_call_logs` com 0 linhas** — ou não há chamadas de IA em PROD, ou o logging segue quebrado
  desde a P23. Fora do escopo do M8; vale um todo próprio.

### Reviewed Todos (not folded)
- `25-review-deferred.md` e `36-resend-chave-divergencia.md` casaram por palavra-chave genérica
  ("phase", "null", "decisão"), não por escopo real. **Não foram dobrados** — nenhum tem relação
  com exclusão/anonimização.

</deferred>

---

*Phase: 45-Motor de Exclusão & Anonimização*
*Context gathered: 2026-08-04*
