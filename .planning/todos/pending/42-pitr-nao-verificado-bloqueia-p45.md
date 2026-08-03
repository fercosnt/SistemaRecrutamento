---
id: 42-pitr-nao-verificado-bloqueia-p45
created: 2026-07-29
source: Phase 42 / Plan 42-05 (INVENT-02) — coleta bloqueada por ausência de credencial
priority: high
resolves_phase: 45
tags: [lgpd, backup, pitr, storage, m8, bloqueio, decisao-de-operador]
---

# PITR não verificado — metade do INVENT-02 em aberto, e é bloqueio da Phase 45

## O que falta

`docs/compliance/backup-posture.md` está **PARCIAL**. A metade entregue (Storage sem backup) é a
mais importante e não dependia de credencial. A metade que falta:

| Campo | Por que importa |
|-------|-----------------|
| `pitr_enabled` | Se estiver **desligado**, a Phase 45 escreve código irreversível sem rede de segurança nenhuma |
| **janela real utilizável** | `physical_backup_data.earliest_physical_backup_date_unix` — a janela REAL, não o tier contratado |
| `walg_enabled` · `region` | Completude do registro |

## Por que não foi coletado

- O **MCP do Supabase não expõe backups** — não há tool para isso.
- A **Management API** exige `SUPABASE_ACCESS_TOKEN`, **ausente do ambiente** (não está na shell
  nem em nenhum `.env` do projeto).
- O **dashboard** exige sessão autenticada de navegador, que o agente não tem.

Não é lacuna de esforço; é falta de credencial. Registrado no próprio artefato em vez de silenciado.

## Como resolver

### Caminho A — Management API (autoritativo)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/database/backups
```

### Caminho B — dashboard

Supabase → **Database → Backups → Point in Time**. Transcrever e **registrar que a fonte foi o
dashboard e não a API** — o dashboard destaca o tier contratado mais do que a janela realmente
utilizável, e são coisas diferentes.

Depois: preencher a seção "❌ O que falta" de `docs/compliance/backup-posture.md`, trocar o status
de `PARCIAL` para completo, e fechar este todo.

## Por que isto bloqueia a Phase 45, e não é só burocracia

O PITR é o **único** caminho de recuperação da metade Postgres de uma anonimização que dê errado.
A Phase 45 é a fase de maior risco do milestone: mutação **não-atômica** de três sistemas (Storage
→ Postgres → Auth), sem transação compartilhada, sobre PII viva.

Se o PITR estiver desligado, isso não muda um parágrafo de documentação — muda o **cálculo de risco
da fase inteira**, e possivelmente o sequenciamento dela.

E ligar o PITR é **decisão de gasto**, não técnica: é do operador (Fernando), não da engenharia.
Por isso o ROADMAP exige o status como fato datado **antes** de a Phase 45 planejar código
destrutivo — exatamente para que essa decisão seja tomada com o número na mão.

## O que já está estabelecido e NÃO depende disto

> **O Storage não é coberto por nenhum caminho de backup — nem PITR, nem backups diários.**

Verdade independente do PITR estar ligado. Governa ERASE-03 (ordem Storage→Postgres→Auth) e
ERASE-04 (capturar caminhos antes de qualquer mutação), e torna definitiva qualquer exclusão dos 3
ponteiros de Storage: `candidatos.avatar_url`, `candidaturas.curriculo_url`,
`entrevistas_online.gravacao_url`.
