---
id: 37-drift-prod-tabelas-notificacao
created: 2026-07-22
source: Phase 36 / Plano 36-04 — reconcile do ledger de PROD
status: done
resolved_at: 2026-07-22
resolves_phase: 37
priority: blocking
tags: [drift, schema, migrations, ledger, notificacoes, rls, ledger-01, ledger-02, ledger-03, timeline-01]
---

> ⚠ **Documento histórico.** O corpo abaixo é o registro de como o drift foi descoberto
> e do retrato do banco em 2026-07-22, preservado **intacto** por valor forense —
> **inclusive as imprecisões da paráfrase original**. As correções estão na seção
> `## Resolução (Phase 37, 2026-07-22)`, ao final. Não leia o corpo isoladamente.

# P37 — Drift PROD→repo: as tabelas de notificação já existem em produção

**Descoberto:** 2026-07-22, durante o reconcile do ledger da Phase 36 (Plano 36-04).
**Severidade:** BLOQUEIA o planejamento da Phase 37 se ignorado — não a execução da P36.
**Descoberto por:** orquestrador, via Supabase MCP (`project_id: isljnozzlvckrgjjbjwp`).

## O fato

O ledger de migrations de PROD contém duas linhas para as quais **não existe arquivo local** em `supabase/migrations/`:

| version | name | arquivo local? |
|---|---|---|
| `20260721000001` | `20260721000001_notificacoes_enviadas` | ❌ ausente |
| `20260721000002` | `20260721000002_config_sla_etapa` | ❌ ausente |

Confirmado independentemente por `ls supabase/migrations/` e por `git log --oneline -- <paths>` (ambos vazios). Ou seja: há objetos vivos em produção que o repositório desconhece — exatamente os deliverables planejados da Phase 37 (LEDGER-01/02/03 + TIMELINE-01).

## O schema vivo, capturado em 2026-07-22

### `notificacoes_enviadas` — RLS **on**, **1** policy, 5 constraints, 5 índices, 0 triggers

| coluna | tipo | null | default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `evento` | text | NO | — |
| `candidatura_id` | uuid | NO | — |
| `candidato_id` | uuid | NO | — |
| `template` | text | NO | — |
| `destinatario_email` | text | NO | — |
| `status` | `status_notificacao` (enum) | NO | `'pendente'` |
| `provider_message_id` | text | YES | — |
| `dedupe_key` | text | NO | — |
| `tentativas` | integer | NO | `0` |
| `proxima_tentativa_em` | timestamptz | YES | — |
| `ultimo_erro` | text | YES | — |
| `criado_em` | timestamptz | NO | `now()` |
| `atualizado_em` | timestamptz | NO | `now()` |
| `enviado_em` | timestamptz | YES | — |
| `entregue_em` | timestamptz | YES | — |

### `config_sla_etapa` — RLS **on**, **1** policy, 4 constraints, 1 índice, 0 triggers

| coluna | tipo | null | default |
|---|---|---|---|
| `etapa` | `etapa_processo` (enum) | NO | — |
| `prazo_valor` | integer | YES | — |
| `prazo_unidade` | text | YES | — |
| `rotulo_candidato` | text | NO | — |
| `atualizado_em` | timestamptz | NO | `now()` |

## Retrato completo do que está vivo (capturado 2026-07-22)

**Origem:** desconhecida — o Fernando confirmou que não sabe quem aplicou. Tratar como schema a ser reconstruído por engenharia reversa a partir do banco.

### Constraints reais

| tabela | nome | definição |
|---|---|---|
| `notificacoes_enviadas` | `notificacoes_enviadas_pkey` | `PRIMARY KEY (id)` |
| `notificacoes_enviadas` | **`uq_notif_dedupe`** | **`UNIQUE (dedupe_key)`** ← a guarda de idempotência do LEDGER-02 **já existe** |
| `notificacoes_enviadas` | `notificacoes_enviadas_evento_check` | `CHECK (evento IN ('confirmacao','avanco','convite','decisao'))` ← os 4 eventos do M7 |
| `notificacoes_enviadas` | `..._candidatura_id_fkey` | `FK → candidaturas(id) ON DELETE CASCADE` |
| `notificacoes_enviadas` | `..._candidato_id_fkey` | `FK → candidatos(id) ON DELETE CASCADE` |
| `config_sla_etapa` | `config_sla_etapa_pkey` | `PRIMARY KEY (etapa)` |
| `config_sla_etapa` | `ck_sla_prazo_consistente` | `CHECK ((prazo_valor IS NULL) = (prazo_unidade IS NULL))` |
| `config_sla_etapa` | `..._prazo_unidade_check` | `CHECK (prazo_unidade IS NULL OR prazo_unidade IN ('dias_uteis','dias_corridos','horas'))` |
| `config_sla_etapa` | `..._prazo_valor_check` | `CHECK (prazo_valor IS NULL OR prazo_valor > 0)` |

