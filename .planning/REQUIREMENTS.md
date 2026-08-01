# Requirements: M8 — Dados do Candidato & Direitos do Titular (LGPD-OPS)

**Milestone:** v8.0
**Defined:** 2026-07-29
**Core Value:** Candidato se cadastra, se candidata a uma vaga e acompanha seu status sem fricção — e o RH consegue triar, avaliar e decidir sobre candidatos num único sistema rastreável com scores comparáveis.
**Pesquisa:** `.planning/research/SUMMARY.md` · **Fatos vivos (precedência):** `.planning/research/FK-AUDIT-LIVE.md`

> **Enquadramento.** O M8 **remove teatro de compliance pré-existente**, não adiciona compliance a um sistema neutro: `data_deletion_log` existe desde 2026-06-09 prometendo uma `delete_candidate_data()` que a Phase 15 nunca criou (0 linhas, ausente de `pg_proc`), e `notificacoes_enviadas` carrega o comentário literal "Retention INDEFINITE, deferred to LGPD-OPS (M8+)".

## Decisões de negócio travadas no kickoff

| ID | Decisão | Escolha | Consequência |
|----|---------|---------|--------------|
| BD-1 | Janela de retenção | **2 anos** (o teto já consentido pela copy do cadastro) | Maximiza defesa contra Lei 9.029/1995 e serve o TALENT do M9. ⚠ Tensiona o princípio de necessidade (Art. 6º, III) — por isso vive em tabela de config (RETEN-01), alterável sem deploy quando o advogado trabalhista opinar |
| BD-2 | `autorizacao_comunicacao` | **Separar transacional de marketing** | Transacional segue sem opt-out sob Art. 7º, V; "novas oportunidades de vagas" vira consentimento próprio COM opt-out real |
| BD-4 | SLA da fila Art. 20 | **Interno, não exibido** | Badge de priorização no RH; nada de prazo na copy do candidato. O Art. 20 **não tem prazo legal** — rotular como tal seria falso |
| BD-5 | Exclusão durante candidatura ativa | **Distinguir** "retirar candidatura" de "apagar meus dados" | A primeira encerra o funil na hora; a segunda enfileira e executa após o encerramento |
| — | Revisor ≠ decisor | **Bloqueio duro** server-enforced | Viável com o quadro atual (4 admins + 1 recrutador ativos). Sem isso a revisão é teatro |
| — | Janela de arrependimento | **Sim, cancelável** | Rede de proteção sob uma ação irreversível — Storage não é coberto por backup nenhum |
| — | Art. 41 (encarregado/DPO) | **Fora** → M9 | Ato administrativo mais que engenharia; Res. CD/ANPD 2/2022 pode flexibilizar se a Beauty Smile for agente de pequeno porte (não verificado) |

## Restrições de ordenação — irreversíveis se violadas

1. **Snapshot de bias ANTES da primeira anonimização** (ERASE-01). `gerar_bias_snapshot()` faz join na `candidatos.data_nascimento` viva; anonimizar sem materializar a faixa etária corrompe a série EEOC 4/5 **permanentemente**.
2. **Storage ANTES de Auth** (ERASE-03). Imposição de plataforma: o Supabase recusa deletar usuário que possua objetos no Storage.
3. **Prova de consentimento não é retroativa** (CONSENT-02). A janela fecha a cada novo cadastro — se não entrar neste milestone, o histórico fica sem prova para sempre.
4. **Export ANTES do motor de exclusão** (EXPORT → ERASE). O inventário de PII do export **é** o plano de exclusão; a fase irreversível herda um artefato exercitado em vez de um palpite novo.

---

## v8.0 Requirements

### Inventário & Gates (INVENT) — nada destrutivo

- [ ] **INVENT-01**: Inventário de PII coluna-a-coluna classifica cada coluna em apagar / anonimizar / preservar, semeado do grafo de FK vivo (`FK-AUDIT-LIVE.md`), nunca de arquivos de migration
- [ ] **INVENT-02**: Status de PITR/backup verificado e registrado como fato datado — janela, ativo/inativo, e o registro explícito de que **Storage não é coberto por nenhum caminho de backup**
- [ ] **INVENT-03**: Diff entre os `cron.job` vivos e o repositório, com cada job vivo tendo origem rastreável a uma migration
- [ ] **INVENT-04**: Varredura do idioma `ADD COLUMN IF NOT EXISTS` em todas as migrations, identificando cláusulas FK silenciadas (causa identificada do drift `candidatos.user_id`)
- [ ] **INVENT-05**: Bug latente do `ai-logs-retention-cleanup` corrigido — `NOT IN` com subquery que pode conter NULL apaga zero linhas em silêncio

