# `docs/compliance/` — a coleta datada do M8 (LGPD-OPS)

Esta pasta é **fonte de verdade de fato datado**, não de prosa aspiracional. Cada arquivo aqui
responde a uma pergunta sobre o estado **real** do sistema numa data específica, e carrega a
consulta que o reproduz.

Ela nasce na **Phase 42** (`Inventário, Gates & Fila Art. 20`) do milestone **M8 / v8.0**, cujo
princípio ordenador é: *nenhuma linha destrutiva do milestone é escrita antes de o mapa do que
existe estar em cima da mesa como fato datado.*

## Por que esta pasta existe fora de `.planning/`

Os consumidores destes artefatos são a **Phase 44** (allowlist explícita do export de dados) e a
**Phase 45** (o plano de exclusão do motor de anonimização) — ambas muito depois de
`.planning/phases/42-…` virar arquivo morto. Um inventário que vive junto do planejamento de uma
fase encerrada é um inventário que ninguém encontra quando precisa.

## Regras desta pasta

1. **Todo artefato carrega data de coleta** (ISO, `AAAA-MM-DD`) e o caminho da query que o reproduz.
2. **Todo artefato é reproduzível.** Se não há query, não é fato datado — é opinião.
3. **Nenhum identificador de pessoa.** Estes arquivos são versionados no Git. `candidatura_id`,
   `por_usuario`, e-mail, CPF e afins **não** atravessam a fronteira PROD → repositório. Agregados e
   distribuições, sim.
4. **O inventário de PII deriva do catálogo vivo** (`information_schema.columns` + `pg_constraint`),
   semeado de `.planning/research/FK-AUDIT-LIVE.md` — **nunca** de arquivos de migration. O motivo é
   concreto: o DDL base de ~40 tabelas legadas vive **fora do ledger de migrations**, em
   `docs/sql/sql/*.sql` (49 scripts não versionados como migration). Um inventário que lê apenas
   `supabase/migrations/` enxerga um fragmento do schema e se declara completo — que é exatamente o
   modo de falha que este milestone existe para eliminar.

## Índice dos artefatos (Phase 42)

> Índice **antecipado**: as linhas abaixo descrevem os artefatos previstos para esta fase. Os planos
> que os produzem **não** editam este README — ele já os indexa. Se um artefato mudar de nome, quem
> muda edita esta tabela na própria wave.

| Artefato | Requirement | O que responde |
|----------|-------------|----------------|
| [`art20-backlog.md`](./art20-backlog.md) | **REVISAO-06** | Quantos pedidos de revisão do Art. 20 estão pendentes em PROD, com data. **Primeiro deliverable da fase — entregue antes de qualquer tela** |
| `pii-inventory.yaml` | **INVENT-01** | O inventário PII coluna-a-coluna em forma legível por máquina — a fonte que as Phases 44/45 consomem como **dado** |
| `pii-inventory.md` | **INVENT-01** | A mesma classificação (apagar / anonimizar / preservar) em tabela legível por gente, gerada do YAML |
| `backup-posture.md` | **INVENT-02** | Se o PITR está ligado e com que janela — **com o registro explícito de que o Storage não é coberto por nenhum caminho de backup**, verdade independente do PITR |
| `cron-inventory.md` | **INVENT-03** | O diff dos `cron.job` vivos contra o repositório, cada job vivo rastreável a uma migration |
| `ddl-idiom-sweep.md` | **INVENT-04** | A varredura do idioma `ADD COLUMN IF NOT EXISTS`, listando onde uma cláusula FK pode ter sido silenciada |
| `achados-inventario.md` | INVENT-01..04 | Os achados transversais da coleta — incluindo correções à própria semente (`FK-AUDIT-LIVE.md`) |

### Queries reprodutoras — `sql/`

| Arquivo | Alimenta | Natureza |
|---------|----------|----------|
| `sql/01-pii-inventory.sql` | `pii-inventory.yaml` / `.md` | read-only |
| `sql/02-cron-inventory.sql` | `cron-inventory.md` | read-only |
| [`sql/03-art20-backlog.sql`](./sql/03-art20-backlog.sql) | `art20-backlog.md` | read-only |

Todas são **read-only e seguras em PROD**. Executadas pelo orquestrador via `execute_sql` do MCP do
Supabase — subagentes GSD não recebem esses tools.

## O que esta pasta **não** é

- Não é documentação de produto. É registro de estado.
- Não é aspiracional. Uma promessa de retenção sem código que a execute é o "zumbi de compliance"
  que o **CONSOL-04** da Phase 47 existe para caçar — e este índice é onde a caça começa.
