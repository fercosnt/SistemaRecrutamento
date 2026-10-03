# Postura de backup — o que é recuperável e o que não é

| Campo | Valor |
|-------|-------|
| **Requirement coberto** | **INVENT-02** (parcial — ver status abaixo) |
| **Data de coleta** | **2026-07-29** |
| **Ambiente** | PROD (`isljnozzlvckrgjjbjwp`) |
| **Status** | ✅ **COMPLETO como fato** (2026-10-03) — Storage sem backup · **PITR DESLIGADO**, medido pela Management API. ⚠ A *decisão* de ligá-lo ou não segue do operador |

---

## ✅ Medido em 2026-10-03 — Management API, `GET /v1/projects/isljnozzlvckrgjjbjwp/database/backups`

Fonte: **a API** (caminho A), com o token do Keychain (serviço «Supabase CLI»). Não é o dashboard.

| Campo | Valor medido |
|-------|--------------|
| `pitr_enabled` | **`false`** |
| `walg_enabled` | `true` |
| `physical_backup_data` | `{}` — **não há janela PITR** (`earliest_physical_backup_date_unix` ausente) |
| `region` | `us-east-1` |
| backups listados | **8 diários**, todos `COMPLETED`, `is_physical_backup: true`, de `2026-09-26T06:23Z` a `2026-10-03T06:31Z` (~1 por dia, por volta das 06:25 UTC) |

**Leitura:** o banco tem backup **diário** com cerca de 7 dias de retenção, e **nenhuma**
recuperação a um instante arbitrário. O pior caso de uma escrita errada na metade Postgres é perder
até ~24 h de dado, voltando ao backup diário anterior, e não «perder tudo». O Storage segue sem
backup algum (seção abaixo, inalterada).

A Phase 45 foi executada **nesta** condição: os SUMMARYs dela já dizem «sem PITR e com o Storage
fora de todo backup» (`45-16-SUMMARY.md`). Este registro transforma em fato datado o que lá era
premissa. **Ligar o PITR continua sendo decisão de gasto do operador**: este documento mede, não
decide.

As seções «⛔ Status» e «❌ O que falta» abaixo são o registro de 2026-07-29 e ficam como histórico.

---

## ⛔ Status: este artefato está incompleto e sabe disso

| Metade | Status | Bloqueia |
|--------|--------|----------|
| **Storage não tem backup** | ✅ **Estabelecido** | — |
| **PITR ligado? qual janela?** | ❌ **NÃO VERIFICADO** | **Phase 45** |

**Por que a metade do PITR não foi coletada:** o MCP do Supabase **não expõe backups**. O caminho
autoritativo é a Management API, que exige `SUPABASE_ACCESS_TOKEN` — **ausente do ambiente desta
coleta**. O caminho alternativo (dashboard → *Database → Backups → Point in Time*) exige sessão
autenticada de navegador, que o agente não tem.

**Este artefato NÃO pode ser considerado suficiente para a Phase 45 enquanto essa linha estiver
vermelha.** Ver "O que falta" no fim.

---

## ✅ O fato que não depende do PITR — e é o mais importante

> ### O Supabase Storage **não é coberto por nenhum caminho de backup** — nem pelo PITR, nem pelos backups diários.

Isto é verdade **independentemente** de o PITR estar ligado ou desligado, e independentemente do
tier contratado. PITR e backups diários operam sobre o **banco Postgres**. Os objetos do Storage
vivem fora dele; o Postgres guarda apenas o **metadado** em `storage.objects`.

### Consequência direta e irreversível

Um currículo, avatar ou gravação de entrevista apagado do Storage é **irrecuperável por qualquer
meio**. Não há "restaurar de ontem". Não existe janela.

Isto governa três decisões já registradas do milestone:

1. **ERASE-04** — os caminhos do Storage têm de ser **capturados no plano ANTES de qualquer
   mutação**. Uma falha parcial no meio da execução perde os ponteiros permanentemente e **órfã o
   blob para sempre**: o arquivo continua ocupando espaço, sem nenhum registro de a quem pertencia.
2. **ERASE-03** — a ordem `Storage → Postgres → Auth` não é preferência de estilo. É imposta pela
   plataforma (o Supabase recusa apagar um usuário que ainda possui objetos no Storage) **e** pelo
   fato acima: o passo irreversível vem primeiro, enquanto ainda há estado consistente para
   diagnosticar uma falha.
3. **Fora de escopo, travado:** apagar `storage.objects` **via SQL** remove só o metadado e órfã o
   blob permanentemente. O único caminho correto é a Storage Admin API a partir de Edge Function.

### Os 3 ponteiros de Storage neste sistema

Do inventário PII (`pii-inventory.yaml`, achado A-02):

| Tabela.coluna | Conteúdo |
|---------------|----------|
| `candidatos.avatar_url` | Foto do candidato |
| `candidaturas.curriculo_url` | **Currículo** |
| `entrevistas_online.gravacao_url` | Gravação da entrevista |

Os três são classificados `apagar` e os três carregam a mesma ressalva ERASE-04.

### Procedência desta afirmação

Estabelecida na pesquisa da fase (`42-RESEARCH.md` §INVENT-02), a partir de documentação oficial do
Supabase com citação verbatim. Confiança declarada pela pesquisa: **MEDIUM-HIGH** — a documentação
foi buscada em fonte primária; o que veio por busca secundária foi apenas o *formato de resposta*
da Management API, que é o que falta abaixo.

---

## ❌ O que falta — PITR

Para completar o INVENT-02, é preciso registrar, **como fato datado**:

| Campo | Onde obter |
|-------|-----------|
| `pitr_enabled` | ligado ou desligado |
| janela real utilizável | `physical_backup_data.earliest_physical_backup_date_unix` — **a janela REAL**, não o tier contratado |
| `walg_enabled` | — |
| `region` | — |

### Caminho A — Management API (preferido, é o autoritativo)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  https://api.supabase.com/v1/projects/isljnozzlvckrgjjbjwp/database/backups
```

### Caminho B — dashboard (aceitável, com procedência registrada)

Supabase → **Database → Backups → Point in Time**. Transcrever o que estiver na tela e **registrar
neste artefato que a fonte foi o dashboard e não a API** — a diferença importa, porque o dashboard
mostra o tier contratado com mais destaque do que a janela realmente utilizável.

### Por que a Phase 45 não deve começar sem isso

O PITR é o **único** caminho de recuperação da metade Postgres de uma anonimização que dê errado.
Se estiver desligado, a Phase 45 escreve código irreversível **sem rede de segurança nenhuma** — o
que muda o cálculo de risco da fase inteira, não só um parágrafo de documentação.

Ligar o PITR é **decisão de gasto**, não técnica: é do operador. Por isso o roadmap exige que o
status seja um fato datado **antes** de a Phase 45 planejar código destrutivo, e não uma suposição.

---

## Resumo em uma frase

**Storage: sem backup, confirmado — qualquer exclusão ali é definitiva.**
**Postgres: janela desconhecida — e essa lacuna é, hoje, um bloqueio da Phase 45.**