### Fila Art. 20 (REVISAO)

- [ ] **REVISAO-01**: RH é notificado quando um candidato solicita revisão da decisão (trigger na transição `revisao_solicitada_em` NULL→NOT NULL → EF `notificar-rh`)
- [ ] **REVISAO-02**: RH vê a fila de pedidos de revisão pendentes, ordenada por antiguidade, com badge de SLA **interno** (nunca exibido ao candidato)
- [x] **REVISAO-03**: RH registra o resultado da revisão em `revisao_resultado` por write-path auditável único
- [x] **REVISAO-04**: Candidato é notificado por e-mail quando sua revisão é respondida (5º evento do pipeline COMM)
- [x] **REVISAO-05**: Quem registrou a decisão **não pode** responder à revisão dela — bloqueio server-enforced, não aviso de UI
- [ ] **REVISAO-06**: Consulta que responde quantos pedidos de revisão já estão pendentes em PROD hoje, entregue **antes** de qualquer tela

### Consentimentos (CONSENT)

- [ ] **CONSENT-01**: Checkboxes de consentimento opcional nascem **desmarcados** — o `.default(true)` atual impede distinguir "marcou" de "não desmarcou"
- [ ] **CONSENT-02**: Cada consentimento é gravado com versão do texto + hash + timestamp, tornando pré/pós-enforcement distinguíveis por **dado**, não por inferência
- [ ] **CONSENT-03**: `autorizacao_comunicacao` separado em transacional (Art. 7º, V — sem opt-out) e marketing "novas oportunidades de vagas" (consentimento próprio)
- [ ] **CONSENT-04**: Candidato pode revogar o consentimento de marketing pelo painel, e a revogação é honrada no envio
- [ ] **CONSENT-05**: `autorizacao_analise_video` resolvido — hoje é promessa de **não** fazer algo, coletada e nunca lida

> **Estado parcial de CONSENT-01/02/03/05 após o plano 43-01 (2026-08-01) — deliberadamente NÃO marcados como completos.**
> O **lado SERVIDOR** está fechado em código: `_shared/schemas.ts` sem `.default(true)`,
> `_shared/autorizacoes-registro.ts` sem coalescência, hash SHA-256 calculado na EF, gravação
> fail-closed (BD-4), migration `20260801000001` e smoke escritos.
> **Falta, e sem isso o requirement não é observável:** os 6 sítios de `.default(true)` do
> CLIENTE (plano **43-03**), o **apply** da migration e o **deploy ORDENADO** da EF
> (checkpoint **43-07**). Enquanto a migration não for aplicada, a EF grava em colunas que não
> existem. Marcar `[x]` aqui afirmaria em `.planning/` exatamente a classe de coisa que esta
> fase existe para eliminar — um consentimento declarado sem código que o execute.

- [ ] **CONSENT-06**: Click tracking desligado no Resend — rastrear cliques em e-mail transacional é coleta não consentida

### Política de Retenção (RETEN) — configuração, zero ação destrutiva

- [ ] **RETEN-01**: Janela de retenção vive em tabela de configuração por estado da candidatura, alterável sem deploy
- [ ] **RETEN-02**: Seed inicial de 2 anos (BD-1), documentado como teto consentido e não como recomendação técnica
- [ ] **RETEN-03**: `autorizacao_retencao_curriculo` é consumido como base legal da retenção do currículo — primeiro consumidor real de um consentimento até hoje órfão
- [ ] **RETEN-04**: View read-only de prévia ("estes N candidatos seriam purgados") como artefato de revisão próprio, sem qualquer ação destrutiva
- [ ] **RETEN-05**: Regra de retenção de `notificacoes_enviadas` definida e aplicada — dívida explicitamente diferida pela P37 a este milestone
- [x] **RETEN-06**: Avaliado o reuso do padrão `retain_until` já vivo em `ai_call_logs` antes de projetar estrutura nova

### Exportação & Acesso (EXPORT)