### RLS real

- `notificacoes_enviadas` → **`rh_le_notificacoes`** (PERMISSIVE, `{authenticated}`, `SELECT`):
  `admin` OR (`rh` AND `candidatura_id IN (SELECT c.id FROM candidaturas c JOIN vagas v ON v.id = c.vaga_id WHERE v.created_by = auth.uid())`).
  **Isto É o padrão join-through vaga-scoped que o LEDGER-03 pede.** E o **candidato-DENY existe implicitamente**: não há policy que case para role `candidato`, então RLS cai no default-deny. Sem policy de INSERT/UPDATE, apenas `service_role` (que bypassa RLS) escreve — correto para a EF da P38.
  → *Decisão para a P37:* aceitar o default-deny implícito, ou tornar o candidato-DENY explícito para ficar auto-documentado e à prova de uma policy futura mal escrita?
- `config_sla_etapa` → `sla_public_read` (PERMISSIVE, `{anon,authenticated}`, `SELECT`, `qual: true`). Leitura pública — correto, é config não-PII, e é o que a TIMELINE-02 (P40) precisa.

### Enums

- `status_notificacao`: `pendente, enviado, entregue, falhou, bounce, reclamado` — cobre a state machine do M7 e ainda inclui `reclamado`.
- `etapa_processo` (pré-existente): `inscricao, triagem, avaliacao_assincrona, entrevista_online, entrevista_presencial, decisao_final, aprovado, rejeitado`.

### Seed de `config_sla_etapa` — **completo**, 8/8 etapas

| etapa | prazo | rótulo |
|---|---|---|
| `inscricao` | 48 horas | "Inscrição recebida — retorno da triagem em até 48 horas." |
| `triagem` | 48 horas | "Em triagem — retorno em até 48 horas." |
| `avaliacao_assincrona` | 7 dias corridos | "Avaliação liberada — conclua em até 7 dias corridos." |
| `entrevista_online` | 7 dias úteis | "Entrevista online — agendamento em até 7 dias úteis." |
| `entrevista_presencial` | 7 dias úteis | "Entrevista presencial — agendamento em até 7 dias úteis." |
| `decisao_final` | 3 dias úteis | "Em decisão final — resposta em até 3 dias úteis." |
| `aprovado` | — | "Parabéns! Você foi aprovado(a). Nossa equipe entrará em contato com os próximos passos." |
| `rejeitado` | 24 horas | "Processo encerrado — retorno enviado em até 24 horas." |

## Consequência: a P37 encolhe

O schema órfão é **de boa qualidade** e cobre a maior parte de LEDGER-01, LEDGER-02, LEDGER-03 e TIMELINE-01. A Phase 37 deixa de ser "construir a camada de dados" e passa a ser **"reconciliar o drift e fechar 3 lacunas estreitas"**:

1. **Reconciliar** — escrever os arquivos de migration locais que correspondem ao que está vivo, para o repo voltar a ser fonte da verdade. Sem isso, um `db reset` ou um rebuild de ambiente perde as duas tabelas silenciosamente.
2. **Lacuna: auditoria do modo teste** — faltam colunas para `destinatario_original` e `modo`. O `_shared/email-config.ts` da P36 reescreve o destinatário para `delivered+<evento>@resend.dev` em modo teste **preservando o original**; sem onde gravar isso, um envio de UAT fica indistinguível de um envio real no ledger.
3. **Lacuna: `atualizado_em` nunca atualiza** — a coluna tem `DEFAULT now()` mas a tabela tem **0 triggers**. Todo UPDATE (reivindicação de idempotência, retry, reconciliação da P41) deixa o campo congelado no instante do INSERT, tornando-o enganoso justamente onde ele seria mais útil.

## Duas lacunas já visíveis contra o que o M7 planejou

