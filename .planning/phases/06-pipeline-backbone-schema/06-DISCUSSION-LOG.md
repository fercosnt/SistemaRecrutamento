# Phase 6: Pipeline Backbone & Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-07
**Phase:** 6-pipeline-backbone-schema
**Areas discussed:** Escopo de schema na fase, Cutover do enum com dado real, Política do avancar_etapa(), Quem grava a transição + captura do ator

---

## Escopo de schema na fase

| Option | Description | Selected |
|--------|-------------|----------|
| Backbone only | Só enum 6+2, status v2, historico_candidatura, bias_audit_log, decisao_final, trigger, RLS dessas. Tabelas de feature ficam pras fases 7-15. | ✓ |
| Todas as ~14 tabelas agora | Aplicar as 16 migrations do §8.1 inteiras na Phase 6. | |
| Backbone + tabelas-folha vazias | Backbone + outras tabelas como casca com RLS default-deny. | |

**User's choice:** Backbone only.
**Notes:** Menor blast-radius por fase; cada migration PL/pgSQL isolada no workaround 42601; evita desenhar RLS de tabela cuja feature ainda nem foi especificada.

### Sub-decisão: decisao_final

| Option | Description | Selected |
|--------|-------------|----------|
| Criar tabela completa agora | decisao_final com todos os constraints §8.2 (por_usuario NOT NULL, justificativa CHECK>=50, decisao enum, RLS INSERT WITH CHECK false). | ✓ |
| Só o constraint, tabela mínima | Só por_usuario NOT NULL + decisao enum; resto fica pra Phase 15 (ALTER depois). | |
| Adiar tudo pra Phase 15 | Não criar; satisfazer guardrail de outro jeito. | |

**User's choice:** Criar tabela completa agora.
**Notes:** Success criterion #5 exige que o guardrail por_usuario NOT NULL seja auditável por SQL já na Phase 6 — o constraint estrutural tem que existir agora; Phase 15 só escreve a feature/EF por cima.

---

## Cutover do enum com dado real

| Option | Description | Selected |
|--------|-------------|----------|
| In-place ALTER COLUMN + backup leve | Backup defensivo → CREATE TYPE v2 → ALTER COLUMN USING (map) → DROP legado → rename. Mantém tabela/FK/RLS. | ✓ |
| Backup-and-rebuild da tabela | Renomear candidaturas → legacy, criar nova, copiar. Mais invasivo. | |
| Adicionar valores novos, manter enum | Só ALTER TYPE ADD VALUE; deixa 10 valores zumbis. Viola FUNIL-01. | |

**User's choice:** In-place ALTER COLUMN + backup leve.
**Notes:** Mantém tabela, FKs e RLS no lugar; mapping explícito das linhas vivas.

### Sub-decisão: backup + mapeamento de órfãos

| Option | Description | Selected |
|--------|-------------|----------|
| Schema _backup no DB + map p/ triagem | Snapshot em backup_m2.candidaturas_pre_funil; triagem/terminais 1:1; órfãos colapsam pra triagem com log. | ✓ |
| Export CSV externo + map estrito | Backup fora do DB; mapping FALHA a migration se aparecer valor inesperado. | |
| Você decide | Deixar pro planner/researcher. | |

**User's choice:** Schema _backup no próprio DB + map p/ triagem.
**Notes:** Cutover roda no SQL Editor (workaround 42601), então backup no DB é o mais simples e auditável por SQL. Enum legado declarado "nunca exercido" além de triagem — mapping de órfãos é defensivo.

---

## Política do avancar_etapa()

| Option | Description | Selected |
|--------|-------------|----------|
| Linear, pulo p/ frente livre, regressão exige justificativa | Avançar/pular pra frente livre; voltar só com justificativa; terminais de qualquer etapa. | ✓ |
| Estritamente linear | Só próxima etapa; pulo pra frente também bloqueado. | |
| Qualquer transição, sempre com motivo | Trigger não bloqueia nada; só força linha no historico. | |

**User's choice:** Linear, pulo pra frente livre, regressão exige justificativa.
**Notes:** RH às vezes adianta candidato forte direto pra entrevista; guard-rail só onde importa (regressão), conforme success criterion #2.

### Sub-decisão: mecanismo da justificativa

| Option | Description | Selected |
|--------|-------------|----------|
| Coluna(s) companheira(s) na candidaturas | UPDATE seta etapa_atual + etapa_justificativa juntos; trigger BEFORE UPDATE lê NEW, bloqueia regressão vazia, copia pro historico. | ✓ |
| GUC / session variable | SET LOCAL antes do UPDATE; trigger lê current_setting(). Mais frágil. | |
| Tabela de comando separada | transicoes_pendentes consumida pelo trigger/EF. Overkill. | |

**User's choice:** Colunas companheiras na própria candidaturas.
**Notes:** Atômico, transacional, sem estado de sessão.

---

## Quem grava a transição + captura do ator

| Option | Description | Selected |
|--------|-------------|----------|
| UPDATE direto do client, RLS-gated | RH UPDATE direto via supabase-js; RLS por role rh/administrador; ator=auth.uid(). decisao_final continua EF-only. | ✓ |
| Só via Edge Function | Todo avanço via EF; RLS bloqueia UPDATE direto; ator passado explícito (auth.uid() null em service_role). | |
| Híbrido | Avanço client direto; ações sensíveis EF-only. | |

**User's choice:** UPDATE direto do client, RLS-gated.
**Notes:** Simples, sem EF por clique, coerente com triagem RH em massa. decisao_final permanece EF-only (caso especial do guardrail).

### Sub-decisão: ator em transições não-humanas

| Option | Description | Selected |
|--------|-------------|----------|
| historico.ator nullable + flag auto_rejeitado; guardrail só em decisao_final | NULL+auto_rejeitado=true = sistema; auth.uid() = humano. Guardrail LGPD-02 só em decisao_final.por_usuario NOT NULL. | ✓ |
| ator sempre NOT NULL com sentinela 'system' | uuid fictício pra ações de sistema. | |
| Você decide | Deixar pro planner contanto que criterion #5 garantido. | |

**User's choice:** historico.ator nullable + flag auto_rejeitado; guardrail só em decisao_final.
**Notes:** Distinção limpa entre "transição de pipeline" (ator pode ser sistema) e "decisão final" (sempre humana, NOT NULL). Knockout auto-rejeição (Phase 8) e writes EF service_role têm ator NULL.

---

## Claude's Discretion

- Naming exato das colunas companheiras (etapa_motivo/etapa_justificativa), do schema de backup (backup_m2.*), e dos tipos enum v2 — seguindo convenção pt-BR snake_case.
- Índices em historico_candidatura e decisao_final — planner define pelo padrão de query.
- Mecânica fina do CASE expression no USING do mapping de órfãos.

## Deferred Ideas

- Tabelas de feature do M2 (analise_candidato_vaga, scores_candidato, redacoes_candidato, entrevistas_candidato, comparativo_solicitado, pergunta_opcao_metadata, vaga.testes_aplicaveis/pesos_avaliacao, devolutivas_candidato, *_respostas_em_progresso) — fases 7-15.
- EF avancar-etapa dedicada — revisitar só se uma feature exigir lógica complexa demais pro trigger.
- Retenção/anonimização do schema de backup (backup_m2.*) — política de TTL decidida depois.
- MS Bookings / agendamentos_entrevista — fora do M2 v1 (REQUIREMENTS.md Future).