- [ ] **EXPORT-01**: Candidato solicita cópia dos próprios dados pelo painel
- [ ] **EXPORT-02**: Export em JSON por allowlist explícita de colunas — nunca `select('*')`, a classe de vulnerabilidade nº 1 recorrente deste projeto
- [ ] **EXPORT-03**: Currículo entregue por signed URL de TTL curto a partir de bucket privado, nunca inline nem base64
- [ ] **EXPORT-04**: Chaves do export cobertas por snapshot test — uma coluna nova no banco não pode vazar silenciosamente para o export
- [ ] **EXPORT-05**: Pedido de acesso atendido dentro do prazo do **Art. 19, II** (15 dias corridos)
- [ ] **EXPORT-06**: O inventário construído aqui é o artefato consumido pelo motor de exclusão (EXPORT antes de ERASE)

### Motor de Exclusão & Anonimização (ERASE)

- [ ] **ERASE-01**: Snapshot do agregado de bias com faixa etária materializada no tombstone, executado **antes** de qualquer anonimização
- [ ] **ERASE-02**: RPC `SECURITY DEFINER` de anonimização in-place (tombstone), uma transação para a metade Postgres — nunca hard-delete, nunca extensão `anon` (indisponível), nunca crypto-shredding
- [ ] **ERASE-03**: EF `executar-direito-titular` executa na ordem **Storage → Postgres → Auth**, idempotente em cada passo
- [ ] **ERASE-04**: Caminhos do Storage capturados no plano **antes** de qualquer mutação — uma falha parcial não pode perder os ponteiros permanentemente
- [ ] **ERASE-05**: "Retirar candidatura" (encerra o funil imediatamente) é distinto de "apagar meus dados" (enfileira e executa após o encerramento)
- [ ] **ERASE-06**: Pedido de exclusão tem janela de arrependimento cancelável pelo candidato no painel
- [ ] **ERASE-07**: Recibo honesto em duas colunas — o que foi apagado / o que foi mantido, anonimizado, sob qual artigo — sem superestimar o que foi feito
- [ ] **ERASE-08**: Trilha de auditoria intacta — as 3 FKs `NO ACTION` (`historico_candidatura`, `decisao_final`, `decisao_final_historico`) **nunca** relaxadas para CASCADE
- [ ] **ERASE-09**: As 5 tabelas com FK `SET NULL` (`ai_call_logs`, `candidate_ai_decisions`, `logs_acesso`, `recruiter_alerts`, `autorizacoes`) tratadas explicitamente — sobrevivem a qualquer CASCADE deixando linhas órfãs
- [ ] **ERASE-10**: Anonimização é irreversível de verdade — `user_id` apontando para linha viva do Auth é pseudonimização (Art. 12 §1º) e não desincumbe o titular

### Purga Automática (PURGA)

- [ ] **PURGA-01**: Cron de purga espelhando o padrão já provado do `notif-retry-sweep`
- [ ] **PURGA-02**: Modo dry-run executa a **mesma** query do delete real, envolvida em rollback — um dry-run que diverge do predicado real é decoração
- [ ] **PURGA-03**: Primeira ativação em PROD é dry-run, por período documentado, antes de qualquer execução real
- [ ] **PURGA-04**: O flip dry-run→live é checkpoint separado e evidenciado, espelhando a disciplina `NOTIFICACOES_MODO=teste→producao` do M7
- [ ] **PURGA-05**: Cap de blast-radius por execução + kill switch
- [ ] **PURGA-06**: Ledger de execuções de purga — o que foi apagado, quando, sob qual política
- [ ] **PURGA-07**: Predicado de retenção não engole linhas por NULL — `COALESCE` explícito e allowlist de estados terminais, nunca denylist de estados ativos

### Transparência (TRANSP)

- [ ] **TRANSP-01**: Página informando com quem os dados são compartilhados (**Art. 18, VII**) — Resend, provedor de LLM, Supabase, Vercel
- [ ] **TRANSP-02**: Página "o que guardamos e por quê", derivada da matriz de retenção como dado

### Consolidação (CONSOL)

- [ ] **CONSOL-01**: Cobertura Nyquist das 6 fases sem veredito — 36/38/39/41 em `draft`, 37/40 sem arquivo
- [ ] **CONSOL-02**: W-1 — Histórico (VISRH-03) mostra o nome do recrutador em vez do UUID do `ator`
- [ ] **CONSOL-03**: Zumbi `data_deletion_log` removido ou adotado com escritas reais (recomendação da pesquisa: construir tombstone novo e dropar o stub)
- [ ] **CONSOL-04**: Checklist "zumbi de compliance" — toda promessa de retenção/exclusão em comentário de migration ou doc tem código que a executa

