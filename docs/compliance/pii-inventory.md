# Inventário de PII — visão legível (gerado)

> ⚠️ **Arquivo GERADO** de [`pii-inventory.yaml`](./pii-inventory.yaml) por `docs/compliance/sql/gen-pii-md.cjs`.
> Não editar à mão — em caso de divergência, **o YAML vence**.

| Campo | Valor |
|-------|-------|
| Requirement | **INVENT-01** |
| Data de coleta | **2026-07-29T14:08:18Z** |
| Query reprodutora | `docs/compliance/sql/01-pii-catalog.sql` |
| Semente | `.planning/research/FK-AUDIT-LIVE.md` |
| Escopo | 64 tabelas · 993 colunas · 102 FKs (26 para auth.users) |

**Fonte:** Catálogo VIVO de PROD (information_schema.columns + pg_constraint), projeto isljnozzlvckrgjjbjwp, via execute_sql do MCP do Supabase. NUNCA derivado de arquivos de migration — o DDL base de ~40 tabelas legadas vive fora do ledger, em docs/sql/sql/*.sql (49 scripts), e um inventário que lê só supabase/migrations/ enxerga um fragmento do schema.

## Vocabulário

| Classificação | Significado |
|---------------|-------------|
| 🗑️ apagar | Dado pessoal sem função probatória. Pode ser removido ou zerado na execução do direito do titular sem quebrar auditoria nem invariante do sistema. |
| 🎭 anonimizar | Dado pessoal cuja LINHA precisa sobreviver (FK NO ACTION, série longitudinal, prova de não-discriminação), mas cujo CONTEÚDO identificante deve ser destruído in-place (tombstone). Art. 12 caput + Art. 16, IV. |
| 🔒 preservar | Não é dado pessoal, OU é dado cuja preservação é exigida por obrigação legal/probatória (Art. 7º, II e Art. 16, I). Sobrevive intacto. |
| ⚠️ preservar c/ ressalva | Estruturalmente não-PII, mas pode CARREGAR PII digitada por humano ou embutida por IA em campo livre/JSONB. Exige tratamento caso a caso na Phase 45 — não pode ser classificado em massa. |

## Regras de cobertura

Toda coluna do schema `public` está classificada — por regra, ou por entrada explícita. **Entrada explícita sempre vence a regra.**

| Regra | Padrão | Classificação | Razão |
|-------|--------|---------------|-------|
| **R1** | id, *_id (chaves técnicas), created_at, updated_at, deleted_at, *_em | 🔒 preservar | Identificador técnico ou carimbo temporal — não identifica pessoa por si só. |
| **R2** | user_id, candidato_id, usuario_id, ator, por_usuario, revisada_por, avaliador_id, agendado_por, realizado_por, solicitado_por, revogado_por, created_by, updated_by | 🎭 anonimizar | Ponteiro para pessoa. Apagar quebra FK NO ACTION da trilha de auditoria; preservar mantém vínculo identificante. ERASE-10: user_id apontando para linha VIVA do Auth é pseudonimização (Art. 12 §1º) e NÃO desincumbe o titular — a linha do Auth tem de morrer junto. |
| **R3** | flags booleanas, contadores, enums de status/etapa, scores numéricos, timestamps de fluxo | 🔒 preservar | Estado de processo, não atributo de pessoa. |
| **R4** | campos de configuração de vaga, biblioteca de perguntas, templates, itens de teste | 🔒 preservar | Conteúdo do produto, não do candidato. |
| **R5** | colunas jsonb de análise de IA (analise_ia*, raw_response, conteudo_jsonb, metadata, dados_antes, dados_depois) | ⚠️ preservar c/ ressalva | Estrutura não-PII, conteúdo potencialmente PII embutida por IA ou por captura de estado. Phase 45 precisa inspecionar, não classificar em massa. |

## Tabelas com PII — classificação explícita

### `candidatos`

> Núcleo de PII do titular. Alvo primário da anonimização.
> 
> **FK → auth.users:** `candidatos_user_id_fkey → auth.users(id) ON DELETE CASCADE (VIVO, confirmado em PROD)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `nome_completo` | 🎭 anonimizar | varchar | Tombstone: substituir por marcador não-reversível |
| `email` | 🎭 anonimizar | varchar | UNIQUE — o tombstone precisa preservar unicidade |
| `celular` | 🗑️ apagar | varchar |  |
| `cpf` | 🗑️ apagar | varchar | Identificador nacional direto. Nullable hoje |
| `data_nascimento` | 🎭 anonimizar | date | ⚠ ERASE-01 — a FAIXA ETÁRIA tem de ser materializada no tombstone ANTES de anonimizar, senão gerar_bias_snapshot() corrompe a série EEOC 4/5 em silêncio e para sempre |
| `genero` | 🎭 anonimizar | varchar | Mesma restrição do bias snapshot |
| `cep` | 🗑️ apagar | varchar |  |
| `logradouro` | 🗑️ apagar | varchar |  |
| `numero` | 🗑️ apagar | varchar |  |
| `complemento` | 🗑️ apagar | varchar |  |
| `bairro` | 🗑️ apagar | varchar |  |
| `cidade` | 🎭 anonimizar | varchar | NOT NULL — não pode ser apagada, só generalizada |
| `estado` | 🎭 anonimizar | char | NOT NULL. Granularidade UF é útil ao bias snapshot |
| `instagram` | 🗑️ apagar | varchar |  |
| `instagram_url` | 🗑️ apagar | varchar |  |
| `linkedin` | 🗑️ apagar | varchar |  |
| `linkedin_url` | 🗑️ apagar | varchar |  |
| `avatar_url` | 🗑️ apagar | varchar | ⚠ Aponta para Storage — ERASE-04 exige capturar o caminho ANTES de mutar |
| `como_conheceu` | 🔒 preservar | varchar | Categórico de marketing |
| `como_conheceu_detalhes` | 🗑️ apagar | text | Texto livre — pode conter nome de terceiro |
| `bloqueado_motivo` | ⚠️ preservar c/ ressalva | text | Texto livre do RH; pode conter PII digitada |
| `email_verificado` | 🔒 preservar | boolean |  |
| `bloqueado` | 🔒 preservar | boolean |  |
| `ativo` | 🔒 preservar | boolean |  |
| `data_ultimo_acesso` | 🗑️ apagar | timestamptz | Comportamental |
| `user_id` | 🎭 anonimizar | R2 |  |
| `created_by` | 🎭 anonimizar | R2 |  |
| `updated_by` | 🎭 anonimizar | R2 |  |

### `candidaturas`

> Vínculo candidato↔vaga. Carrega currículo e texto livre do RH.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `curriculo_url` | 🗑️ apagar | text | ⚠ Ponteiro de Storage — ERASE-04. Storage NÃO tem backup (ver backup-posture.md) |
| `curriculo_nome_original` | 🗑️ apagar | text | Nome de arquivo costuma conter o nome da pessoa |
| `curriculo_tamanho_bytes` | 🔒 preservar | integer |  |
| `observacoes_rh` | ⚠️ preservar c/ ressalva | text |  |
| `motivo_rejeicao` | ⚠️ preservar c/ ressalva | text | Prova de não-discriminação (Art. 7º, VI) vs. texto livre — decisão BD-9 |
| `feedback_rejeicao` | ⚠️ preservar c/ ressalva | text |  |
| `etapa_justificativa` | ⚠️ preservar c/ ressalva | text |  |
| `origem_candidatura` | 🔒 preservar | text |  |
| `analise_ia_bigfive` | ⚠️ preservar c/ ressalva | R5 |  |
| `analise_ia_cultura` | ⚠️ preservar c/ ressalva | R5 |  |
| `analise_ia_disc` | ⚠️ preservar c/ ressalva | R5 |  |
| `analise_ia_entrevista_online` | ⚠️ preservar c/ ressalva | R5 |  |
| `analise_ia_entrevista_presencial` | ⚠️ preservar c/ ressalva | R5 |  |
| `analise_ia_formulario` | ⚠️ preservar c/ ressalva | R5 |  |
| `analise_ia_raven` | ⚠️ preservar c/ ressalva | R5 |  |

### `autorizacoes`

> Prova de consentimento. Base legal — preservação tem função probatória.
> 
> **FK → auth.users:** `autorizacoes_user_id_fkey → auth.users(id) ON DELETE SET NULL (VIVO)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `autorizacao_uso_dados` | 🔒 preservar | boolean | Prova de base legal |
| `autorizacao_comunicacao` | 🔒 preservar | boolean | BD-2 em aberto |
| `autorizacao_retencao_curriculo` | 🔒 preservar | boolean | RETEN-03 — 1º consumidor real na Phase 43 |
| `autorizacao_analise_video` | 🔒 preservar | boolean | CONSENT-05 — hoje coletado e nunca lido |
| `policy_version` | 🔒 preservar | text |  |
| `ip_aceite` | 🎭 anonimizar | inet | IP é dado pessoal, mas é a prova do aceite. Truncar em vez de apagar |
| `user_agent_aceite` | 🎭 anonimizar | text |  |
| `user_id` | 🎭 anonimizar | R2 | ⚠ ERASE-09 — SET NULL deixa linha órfã sobrevivendo a qualquer CASCADE |
| `candidato_id` | 🎭 anonimizar | R2 |  |

### `decisao_final`

> ⚠ ESPINHA DE AUDITORIA. FK NO ACTION — NUNCA relaxar para CASCADE (ERASE-08).
> 
> **FK → auth.users:** `decisao_final_por_usuario_fkey → auth.users(id) — SEM ON DELETE (= NO ACTION)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `decisao` | 🔒 preservar | enum | RNF-07a — prova de que houve decisão humana |
| `justificativa` | ⚠️ preservar c/ ressalva | text | ⚠ BD-9 EM ABERTO — ≥50 chars digitados por humano; é simultaneamente prova de não-discriminação (Art. 7º, VI) e vetor de PII de terceiro. Decisão do operador, não da engenharia |
| `por_usuario` | 🔒 preservar | uuid | NOT NULL = guardrail LGPD-02. É funcionário, não titular — preservar |
| `em` | 🔒 preservar | timestamptz |  |
| `explicacao_solicitada_em` | 🔒 preservar | timestamptz |  |
| `revisao_solicitada_em` | 🔒 preservar | timestamptz | Art. 20 — prova de exercício de direito |
| `revisao_resultado` | ⚠️ preservar c/ ressalva | text | Passa a ser a justificativa da revisão na Phase 42 |
| `candidatura_id` | 🔒 preservar | uuid |  |

### `decisao_final_historico`

> ⚠ ESPINHA DE AUDITORIA append-only. FK NO ACTION (ERASE-08).

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `justificativa` | ⚠️ preservar c/ ressalva | text | Mesma ressalva BD-9 de decisao_final |
| `por_usuario` | 🔒 preservar | uuid |  |
| `decisao` | 🔒 preservar | enum |  |
| `decidido_em` | 🔒 preservar | timestamptz |  |
| `arquivado_em` | 🔒 preservar | timestamptz |  |
| `candidatura_id` | 🔒 preservar | uuid |  |

### `historico_candidatura`

> ⚠ ESPINHA DE AUDITORIA. FK NO ACTION (ERASE-08).
> 
> **FK → auth.users:** `historico_candidatura_ator_fkey → auth.users(id) — SEM ON DELETE (= NO ACTION)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `ator` | 🔒 preservar | uuid | W-1/CONSOL-02 — hoje renderiza UUID em vez do nome; Phase 47 |
| `etapa_de` | 🔒 preservar | enum |  |
| `etapa_para` | 🔒 preservar | enum |  |
| `criterio_texto` | ⚠️ preservar c/ ressalva | text |  |
| `auto_rejeitado` | 🔒 preservar | boolean | RNF-07a — prova de que NÃO houve rejeição automática |

### `logs_acesso`

> Telemetria de autenticação. ERASE-09 — SET NULL deixa órfã.
> 
> **FK → auth.users:** `logs_acesso_user_id_fkey → auth.users(id) ON DELETE SET NULL (VIVO)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `ip_address` | 🗑️ apagar | inet | NOT NULL — apagar exige tornar nullable ou truncar |
| `email_tentativa` | 🗑️ apagar | varchar |  |
| `device_info` | 🗑️ apagar | text |  |
| `browser` | 🗑️ apagar | varchar |  |
| `operating_system` | 🗑️ apagar | varchar |  |
| `device_type` | 🗑️ apagar | varchar |  |
| `city` | 🗑️ apagar | varchar |  |
| `country` | 🔒 preservar | varchar | Granularidade de país é agregável |
| `evento` | 🔒 preservar | varchar |  |
| `erro_mensagem` | ⚠️ preservar c/ ressalva | text |  |
| `user_id` | 🎭 anonimizar | R2 |  |

### `sessoes_ativas`

> Sessões. CASCADE para auth.users — morre junto com o Auth.
> 
> **FK → auth.users:** `sessoes_ativas_user_id_fkey → auth.users(id) ON DELETE CASCADE (VIVO)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `session_token` | 🗑️ apagar | varchar | Credencial — deve morrer antes de tudo |
| `ip_address` | 🗑️ apagar | inet |  |
| `device_info` | 🗑️ apagar | text |  |
| `browser` | 🗑️ apagar | varchar |  |
| `operating_system` | 🗑️ apagar | varchar |  |
| `device_type` | 🗑️ apagar | varchar |  |
| `city` | 🗑️ apagar | varchar |  |
| `country` | 🗑️ apagar | varchar |  |
| `user_id` | 🎭 anonimizar | R2 |  |
| `revogado_por` | 🔒 preservar | uuid | Funcionário |

### `logs_auditoria`

> Trilha de auditoria geral.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `ip_address` | 🗑️ apagar | inet |  |
| `user_agent` | 🗑️ apagar | text |  |
| `dados_antes` | ⚠️ preservar c/ ressalva | R5 | ⚠ Snapshot de estado — pode conter PII completa da linha alterada |
| `dados_depois` | ⚠️ preservar c/ ressalva | R5 | ⚠ idem |
| `descricao` | ⚠️ preservar c/ ressalva | text |  |
| `acao` | 🔒 preservar | text |  |
| `usuario_id` | 🎭 anonimizar | R2 |  |

### `notificacoes_enviadas`

> Ledger de e-mail. RETEN-05 — regra de retenção própria, diferida da P37.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `destinatario_email` | 🗑️ apagar | text |  |
| `destinatario_original` | 🗑️ apagar | text | Guarda o e-mail real mesmo em modo teste |
| `dedupe_key` | 🔒 preservar | text |  |
| `evento` | 🔒 preservar | text |  |
| `template` | 🔒 preservar | text |  |
| `status` | 🔒 preservar | enum |  |
| `provider_message_id` | 🔒 preservar | text |  |
| `ultimo_erro` | ⚠️ preservar c/ ressalva | text |  |
| `candidato_id` | 🎭 anonimizar | R2 |  |
| `candidatura_id` | 🔒 preservar | uuid |  |

### `entrevistas_online`

> Conteúdo de entrevista — alta densidade de PII.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `transcricao` | 🗑️ apagar | text | Fala literal do titular |
| `gravacao_url` | 🗑️ apagar | text | ⚠ Ponteiro de Storage — ERASE-04 |
| `gravacao_tamanho_mb` | 🔒 preservar | numeric |  |
| `feedback_candidato` | 🗑️ apagar | text |  |
| `resumo_ia` | 🗑️ apagar | text |  |
| `analise_ia` | ⚠️ preservar c/ ressalva | R5 |  |
| `notas_durante` | ⚠️ preservar c/ ressalva | text |  |
| `notas_preparacao` | ⚠️ preservar c/ ressalva | text |  |
| `observacoes_gerais` | ⚠️ preservar c/ ressalva | text |  |
| `link_videochamada` | 🗑️ apagar | text |  |
| `agendado_por` | 🔒 preservar | uuid | Funcionário |
| `realizado_por` | 🔒 preservar | uuid | Funcionário |

### `entrevistas_presenciais`

> Idem online, mais documentos apresentados.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `documentos_apresentados` | 🗑️ apagar | R5 | ⚠ Pode listar RG/CPF/CNH |
| `documentos_necessarios` | 🔒 preservar | R4 |  |
| `primeira_impressao` | ⚠️ preservar c/ ressalva | text | ⚠ Campo de impressão subjetiva — risco de viés registrado |
| `notas_durante` | ⚠️ preservar c/ ressalva | text |  |
| `notas_preparacao` | ⚠️ preservar c/ ressalva | text |  |
| `observacoes_gerais` | ⚠️ preservar c/ ressalva | text |  |
| `instrucoes_acesso` | 🔒 preservar | text |  |
| `local_entrevista` | 🔒 preservar | text |  |
| `sala_numero` | 🔒 preservar | text |  |

### `entrevista_analises`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `citacoes` | 🗑️ apagar | R5 | Trechos literais da fala do titular |
| `notas_humanas` | ⚠️ preservar c/ ressalva | text |  |
| `competencias` | ⚠️ preservar c/ ressalva | R5 |  |
| `bias_flags` | 🔒 preservar | R5 | Insumo de auditoria de viés |
| `scores_humanos` | 🔒 preservar | R5 |  |
| `revisada_por` | 🔒 preservar | uuid | Funcionário |

### `redacoes_candidato`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `texto` | 🗑️ apagar | text | Produção escrita do titular |
| `texto_hash` | 🔒 preservar | text | Hash — permite detectar plágio sem guardar o texto |
| `notas_revisor` | ⚠️ preservar c/ ressalva | text |  |
| `analise_ia` | ⚠️ preservar c/ ressalva | R5 |  |
| `scores_dimensao` | 🔒 preservar | R5 |  |
| `scores_humanos` | 🔒 preservar | R5 |  |
| `decisao_revisor` | 🔒 preservar | text |  |
| `revisada_por` | 🔒 preservar | uuid | Funcionário |

### `redacoes_candidato_em_progresso`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `texto_em_progresso` | 🗑️ apagar | text |  |
| `user_agent` | 🗑️ apagar | text |  |

### `respostas_cultura`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `resposta_texto` | 🗑️ apagar | text |  |

### `respostas_formulario`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `resposta_texto` | 🗑️ apagar | text |  |
| `resposta_opcoes` | ⚠️ preservar c/ ressalva | R5 |  |
| `resposta_numerica` | 🔒 preservar | numeric |  |

### `devolutivas_candidato`

> 
> **FK → auth.users:** `devolutivas_candidato_candidato_id_fkey → auth.users(id) ON DELETE CASCADE (VIVO)`

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `conteudo_jsonb` | 🗑️ apagar | R5 | Devolutiva comportamental completa do titular |
| `candidato_id` | 🎭 anonimizar | R2 |  |

### `ai_call_logs`

> ⚠ Alvo do INVENT-05. ERASE-09 — SET NULL deixa órfã. 0 linhas em 2026-07-29.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `system_prompt` | 🔒 preservar | text | Template, não dado do titular |
| `user_prompt_template` | 🔒 preservar | text |  |
| `raw_response` | 🗑️ apagar | R5 | ⚠ Contém o payload enviado à LLM — pode embutir PII completa |
| `parsed_reasoning` | 🗑️ apagar | text |  |
| `parsed_score` | 🔒 preservar | numeric |  |
| `prompt_hash` | 🔒 preservar | text |  |
| `retain_until` | 🔒 preservar | timestamptz | RETEN-06 — padrão de retenção JÁ VIVO, avaliar reuso antes de projetar estrutura nova |
| `candidato_id` | 🎭 anonimizar | R2 |  |

### `candidate_ai_decisions`

> ERASE-09 — SET NULL deixa órfã. 0 linhas em 2026-07-29.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `ai_reasoning_summary` | 🗑️ apagar | text |  |
| `ai_composite_score` | 🔒 preservar | numeric |  |
| `ai_recommendation` | 🔒 preservar | text |  |
| `human_notes` | ⚠️ preservar c/ ressalva | text |  |
| `human_decision` | 🔒 preservar | text | RNF-07a |
| `human_overrode_ai` | 🔒 preservar | boolean | RNF-07a |
| `ai_call_log_ids` | 🔒 preservar | array | ⚠ INVENT-05 — é o array cujo NULL arma o bug do NOT IN |
| `candidato_id` | 🎭 anonimizar | R2 |  |
| `reviewer_id` | 🔒 preservar | uuid | Funcionário |

### `recruiter_alerts`

> ERASE-09 — SET NULL deixa órfã.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `message` | ⚠️ preservar c/ ressalva | text |  |
| `candidato_id` | 🎭 anonimizar | R2 |  |

### `rate_limit_check_duplicate`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `hash_cpf_email` | 🗑️ apagar | text | Hash de CPF+e-mail — pseudônimo, ainda vinculável |
| `x_forwarded_for` | 🗑️ apagar | text | IP |

### `agendamentos_entrevista`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `entrevistador` | 🔒 preservar | text | Funcionário |
| `local_ou_link` | 🔒 preservar | text |  |
| `observacoes_rh` | ⚠️ preservar c/ ressalva | text |  |
| `compareceu` | 🔒 preservar | boolean |  |

### `avaliacoes_rh`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `justificativa_recomendacao` | ⚠️ preservar c/ ressalva | text | Prova de não-discriminação; mesma tensão BD-9 |
| `observacoes` | ⚠️ preservar c/ ressalva | text |  |
| `pontos_fortes` | ⚠️ preservar c/ ressalva | array |  |
| `pontos_fracos` | ⚠️ preservar c/ ressalva | array |  |
| `avaliador_id` | 🔒 preservar | uuid | Funcionário |

### `disponibilidade`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `periodo_disponivel` | 🗑️ apagar | varchar |  |
| `regime_trabalho` | 🗑️ apagar | varchar |  |
| `disponibilidade_imediata` | 🗑️ apagar | boolean |  |
| `data_disponibilidade` | 🗑️ apagar | timestamptz |  |
| `candidato_id` | 🎭 anonimizar | R2 |  |

### `cognitivo_respostas`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `raw_responses` | 🗑️ apagar | R5 | Respostas do titular |
| `proctoring` | 🗑️ apagar | R5 | ⚠ Telemetria de vigilância durante a prova |
| `shuffle_seed` | 🔒 preservar | text |  |

### `respostas_bigfive`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `resposta` | 🗑️ apagar | integer | Resposta comportamental do titular |

### `respostas_disc`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `mais_caracteristico` | 🗑️ apagar | text |  |
| `menos_caracteristico` | 🗑️ apagar | text |  |

### `respostas_raven`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `resposta` | 🗑️ apagar | integer |  |

### `respostas_avaliacao`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `respostas` | 🗑️ apagar | R5 |  |

### `scores_bigfive`

> Score derivado — sensível (perfil comportamental)

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `analise_ia` | ⚠️ preservar c/ ressalva | R5 |  |

### `scores_disc`

> idem

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `analise_ia` | ⚠️ preservar c/ ressalva | R5 |  |

### `scores_raven`

> idem

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `analise_ia` | ⚠️ preservar c/ ressalva | R5 |  |

### `scores_candidato`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `citacoes` | 🗑️ apagar | R5 | Trechos literais |
| `red_flags` | 🔒 preservar | R5 |  |
| `metadata` | ⚠️ preservar c/ ressalva | R5 |  |

### `comparativo_solicitado`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `ranking` | ⚠️ preservar c/ ressalva | R5 | Pode embutir nomes |
| `candidatura_ids` | 🔒 preservar | array |  |
| `solicitado_por` | 🔒 preservar | uuid | Funcionário |

### `historico_acoes`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `descricao` | ⚠️ preservar c/ ressalva | text |  |
| `metadata` | ⚠️ preservar c/ ressalva | R5 |  |
| `usuario_id` | 🎭 anonimizar | R2 |  |

### `usuarios_rh`

> PII de FUNCIONÁRIO, não de titular candidato. Fora do escopo do direito do titular candidato — mas é dado pessoal e entra em qualquer pedido de um funcionário. Registrado para completude; a Phase 45 NÃO o toca.
> 
> **FK → auth.users:** `usuarios_rh_user_id_fkey → auth.users(id) ON DELETE CASCADE (VIVO)`
> 
> **População viva (2026-07-29):** {"administrador":4,"recrutador":1,"gerente":0,"visualizador":0}

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `nome_completo` | 🔒 preservar | varchar | Fora do escopo do titular candidato |
| `email` | 🔒 preservar | varchar |  |
| `telefone` | 🔒 preservar | varchar |  |
| `avatar_url` | 🔒 preservar | varchar |  |
| `cargo` | 🔒 preservar | varchar |  |
| `role` | 🔒 preservar | varchar | ⚠ CHECK = administrador|gerente|recrutador|visualizador — vocabulário DIFERENTE do JWT (administrador|rh|candidato) |

### `preferencias_notificacoes`

> PII de funcionário.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `whatsapp_numero` | 🔒 preservar | varchar | Fora do escopo do titular candidato |

### `configuracoes_empresa`

> Configuração da empresa. NÃO é dado de titular. Contém SEGREDOS.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `smtp_senha_encrypted` | 🔒 preservar | text | ⚠ SEGREDO — nunca pode entrar em export algum (EXPORT-02) |
| `webhook_secret` | 🔒 preservar | text | ⚠ SEGREDO — idem |
| `email_contato` | 🔒 preservar | text |  |
| `telefone_contato` | 🔒 preservar | text |  |
| `endereco_completo` | 🔒 preservar | text |  |

### `webhooks_config`

> Configuração. Contém SEGREDO.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `secret` | 🔒 preservar | text | ⚠ SEGREDO — nunca em export |

### `webhooks_logs`


| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `payload_enviado` | ⚠️ preservar c/ ressalva | R5 | ⚠ Payload pode conter PII completa |
| `resposta_recebida` | ⚠️ preservar c/ ressalva | R5 |  |

### `data_deletion_log`

> ADOTADA na Phase 47 sob o CONSOL-03 (decisão do operador, 2026-08-09). Trilha append-only de reversão de versão da biblioteca de prompts: `public.rollback_to_version` grava aqui a cada rollback administrativo de prompt de IA, no formato `prompt_rollback:<call_type>:<semver>`. Desde a Phase 47 esse mesmo escritor audita nos DOIS destinos — esta tabela e `public.log_auditoria` — na mesma transação, porque nenhuma tela lê esta tabela e uma trilha que ninguém consegue consultar não é trilha. SEM VÍNCULO COM TITULAR: quatro colunas, nenhuma FK, nenhum `candidato_id`, só `deletion_type` + timestamps. Por isso ela continua FORA do escopo do recibo de exclusão e do export do titular, e a classificação abaixo NÃO muda. O motor real de exclusão de titular deste projeto é a RPC de anonimização da Phase 45 (`public.anonimizar_candidato`), nunca esta tabela. O que tornava esta tabela um problema era o comentário de catálogo prometer uma função de exclusão de titular que a Phase 15 nunca criou — promessa corrigida pela migration `20260809000002`.

| Coluna | Classificação | Tipo | Nota |
|--------|---------------|------|------|
| `deletion_type` | 🔒 preservar | text |  |

## Tabelas sem PII de titular

Cobertas integralmente pela regra **R4** — Conteúdo do produto, catálogo de itens de teste ou configuração de vaga.

- `ai_cost_daily`
- `analise_candidato_vaga`
- `bias_audit_log`
- `biblioteca_perguntas`
- `bigfive_itens`
- `cognitivo_itens`
- `config_sla_etapa`
- `entrevista_guias`
- `pergunta_opcao_metadata`
- `perguntas`
- `perguntas_cultura`
- `perguntas_formulario`
- `perguntas_opcao_sjt`
- `perguntas_redacao`
- `perguntas_vaga_origem`
- `prompt_versions`
- `questoes_bigfive`
- `questoes_disc`
- `questoes_raven`
- `templates_email`
- `vagas`
- `vagas_associadas_recrutadores`

## Achados para a Phase 45

### A-01 — ERASE-01 é uma ordem, não uma preferência (alta)

candidatos.data_nascimento e candidatos.genero alimentam gerar_bias_snapshot().
Anonimizar antes de materializar a faixa etária no tombstone corrompe a série
longitudinal EEOC 4/5 de forma silenciosa e permanente.

### A-02 — Três ponteiros de Storage, e Storage não tem backup (alta)

candidatos.avatar_url, candidaturas.curriculo_url, entrevistas_online.gravacao_url.
ERASE-04 exige capturar os caminhos ANTES de qualquer mutação — uma falha
parcial perde os ponteiros permanentemente e órfã o blob para sempre.

### A-03 — As 5 tabelas SET NULL do ERASE-09 não apontam todas para auth.users (media)

Só autorizacoes.user_id e logs_acesso.user_id têm FK SET NULL para auth.users
(confirmado no catálogo vivo). ai_call_logs, candidate_ai_decisions e
recruiter_alerts referenciam candidatos/vagas, não auth.users diretamente.
O ERASE-09 precisa ser reformulado sobre o alvo certo.

### A-04 — BD-9 continua em aberto e agora tem 4 colunas, não 1 (media)

decisao_final.justificativa, decisao_final_historico.justificativa,
candidaturas.motivo_rejeicao e avaliacoes_rh.justificativa_recomendacao são
todas texto livre digitado por humano com função probatória. A decisão de
redigir vs. preservar tem de cobrir as quatro.

### A-05 — Segredos vivem em tabela do schema public (media)

configuracoes_empresa.smtp_senha_encrypted e .webhook_secret, e
webhooks_config.secret. A allowlist do export (EXPORT-02) tem de ser
construída por inclusão explícita — um select('*') aqui vaza credencial,
não só PII.

### A-06 — data_deletion_log — RESOLVIDO na Phase 47 por adoção (CONSOL-03) (baixa)

4 colunas, nenhuma FK, nenhum vínculo com titular — o fato de schema
continua valendo e é o que mantém a tabela fora do escopo do titular.
O achado em si está FECHADO: a tabela foi ADOTADA em 2026-08-09, não
removida. Ela recebe escrita real do rollback da biblioteca de prompts
desde 2026-06-09, e a migration `20260809000002` corrigiu o comentário de
catálogo que prometia uma função de exclusão de titular ausente — que era
o defeito de verdade, e não a existência da tabela.

## Totais

| Classificação | Colunas |
|---------------|--------:|
| 🎭 anonimizar | 23 |
| 🗑️ apagar | 65 |
| 🔒 preservar | 85 |
| ⚠️ preservar c/ ressalva | 50 |
| **Total explícito** | **223** |

Cobertura de tabelas: **64 / 64**.
