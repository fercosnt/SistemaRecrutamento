# Achados da coleta de inventário — Phase 42

| Campo | Valor |
|-------|-------|
| **Requirements** | INVENT-01 · INVENT-02 · INVENT-03 · INVENT-04 |
| **Data de coleta** | **2026-07-29** |
| **Ambiente** | PROD (`isljnozzlvckrgjjbjwp`) — leituras de catálogo, read-only |

Este arquivo reúne o que a coleta descobriu **além** do que cada artefato individual responde —
incluindo correções à própria semente do inventário.

---

## Correções à semente (`FK-AUDIT-LIVE.md`)

O ROADMAP manda semear o inventário PII de `.planning/research/FK-AUDIT-LIVE.md`, nunca de arquivos
de migration. A regra está certa. Mas a semente **contém erros**, e eles foram encontrados
justamente por seguir a regra — lendo o catálogo vivo em vez do arquivo.

### C-01 · A citação do drift aponta para a tabela errada — **e não há drift**

**Afirmação da semente:** o drift de `candidatos.user_id` tem causa em
`20260421000001_rate_limit_duplicate_check.sql:193`.

**Evidência 1 — a linha citada altera outra tabela.** O `ALTER TABLE` que governa a linha 193 é
`public.autorizacoes`, não `public.candidatos`.

**Evidência 2 — a FK apontada como divergente é idêntica nos dois lados.**