---

## Requirements Futuros (M9+)

### TALENT

- **TALENT-01**: Banco de talentos + re-candidatura — o M8 é sua pré-condição (base legal, janela e saída do titular)

### Compliance (não puxado)

- **DPO-01**: Encarregado/DPO nomeado e publicado (Art. 41) — verificar antes se a Beauty Smile é agente de pequeno porte (Res. CD/ANPD 2/2022)
- **INTL-01**: Transferência internacional ao provedor de LLM (Art. 33 + Res. 19/2024, cláusulas-padrão; período de graça encerrado em ago/2025)
- **PORT-01**: Portabilidade a outro controlador (Art. 18, V) — dormente até a ANPD regulamentar; não construir contra norma inexistente

### Outros

- **PSICO**, **RELAT** (relatórios + export CSV/PDF), **WhatsApp**, **COMM v2**, **onboarding pós-aprovação**

---

## Out of Scope

| Feature | Razão |
|---------|-------|
| Hard-delete do candidato | Estruturalmente impossível sem quebrar a espinha de auditoria (3 FKs `NO ACTION`) e a garantia probatória da RNF-07a. Art. 12 *caput* + Art. 16, IV tornam a anonimização suficiente |
| Extensão `anon` / PostgreSQL Anonymizer | Confirmado **ausente** de `pg_available_extensions` — não é "não instalada", é não-instalável |
| Crypto-shredding | Técnica legítima, ferramenta errada aqui: forçaria reescrever todo caminho de leitura (RLS, allowlists, resolvers das EFs) num sistema vivo para chegar a uma postura que o Art. 16, IV já concede |
| Relaxar FK `NO ACTION` para CASCADE | É o reflexo errado diante do primeiro 23503 — destruiria a trilha de decisão humana que a RNF-07a existe para proteger |
| Opt-out do e-mail transacional | Roda sob Art. 7º, V (procedimento preliminar de contrato), não sobre consentimento. Decisão travada no M7 e preservada |
| Portabilidade a outro controlador | A ANPD ainda não regulamentou o Art. 18, V — construir contra norma inexistente é retrabalho garantido |
| Deletar `storage.objects` via SQL | Remove só o metadado e **órfã o blob permanentemente**, sem caminho de recuperação. O único caminho é a Storage Admin API a partir de Edge Function |

---

## Traceability

Preenchida na criação do roadmap (2026-07-29). **6 fases, 42–47.** Ordem de execução `42 → 43 → 44 → 45 → 46`, com **47 lateralmente paralelizável com 46**.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INVENT-01 | Phase 42 | Complete |
| INVENT-02 | Phase 42 | Complete |
| INVENT-03 | Phase 42 | Complete |
| INVENT-04 | Phase 42 | Complete |
| INVENT-05 | Phase 42 | Complete |
| REVISAO-01 | Phase 42 | Complete |
| REVISAO-02 | Phase 42 | Complete |
| REVISAO-03 | Phase 42 | Complete |
| REVISAO-04 | Phase 42 | Complete |
| REVISAO-05 | Phase 42 | Complete |
| REVISAO-06 | Phase 42 | Complete |
| CONSENT-01 | Phase 43 | In Progress (servidor em 43-01; cliente em 43-03; apply/deploy em 43-07) |
| CONSENT-02 | Phase 43 | In Progress (servidor em 43-01; cliente em 43-03; apply/deploy em 43-07) |
| CONSENT-03 | Phase 43 | In Progress (servidor em 43-01; cliente em 43-03; apply/deploy em 43-07) |
| CONSENT-04 | Phase 43 | Pending |
| CONSENT-05 | Phase 43 | In Progress (servidor em 43-01; cliente em 43-03; apply/deploy em 43-07) |
| CONSENT-06 | Phase 43 | Pending |
| RETEN-01 | Phase 43 | Pending |
| RETEN-02 | Phase 43 | Pending |
| RETEN-03 | Phase 43 | Pending |
| RETEN-04 | Phase 43 | Pending |
| RETEN-05 | Phase 46 | Pending |
| RETEN-06 | Phase 43 | Complete |
| EXPORT-01 | Phase 44 | Pending |
| EXPORT-02 | Phase 44 | Pending |
| EXPORT-03 | Phase 44 | Pending |
| EXPORT-04 | Phase 44 | Pending |
| EXPORT-05 | Phase 44 | Pending |
| EXPORT-06 | Phase 44 | Pending |
| ERASE-01 | Phase 45 | Pending |
| ERASE-02 | Phase 45 | Pending |
| ERASE-03 | Phase 45 | Pending |
| ERASE-04 | Phase 45 | Pending |
| ERASE-05 | Phase 45 | Pending |
| ERASE-06 | Phase 45 | Pending |
| ERASE-07 | Phase 45 | Pending |
| ERASE-08 | Phase 45 | Pending |
| ERASE-09 | Phase 45 | Pending |
| ERASE-10 | Phase 45 | Pending |
| PURGA-01 | Phase 46 | Pending |
| PURGA-02 | Phase 46 | Pending |
| PURGA-03 | Phase 46 | Pending |
| PURGA-04 | Phase 46 | Pending |
| PURGA-05 | Phase 46 | Pending |
| PURGA-06 | Phase 46 | Pending |
| PURGA-07 | Phase 46 | Pending |
| TRANSP-01 | Phase 47 | Pending |
| TRANSP-02 | Phase 47 | Pending |
| CONSOL-01 | Phase 47 | Pending |
| CONSOL-02 | Phase 47 | Pending |
| CONSOL-03 | Phase 47 | Pending |
| CONSOL-04 | Phase 47 | Pending |