1. **RLS incompleta.** `notificacoes_enviadas` tem **1** policy. O LEDGER-03 exige **duas** posturas distintas: RH vaga-scoped via join-through (espelhando `rh_gerencia_agendamento`) **e** candidato-DENY. Uma policy só provavelmente não cobre ambas — a P37 precisa inspecionar a policy existente (`pg_policies`) antes de decidir entre estender ou substituir.
2. **Falta o par de auditoria do modo teste.** Existe `destinatario_email`, mas não `destinatario_original` nem `modo`/`redirecionado`. O `_shared/email-config.ts` entregue na P36 (`resolverDestinatario`) reescreve o destinatário para `delivered+<evento>@resend.dev` em modo teste **preservando o original** — sem colunas para isso, um envio de UAT em modo teste fica indistinguível de um envio real no ledger. Recomendação levantada pelo executor do Plano 36-01 e ainda não endereçada.

## O que a Phase 37 DEVE fazer

- **Começar diffando o schema vivo**, não assumindo criação do zero. Um `CREATE TABLE` cego falha; um `CREATE TABLE IF NOT EXISTS` é pior — mascara silenciosamente um schema divergente do planejado.
- Inspecionar, no mínimo: `pg_policies` (as policies reais), `pg_constraint` (o `UNIQUE(dedupe_key)` de idempotência existe?), `pg_index`, e os valores do enum `status_notificacao` contra a state machine planejada (`pendente→enviado→entregue/falhou/bounce`).
- Verificar se `config_sla_etapa` está **seedada** com os prazos do PRD §5.1.1, ou se está vazia.
- **Reconstruir os arquivos de migration locais** que correspondem ao que está vivo, para eliminar o drift — ou aplicar migrations aditivas que fechem as lacunas, com os arquivos correspondentes commitados.

## Nota operacional