| Fonte | Definição |
|-------|-----------|
| Catálogo vivo de PROD | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` |
| Repositório (`docs/sql/sql/02-tabela-candidatos.sql:14`) | `user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE` |

**Não há drift em `candidatos.user_id`.** E ela nunca passou pelo idioma
`ADD COLUMN IF NOT EXISTS` — nasceu no `CREATE TABLE`.

**Evidência 3 — a FK que a linha 193 realmente cria existe e está correta:**
`autorizacoes_user_id_fkey → auth.users(id) ON DELETE SET NULL`, viva em PROD.

**Consequência:** o ROADMAP do M8 declara a causa do drift como *"identificada"*. Ela **não** está.
O todo herdado `processo-origem-do-drift-desconhecida` (do M7) estava certo, e continua aberto.

### C-02 · As 5 tabelas `SET NULL` do ERASE-09 não apontam todas para `auth.users`

O ERASE-09 nomeia 5 tabelas com FK `SET NULL` que "sobrevivem a qualquer CASCADE deixando linhas
órfãs": `ai_call_logs`, `candidate_ai_decisions`, `logs_acesso`, `recruiter_alerts`, `autorizacoes`.

**No catálogo vivo, apenas duas têm FK `SET NULL` para `auth.users`:**

| Tabela | FK para `auth.users` | ON DELETE |
|--------|---------------------|-----------|
| `autorizacoes` | `autorizacoes_user_id_fkey` | `SET NULL` |
| `logs_acesso` | `logs_acesso_user_id_fkey` | `SET NULL` |

As outras três (`ai_call_logs`, `candidate_ai_decisions`, `recruiter_alerts`) referenciam
`candidatos`/`vagas`, **não `auth.users` diretamente**. O requirement precisa ser reformulado sobre
o alvo certo, senão a Phase 45 vai procurar órfãs no lugar errado.

### C-03 · O `config_sla_etapa` **tem** trigger de `atualizado_em`

Registrado porque uma versão anterior da pesquisa afirmou o contrário. O trigger existe:
`trg_config_sla_atualizado_em`, criado em `20260722000002_p37_notificacoes_lacunas.sql:170-172`,
executando `public.tocar_atualizado_em()` (definida na mesma migration, `:144`).

A busca original olhou só `20260721000002_config_sla_etapa.sql` — onde de fato não há — e concluiu
ausência. **É a mesma classe de erro que este inventário existe para evitar:** ler um objeto vivo a
partir de um único arquivo de migration em vez do estado acumulado.

**Consequência prática:** `tocar_atualizado_em()` é **reutilizável**. Tabelas de config novas devem
reusá-la, nunca redefini-la.

---

## Achados estruturais

### A-01 · ~40 tabelas legadas têm DDL fora do ledger de migrations

O DDL base de cerca de 40 das 64 tabelas do schema `public` vive em `docs/sql/sql/*.sql` — **49
scripts** que nunca foram registrados como migration.

**Por que isso é o achado mais importante desta coleta:**

- Qualquer inventário, allowlist de export (Phase 44) ou plano de exclusão (Phase 45) construído a
  partir de `supabase/migrations/` enxerga **um fragmento** do schema e se declara completo.
- `supabase db diff` compara contra um baseline que nunca incluiu esses scripts.
- É um caminho de escrita de schema **fora do processo** — a forma de drift que o todo herdado
  descreve, e que esta fase **não** fechou.

**Mitigação já aplicada:** `pii-inventory.yaml` foi construído do catálogo vivo, não de migrations.
**Recomendação (Phase 47 / CONSOL-04):** incluir no checklist a pergunta *"este artefato foi
derivado do catálogo vivo ou de arquivos de migration?"*.

### A-02 · Dois vocabulários de papel coexistem, e o filtro óbvio descarta o recrutador

| Onde | Vocabulário |
|------|-------------|
| `usuarios_rh.role` (CHECK) | `administrador` · `gerente` · `recrutador` · `visualizador` |
| JWT `app_metadata.role` | `administrador` · `rh` · `candidato` (hook mapeia `recrutador` → `rh`) |

**População viva em 2026-07-29:** 4 `administrador` + 1 `recrutador`, todos ativos e não deletados.
Zero `gerente`, zero `visualizador`.

Um filtro literal `role IN ('rh','administrador')` sobre a **tabela** devolveria 4 de 5 pessoas —
**silenciando exatamente o único recrutador**, que é a persona primária da fila de revisão. O
`42-CONTEXT.md` continha essa formulação; foi corrigida antes do planejamento.

### A-03 · Segredos vivem em tabelas do schema `public`

| Tabela.coluna | Conteúdo |
|---------------|----------|
| `configuracoes_empresa.smtp_senha_encrypted` | Senha SMTP |
| `configuracoes_empresa.webhook_secret` | Segredo de webhook |
| `webhooks_config.secret` | Segredo de webhook |

**Consequência para EXPORT-02:** a allowlist do export tem de ser construída por **inclusão
explícita**. Um `select('*')` aqui vaza **credencial**, não apenas PII — e `select('*')` já é a
classe de vulnerabilidade nº 1 recorrente deste projeto.

### A-04 · BD-9 tem quatro colunas, não uma

A decisão em aberto sobre redigir ou preservar a justificativa de ≥50 caracteres foi enunciada
sobre `decisao_final`. O inventário encontrou **quatro** colunas de texto livre digitado por humano
com função probatória simultânea:

- `decisao_final.justificativa`
- `decisao_final_historico.justificativa`
- `candidaturas.motivo_rejeicao`
- `avaliacoes_rh.justificativa_recomendacao`

A decisão do operador precisa cobrir as quatro, ou o resultado é incoerente.

### A-05 · `data_deletion_log` é zumbi confirmado

4 colunas (`id`, `deletion_type`, `deleted_at`, `created_at`), **nenhuma FK**, nenhum vínculo com
titular. Nunca recebeu escrita real. Confirma o CONSOL-03: construir o tombstone novo na Phase 45 e
**dropar este stub** na Phase 47.

### A-06 · Assimetria de RLS entre `candidaturas` e `decisao_final`

`rh_le_candidaturas` é **vaga-scoped**; `rh_le_decisao_final` **não é**. As duas discordam hoje em
PROD. A fila de revisão (plano `42-06`) espelha a **mais estrita** e registra a assimetria aqui, em
vez de corrigi-la de passagem — mudar RLS viva fora de escopo é como um bug vira incidente.

### A-07 · O bug do INVENT-05 é latente, não ativo

Ver `cron-inventory.md` § "Correção ao enunciado do INVENT-05". Resumo: com
`candidate_ai_decisions` vazia, `x NOT IN (conjunto vazio)` é `TRUE`, então o cron **apaga
corretamente hoje**. O bug arma-se quando existir linha protegida com elemento `NULL` no array. O
efeito da correção é impedir que o `DELETE` **pare** de apagar no futuro, silenciosamente — não
"voltar a apagar".

---

## Fatos datados de blast radius (para o portão destrutivo)

| Métrica | Valor em 2026-07-29 |
|---------|--------------------:|
| `ai_call_logs` — total | **0** |
| `ai_call_logs` — elegíveis por retenção | **0** |
| `candidate_ai_decisions` — total | **0** |
| Pedidos de revisão Art. 20 pendentes | **1** (esperando 33 dias) |
| `cron.job` vivos | **3** (esperado: 3) |
| Tabelas base em `public` | **64** |
| Colunas em `public` | **993** |
| FKs em `public` | **102** (26 para `auth.users`) |
| Usuários RH vivos | **5** (4 admin + 1 recrutador) |

---

## Artefatos desta coleta

| Arquivo | Requirement | Status |
|---------|-------------|--------|
| [`art20-backlog.md`](./art20-backlog.md) | REVISAO-06 | ✅ completo |
| [`pii-inventory.yaml`](./pii-inventory.yaml) + [`.md`](./pii-inventory.md) | INVENT-01 | ✅ completo (64/64 tabelas) |
| [`cron-inventory.md`](./cron-inventory.md) | INVENT-03 | ✅ completo |
| [`ddl-idiom-sweep.md`](./ddl-idiom-sweep.md) | INVENT-04 | ✅ completo (7/7 A+B verificadas) |
| [`backup-posture.md`](./backup-posture.md) | INVENT-02 | ⚠ **PARCIAL — PITR não verificado** |