**Coverage:**

- v8.0 requirements: **52** total (INVENT 5 · REVISAO 6 · CONSENT 6 · RETEN 6 · EXPORT 6 · ERASE 10 · PURGA 7 · TRANSP 2 · CONSOL 4)
- Mapeados a fases: **52** ✓
- Não mapeados: **0** ✓
- Duplicados (requirement em mais de uma fase): **0** ✓

**Por fase:**

| Phase | Nome | Reqs | Categorias |
|-------|------|------|------------|
| 42 | Inventário, Gates & Fila Art. 20 | 11 | INVENT (5) + REVISAO (6) |
| 43 | Consentimentos Honestos & Política de Retenção | 11 | CONSENT (6) + RETEN (5 de 6) |
| 44 | Exportação & Acesso | 6 | EXPORT (6) |
| 45 | Motor de Exclusão & Anonimização ⚠️ | 10 | ERASE (10) |
| 46 | Purga Automática (dry-run → live) | 8 | PURGA (7) + RETEN-05 |
| 47 | Transparência & Consolidação | 6 | TRANSP (2) + CONSOL (4) |

**Duas categorias atravessam fronteira de fase — deliberadamente:**

- **RETEN-05** (retenção de `notificacoes_enviadas`) fica na **Phase 46**, não na 43. A *linha* na matriz de retenção nasce com RETEN-01 na Phase 43, mas o requirement diz "definida **e aplicada**" — e a aplicação é um `DELETE` por cron. Pôr um cron destrutivo na Phase 43 quebraria a propriedade que define aquela fase (*zero ação destrutiva*), que é justamente o que a torna segura de executar cedo.
- **TRANSP** fica na **Phase 47**, não na 43. TRANSP-02 ("o que guardamos e por quê") tem de descrever o que o sistema **faz**, não o que promete. Escrita na 43 descreveria intenção — exatamente o teatro de compliance que este milestone existe para remover. Pareada com CONSOL-04 (checklist "toda promessa tem código que a executa"), a página pública e a auditoria se checam mutuamente.

**Restrições de ordenação — verificação de conformidade do mapeamento:**

| # | Restrição | Satisfeita? |
|---|-----------|-------------|
| 1 | ERASE-01 antes de qualquer anonimização | ✓ intra-fase (Phase 45, primeira wave, must-have de plano) |
| 2 | Storage antes do Auth `deleteUser` (ERASE-03) | ✓ intra-fase (Phase 45, ordem fixa) |
| 3 | CONSENT-02 embarca neste milestone | ✓ Phase 43 (2ª de 6), antes de EXPORT e ERASE |
| 4 | EXPORT completo antes do motor de exclusão | ✓ Phase 44 → Phase 45, cadeia estrita |

---
*Requirements definidos: 2026-07-29*
*Última atualização: 2026-07-29 — traceability preenchida pelo roadmapper (52/52 mapeados, 0 órfãos)*