Os subagentes GSD **não recebem os tools MCP do Supabase** (limitação conhecida de agentes com `tools:` restrito no frontmatter — bug upstream anthropics/claude-code#13898). Toda inspeção e todo apply em PROD precisam ser feitos pelo orquestrador/main thread. Planeje a P37 assumindo isso: as tarefas de banco fecham como checkpoint para o orquestrador, não como trabalho autônomo do executor.

---

## Resolução (Phase 37, 2026-07-22)

### Resolvido

**O repositório voltou a ser fonte da verdade.** Existem agora quatro arquivos de migration com correspondência 1:1 contra as quatro linhas do ledger de PROD:

| arquivo | version no ledger | origem | aplicado nesta fase? |
|---|---|---|---|
| `supabase/migrations/20260721000001_notificacoes_enviadas.sql` | `20260721000001` | **reconstruído** por engenharia reversa do catálogo (37-02) | ❌ não — já constava como aplicado |
| `supabase/migrations/20260721000002_config_sla_etapa.sql` | `20260721000002` | **reconstruído** por engenharia reversa do catálogo (37-02) | ❌ não — já constava como aplicado |
| `supabase/migrations/20260722000001_p36_vault_resend_reader.sql` | `20260722000001` | Phase 36 (`ler_resend_api_key()`) | ❌ não — aplicada na P36 |
| `supabase/migrations/20260722000002_p37_notificacoes_lacunas.sql` | `20260722000002` | **escrita e aplicada nesta fase** (37-03 → 37-04) | ✅ sim |

O ledger foi reconciliado no 37-04 para que cada `version` e cada `name` batam com o nome do arquivo (o MCP `apply_migration` grava um `version` com timestamp próprio; corrigido por UPDATE mirado). Confirmado independentemente no 37-05 por `supabase migration list --linked`: colunas **Local** e **Remote** alinhadas nas quatro versions, **zero pendência** — um `db reset`/rebuild agora reproduz as duas tabelas em vez de perdê-las silenciosamente.

**As 3 lacunas foram fechadas** pela aditiva `20260722000002_p37_notificacoes_lacunas.sql`:

1. **Auditoria do modo teste** — `notificacoes_enviadas.destinatario_original text NOT NULL` (deliberadamente **sem default**, para que a EF da P38 nunca herde placeholder) + `notificacoes_enviadas.modo text NOT NULL DEFAULT 'teste'` (default fail-safe espelhando `resolverModo()` de `_shared/email-config.ts`) + a constraint `ck_notif_modo CHECK (modo IN ('producao','teste'))`. A tabela tinha 0 linhas, então o `NOT NULL` entrou sem backfill.
2. **`atualizado_em` congelado** — função `public.tocar_atualizado_em()` (plpgsql, `SET search_path = ''`, `pg_catalog.now()` qualificado, **sem** `SECURITY DEFINER` — carimbar coluna da própria linha não pede privilégio elevado) + os triggers `trg_notificacoes_atualizado_em` e `trg_config_sla_atualizado_em`, ambos `BEFORE UPDATE FOR EACH ROW`. A função existente em PROD, `update_updated_at_column()`, seta `NEW.updated_at` (inglês) e é incompatível — não foi reusada.
3. **Índice parcial de retry** — **nenhum índice foi criado.** O `idx_notif_retry` (`btree (proxima_tentativa_em) WHERE status IN ('pendente','falhou')`) **já existia em PROD**, na forma correta: o predicado parcial já fixa o `status`, então tê-lo como primeira coluna da chave seria redundante. A "lacuna" era um erro do retrato original (ver bloco seguinte). A contagem de índices permaneceu **5** dos dois lados do apply.

**Fidelidade e garantias provadas por execução, não por leitura.** Dois arquivos de smoke duráveis e re-executáveis vivem no repo:

- `supabase/tests/p37_fidelidade_schema_smoke.sql` (12 asserções, somente-leitura, toggle `v_pos_aditiva`) — rodado contra PROD **antes** de qualquer DDL, em modo baseline: **12/12 PASS**. A ordem importou: aplicar primeiro teria destruído irrecuperavelmente a evidência de que a reconstrução da 37-02 era fiel. A asserção mais forte é a `(e)`: o `qual` de `rh_le_notificacoes` foi comparado por **igualdade exata** contra o de `rh_gerencia_agendamento` (a policy join-through vaga-scoped já auditada em P33/WR-04) — **byte-idêntico**, o que prova que o LEDGER-03 vivo **é** o predicado auditado, não uma reimplementação parecida.
- `supabase/tests/p37_lacunas_rls_idempotencia_smokes.sql` (14 asserções, gate de contagem auto-exigido via GUC `smoke37.pass`) — o núcleo crítico rodou contra PROD após o apply: **7/7 PASS**, incluindo `uq_notif_dedupe` → `unique_violation` na segunda inserção da mesma `dedupe_key` (**23505**), `ck_notif_modo` → `check_violation` num `UPDATE modo = 'producaoo'`, **candidato-DENY provado por impersonação real** (`request.jwt.claims` com `app_metadata.role='candidato'` + `SET LOCAL ROLE authenticated`, **com a linha existindo** → leu 0 linhas), **RH não-dono** → 0 linhas e **RH dono** → ≥1 linha. O par nega/permite é o ponto crítico: sem o "RH dono", um bug que negasse tudo faria o "RH não-dono" passar vacuamente. Fixture limpa ao final — tabela de volta a 0 linhas.

Ambos os smokes foram previamente validados num **Postgres 17.6 descartável**, com 10 sabotagens deliberadas — todas pegas pelos gates.

**`database.types.ts` regenerado** (37-05, commit `7ecf891`): 146 inserções, **0 deleções**. Os tipos do projeto agora conhecem `notificacoes_enviadas` (18 colunas, incluindo `destinatario_original` e `modo`), `config_sla_etapa` (5 colunas) e o enum `status_notificacao` (6 labels). A P38 grava e a P40 lê com tipos gerados, nenhuma delas com `any`.

### Corrigido em relação ao retrato original

O corpo acima foi escrito por **paráfrase** do catálogo, e o dump literal do 37-01 (`37-SCHEMA-VIVO.md`) mostrou que ele erra em pontos que teriam produzido código quebrado:

| Item | O que este documento dizia | O que o catálogo diz | Consequência do erro |
|---|---|---|---|
| **Literal de role na policy `rh_le_notificacoes`** | `admin` | **`administrador`** (28 ocorrências de `= 'administrador'` nas migrations locais confirmam a convenção) | Um smoke ou uma policy futura escrita a partir daqui usaria um literal que **nunca casa** — RH/admin perderia acesso em silêncio, ou pior, uma policy reescrita "para consertar" abriria caminho errado. Pego pelo negativo 2 da 37-02. |
| **Índice parcial de retry** | listado como lacuna a criar na P37 | **já existe** como `idx_notif_retry`, e na forma correta | Um `CREATE INDEX` cego falharia por nome duplicado; com `IF NOT EXISTS` seria um no-op silencioso mascarando divergência de definição. A 37-03 removeu a criação. |
| **Nº de índices em `notificacoes_enviadas`** | 5 (número correto) | 5 — mas **dois deles** (`idx_notif_retry`, `idx_notif_provider_msg`) já cobrem necessidades atribuídas aqui às fases 37 e 41 | A P41 não precisa de migration de índice nenhuma: já tem os dois de que precisa (varredura de retry e reconciliação por `provider_message_id`). |
| **"RLS incompleta — 1 policy não cobre as duas posturas do LEDGER-03"** | tratado como lacuna a fechar | A policy única **cobre** o RH vaga-scoped; o candidato-DENY é o **default-deny** da RLS, e é real (provado por impersonação) | Levou à decisão do bloco seguinte: não adicionar policy. |
| **"0 triggers"** | fato correto na época | continua verdadeiro para a captura de 2026-07-22; hoje há **1 trigger não-interno por tabela** | — |

O `qual` da policy **não é transcrito** em lugar nenhum como string: o deparse do Postgres reescreve parênteses, casts `::text`, `AS uid` e quebras de linha à sua maneira. Transcrevê-lo à mão seria adivinhação. A prova é catálogo-contra-catálogo.

### Deliberadamente NÃO feito

- **O candidato-DENY continua IMPLÍCITO.** Nenhuma policy nova foi criada em `notificacoes_enviadas`. Racional travado: uma policy **PERMISSIVE mal escrita ABRE acesso**; a **ausência de policy nunca abre**. Adicionar superfície só para auto-documentar troca segurança por legibilidade — não vale aqui. A garantia é provada por **impersonação real com JWT de candidato**, nunca por consulta a `pg_policies`. **Reavaliar apenas se surgir uma policy de `INSERT`/`UPDATE` na tabela** — aí o default-deny deixa de ser a única barreira.
- **`config_sla_etapa` NÃO foi re-seedada.** Estava 8/8, coerente, com rótulos pt-BR corretos. O seed do arquivo reconstruído usa `ON CONFLICT (etapa) DO NOTHING` — jamais upsert: um re-seed sobrescreveria em PROD texto que já está certo. Os 8 rótulos foram conferidos byte-a-byte por diff, incluindo acentuação.
- **Nenhum arquivo já presente no ledger foi editado.** As lacunas entraram numa migration **aditiva nova** (`20260722000002`). Reescrever um arquivo cuja version já consta como aplicada é mentira histórica: o que rodou em PROD não foi aquele conteúdo.
- **Nenhum `CREATE TABLE IF NOT EXISTS`** nos arquivos reconstruídos — mascara divergência silenciosamente. Os arquivos descrevem o estado; a proteção contra re-execução é o próprio ledger.
- **Coluna `reclamado_em`** não foi criada (ver bloco seguinte).

### Continua em aberto

- **A ORIGEM do apply original permanece DESCONHECIDA.** Este é o ponto mais importante deste bloco: o drift foi **reconciliado**, mas a **causa não foi descoberta**. Ninguém sabe quem aplicou `20260721000001` e `20260721000002` direto em PROD, nem por qual caminho — não há arquivo, commit, branch ou stash em nenhuma parte do repositório (confirmado por `git log --all --diff-filter=A` e `git stash list`, ambos vazios). **A mesma falha pode se repetir.** Fechar este item não fecha essa pergunta. Se o padrão reaparecer, tratar como sinal de processo (um caminho de apply fora do repo continua existindo), não como incidente isolado.
- **Retenção/purga de `notificacoes_enviadas`** — política de expurgo/arquivamento nunca definida. A tabela vai acumular e-mails transacionais com `destinatario_email`/`destinatario_original` (dado pessoal). Deferido ao milestone de **LGPD-OPS (M8+)**.
- **Coluna `reclamado_em`**, para simetria com `enviado_em`/`entregue_em` — o enum `status_notificacao` já tem o label `reclamado`, mas o webhook Svix que o produz só chega na **P41**. Deferido à P41, que decide se precisa do timestamp.
- **Divergência `updated_at` (inglês) vs `atualizado_em` (pt-BR)** no resto do schema — a função `update_updated_at_column()` em inglês convive com colunas pt-BR noutras tabelas. Confirmado como débito real durante esta fase (foi o motivo de criar `tocar_atualizado_em()` em vez de reusar). **Não endereçado**, fora do escopo do M7.
- **Chave PROD do Resend ainda não provisionada no Vault** (herdado da P36, UAT-36-2) — não bloqueia esta fase, mas trava o smoke da EF da P38.
