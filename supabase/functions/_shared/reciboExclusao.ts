/**
 * reciboExclusao.ts — ESPELHO GERADO do recibo de exclusão em duas colunas.
 *
 * Requirement: ERASE-07 · ERASE-09 · Phase 45
 * Consumidor: Edge Function de execução (supabase/functions/_shared/)
 *
 * ⚠ ARQUIVO GERADO por `docs/compliance/sql/gen-recibo-exclusao.cjs`.
 * NÃO EDITAR À MÃO — `--check` reprova qualquer divergência, e reprova
 * este arquivo SEPARADAMENTE do `.json` e do outro espelho: um `--check`
 * que olhasse só um dos três deixaria os outros apodrecer.
 *
 * POR QUE UM MÓDULO .ts E NÃO O IMPORT DO .json
 * Import estático de JSON saindo do diretório da Edge Function é a assunção
 * A1 da 44-RESEARCH e pode NÃO sobreviver ao bundler do deploy; e o frontend
 * não alcança `supabase/functions/` nem `docs/` (`@/` aponta para `src/`).
 * Uma fonte só (o gerador), três artefatos, os três sob `--check`.
 *
 * O recibo é DERIVADO, nunca digitado (45-UI-SPEC §Invariante 4): nenhuma
 * linha pode afirmar um apagamento sem um `passo_motor` que o execute.
 *
 * Regenerar: node docs/compliance/sql/gen-recibo-exclusao.cjs
 */
export const PASSOS_MOTOR = [
  "storage_remove",
  "tombstone_candidato",
  "tombstone_decisao_final",
  "severar_user_id",
  "severar_fks_set_null",
  "scrub_ledger_email",
  "auth_delete_user"
] as const;

export type PassoMotor = (typeof PASSOS_MOTOR)[number];

export const RECIBO_EXCLUSAO = {
  "aplicabilidade": [
    "sempre",
    "tem_curriculo",
    "tem_decisao_registrada"
  ],
  "cabecalhos": {
    "mantem": {
      "futuro": "O que a Beauty Smile mantém — e por quê",
      "passado": "O que a Beauty Smile mantém — e por quê"
    },
    "sai": {
      "futuro": "O que vai ser apagado",
      "passado": "O que é apagado"
    }
  },
  "colunas_mantem": [
    {
      "aplicavel_quando": "tem_decisao_registrada",
      "base_legal": "LGPD, Art. 7º, VI",
      "classificacoes_origem": [
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "avaliacoes_rh.justificativa_recomendacao",
        "candidaturas.motivo_rejeicao",
        "decisao_final.justificativa",
        "decisao_final_historico.justificativa"
      ],
      "item_id": "justificativa_do_recrutador",
      "obrigatorio": true,
      "rotulo": "A justificativa escrita pelo recrutador sobre a decisão",
      "texto_futuro": "Fica guardada sem ligação com você. Ela é a prova de que a decisão não foi discriminatória.",
      "texto_passado": "Ficou guardada sem ligação com você. Ela é a prova de que a decisão não foi discriminatória."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 7º, VI",
      "classificacoes_origem": [
        "preservar",
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "historico_candidatura.auto_rejeitado",
        "historico_candidatura.criterio_texto",
        "historico_candidatura.etapa_de",
        "historico_candidatura.etapa_para"
      ],
      "item_id": "historico_das_etapas",
      "obrigatorio": true,
      "rotulo": "O histórico das etapas do processo",
      "texto_futuro": "Fica guardado como registro do processo, sem ligação com você.",
      "texto_passado": "Ficou guardado como registro do processo, sem ligação com você."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 7º, VI — grupos com menos de 5 pessoas são suprimidos do relatório",
      "classificacoes_origem": [
        "preservar"
      ],
      "colunas_origem": [
        "candidatos.como_conheceu",
        "entrevista_analises.bias_flags"
      ],
      "item_id": "numeros_agregados",
      "obrigatorio": true,
      "rotulo": "Números agregados usados no relatório de não-discriminação",
      "texto_futuro": "Entram só em contagens, junto com outras pessoas. Ninguém consegue chegar a você a partir deles.",
      "texto_passado": "Entraram só em contagens, junto com outras pessoas. Ninguém consegue chegar a você a partir deles."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 8º, §1º",
      "classificacoes_origem": [
        "preservar"
      ],
      "colunas_origem": [
        "autorizacoes.autorizacao_analise_video",
        "autorizacoes.autorizacao_comunicacao",
        "autorizacoes.autorizacao_retencao_curriculo",
        "autorizacoes.autorizacao_uso_dados",
        "autorizacoes.policy_version"
      ],
      "item_id": "prova_do_consentimento",
      "obrigatorio": false,
      "rotulo": "O registro das autorizações que você deu",
      "texto_futuro": "Fica guardado sem ligação com você, como prova de que a Beauty Smile pediu e recebeu a sua autorização.",
      "texto_passado": "Ficou guardado sem ligação com você, como prova de que a Beauty Smile pediu e recebeu a sua autorização."
    },
    {
      "aplicavel_quando": "tem_decisao_registrada",
      "base_legal": "LGPD, Art. 20",
      "classificacoes_origem": [
        "preservar"
      ],
      "colunas_origem": [
        "candidate_ai_decisions.human_decision",
        "candidate_ai_decisions.human_overrode_ai",
        "decisao_final.decisao",
        "decisao_final.em",
        "decisao_final.explicacao_solicitada_em",
        "decisao_final.revisao_solicitada_em",
        "decisao_final_historico.arquivado_em",
        "decisao_final_historico.decidido_em",
        "decisao_final_historico.decisao"
      ],
      "item_id": "registro_da_decisao",
      "obrigatorio": false,
      "rotulo": "O registro de que uma pessoa decidiu sobre a sua candidatura",
      "texto_futuro": "Fica guardado, com a data, sem ligação com você. É a prova de que nenhuma decisão foi tomada por um sistema sozinho.",
      "texto_passado": "Ficou guardado, com a data, sem ligação com você. É a prova de que nenhuma decisão foi tomada por um sistema sozinho."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 7º, VI",
      "classificacoes_origem": [
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "agendamentos_entrevista.observacoes_rh",
        "avaliacoes_rh.observacoes",
        "avaliacoes_rh.pontos_fortes",
        "avaliacoes_rh.pontos_fracos",
        "candidate_ai_decisions.human_notes",
        "candidatos.bloqueado_motivo",
        "candidaturas.etapa_justificativa",
        "candidaturas.feedback_rejeicao",
        "candidaturas.observacoes_rh",
        "decisao_final.revisao_resultado",
        "entrevista_analises.notas_humanas",
        "entrevistas_online.notas_durante",
        "entrevistas_online.notas_preparacao",
        "entrevistas_online.observacoes_gerais",
        "entrevistas_presenciais.notas_durante",
        "entrevistas_presenciais.notas_preparacao",
        "entrevistas_presenciais.observacoes_gerais",
        "entrevistas_presenciais.primeira_impressao",
        "recruiter_alerts.message",
        "redacoes_candidato.notas_revisor"
      ],
      "item_id": "anotacoes_da_equipe",
      "obrigatorio": false,
      "rotulo": "As anotações que a equipe escreveu durante o processo",
      "texto_futuro": "Ficam guardadas sem ligação com você, como registro de como o processo foi conduzido.",
      "texto_passado": "Ficaram guardadas sem ligação com você, como registro de como o processo foi conduzido."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 7º, VI",
      "classificacoes_origem": [
        "preservar",
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "ai_call_logs.parsed_score",
        "candidate_ai_decisions.ai_composite_score",
        "candidate_ai_decisions.ai_recommendation",
        "candidaturas.analise_ia_bigfive",
        "candidaturas.analise_ia_cultura",
        "candidaturas.analise_ia_disc",
        "candidaturas.analise_ia_entrevista_online",
        "candidaturas.analise_ia_entrevista_presencial",
        "candidaturas.analise_ia_formulario",
        "candidaturas.analise_ia_raven",
        "comparativo_solicitado.ranking",
        "entrevista_analises.competencias",
        "entrevista_analises.scores_humanos",
        "entrevistas_online.analise_ia",
        "redacoes_candidato.analise_ia",
        "redacoes_candidato.scores_dimensao",
        "redacoes_candidato.scores_humanos",
        "respostas_formulario.resposta_opcoes",
        "scores_bigfive.analise_ia",
        "scores_candidato.metadata",
        "scores_candidato.red_flags",
        "scores_disc.analise_ia",
        "scores_raven.analise_ia"
      ],
      "item_id": "avaliacoes_e_analises",
      "obrigatorio": false,
      "rotulo": "As avaliações e as análises feitas no processo",
      "texto_futuro": "Ficam guardadas sem ligação com você, como registro de como a sua candidatura foi avaliada.",
      "texto_passado": "Ficaram guardadas sem ligação com você, como registro de como a sua candidatura foi avaliada."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 16, I",
      "classificacoes_origem": [
        "preservar",
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "historico_acoes.descricao",
        "historico_acoes.metadata",
        "logs_auditoria.acao",
        "logs_auditoria.dados_antes",
        "logs_auditoria.dados_depois",
        "logs_auditoria.descricao",
        "webhooks_logs.payload_enviado",
        "webhooks_logs.resposta_recebida"
      ],
      "item_id": "trilha_de_auditoria",
      "obrigatorio": false,
      "rotulo": "A trilha de auditoria do sistema",
      "texto_futuro": "Fica guardada sem ligação com você. Ela registra o que mudou no sistema e quando, e é o que permite auditar este próprio pedido.",
      "texto_passado": "Ficou guardada sem ligação com você. Ela registra o que mudou no sistema e quando, e é o que permite auditar este próprio pedido."
    },
    {
      "aplicavel_quando": "sempre",
      "base_legal": "LGPD, Art. 7º, IX",
      "classificacoes_origem": [
        "preservar",
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "logs_acesso.country",
        "logs_acesso.erro_mensagem",
        "logs_acesso.evento",
        "notificacoes_enviadas.ultimo_erro"
      ],
      "item_id": "registros_tecnicos_sem_identificacao",
      "obrigatorio": false,
      "rotulo": "Os registros técnicos que não apontam para você",
      "texto_futuro": "Ficam guardados o país e o tipo de cada evento, sem nada que aponte para você.",
      "texto_passado": "Ficaram guardados o país e o tipo de cada evento, sem nada que aponte para você."
    }
  ],
  "colunas_sai": [
    {
      "aplicavel_quando": "tem_curriculo",
      "classificacoes_origem": [
        "apagar"
      ],
      "colunas_origem": [
        "candidaturas.curriculo_url"
      ],
      "item_id": "arquivo_do_curriculo",
      "passo_motor": "storage_remove",
      "passo_motor_onde": "Edge Function (Storage Admin API) — plano 45-10",
      "rotulo": "O arquivo do seu currículo",
      "texto_futuro": "Vai ser apagado do nosso armazenamento. O arquivo em si deixa de existir, e não há como trazê-lo de volta depois.",
      "texto_passado": "Foi apagado do nosso armazenamento. O arquivo em si deixou de existir, e não há como trazê-lo de volta."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "apagar"
      ],
      "colunas_origem": [
        "candidatos.avatar_url",
        "entrevistas_online.gravacao_url"
      ],
      "item_id": "outros_arquivos_enviados",
      "passo_motor": "storage_remove",
      "passo_motor_onde": "Edge Function (Storage Admin API) — plano 45-10",
      "rotulo": "A sua foto de perfil e as gravações de entrevista",
      "texto_futuro": "Quando existirem, vão ser apagadas do nosso armazenamento junto com o currículo.",
      "texto_passado": "Quando existiam, foram apagadas do nosso armazenamento junto com o currículo."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "anonimizar",
        "apagar"
      ],
      "colunas_origem": [
        "candidatos.bairro",
        "candidatos.celular",
        "candidatos.cep",
        "candidatos.cidade",
        "candidatos.como_conheceu_detalhes",
        "candidatos.complemento",
        "candidatos.cpf",
        "candidatos.created_by",
        "candidatos.data_nascimento",
        "candidatos.data_ultimo_acesso",
        "candidatos.email",
        "candidatos.estado",
        "candidatos.genero",
        "candidatos.instagram",
        "candidatos.instagram_url",
        "candidatos.linkedin",
        "candidatos.linkedin_url",
        "candidatos.logradouro",
        "candidatos.nome_completo",
        "candidatos.numero",
        "candidatos.updated_by",
        "candidaturas.curriculo_nome_original",
        "disponibilidade.data_disponibilidade",
        "disponibilidade.disponibilidade_imediata",
        "disponibilidade.periodo_disponivel",
        "disponibilidade.regime_trabalho"
      ],
      "item_id": "dados_de_cadastro",
      "passo_motor": "tombstone_candidato",
      "passo_motor_onde": "RPC SECURITY DEFINER de anonimização — plano 45-07",
      "rotulo": "Os seus dados de cadastro",
      "texto_futuro": "Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade vão ser apagados do seu cadastro.",
      "texto_passado": "Nome, e-mail, telefone, CPF, data de nascimento, endereço, redes sociais e disponibilidade foram apagados do seu cadastro."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "apagar"
      ],
      "colunas_origem": [
        "cognitivo_respostas.proctoring",
        "cognitivo_respostas.raw_responses",
        "devolutivas_candidato.conteudo_jsonb",
        "entrevista_analises.citacoes",
        "entrevistas_online.feedback_candidato",
        "entrevistas_online.link_videochamada",
        "entrevistas_online.resumo_ia",
        "entrevistas_online.transcricao",
        "entrevistas_presenciais.documentos_apresentados",
        "redacoes_candidato.texto",
        "redacoes_candidato_em_progresso.texto_em_progresso",
        "respostas_avaliacao.respostas",
        "respostas_bigfive.resposta",
        "respostas_cultura.resposta_texto",
        "respostas_disc.mais_caracteristico",
        "respostas_disc.menos_caracteristico",
        "respostas_formulario.resposta_texto",
        "respostas_raven.resposta",
        "scores_candidato.citacoes"
      ],
      "item_id": "respostas_e_producoes",
      "passo_motor": "tombstone_candidato",
      "passo_motor_onde": "RPC SECURITY DEFINER de anonimização — plano 45-07",
      "rotulo": "O que você escreveu, respondeu e falou no processo",
      "texto_futuro": "As suas respostas das avaliações, os textos que você escreveu, as transcrições das entrevistas e a sua devolutiva vão ser apagados.",
      "texto_passado": "As suas respostas das avaliações, os textos que você escreveu, as transcrições das entrevistas e a sua devolutiva foram apagados."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "anonimizar",
        "apagar"
      ],
      "colunas_origem": [
        "autorizacoes.ip_aceite",
        "autorizacoes.user_agent_aceite",
        "logs_acesso.browser",
        "logs_acesso.city",
        "logs_acesso.device_info",
        "logs_acesso.device_type",
        "logs_acesso.email_tentativa",
        "logs_acesso.ip_address",
        "logs_acesso.operating_system",
        "logs_auditoria.ip_address",
        "logs_auditoria.user_agent",
        "rate_limit_check_duplicate.hash_cpf_email",
        "rate_limit_check_duplicate.x_forwarded_for",
        "redacoes_candidato_em_progresso.user_agent"
      ],
      "item_id": "registros_de_acesso",
      "passo_motor": "tombstone_candidato",
      "passo_motor_onde": "RPC SECURITY DEFINER de anonimização — plano 45-07",
      "rotulo": "Os registros dos seus acessos",
      "texto_futuro": "Endereço de IP, aparelho, navegador e cidade dos seus acessos vão ser apagados dos nossos registros técnicos.",
      "texto_passado": "Endereço de IP, aparelho, navegador e cidade dos seus acessos foram apagados dos nossos registros técnicos."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "apagar"
      ],
      "colunas_origem": [
        "ai_call_logs.parsed_reasoning",
        "ai_call_logs.raw_response",
        "candidate_ai_decisions.ai_reasoning_summary"
      ],
      "item_id": "dados_enviados_a_analise_automatica",
      "passo_motor": "tombstone_candidato",
      "passo_motor_onde": "RPC SECURITY DEFINER de anonimização — plano 45-07",
      "rotulo": "O que foi enviado para as análises automáticas",
      "texto_futuro": "O conteúdo enviado para as análises automáticas e o texto que elas produziram sobre você vão ser apagados.",
      "texto_passado": "O conteúdo enviado para as análises automáticas e o texto que elas produziram sobre você foram apagados."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "apagar"
      ],
      "colunas_origem": [
        "notificacoes_enviadas.destinatario_email",
        "notificacoes_enviadas.destinatario_original"
      ],
      "item_id": "enderecos_nos_registros_de_envio",
      "passo_motor": "scrub_ledger_email",
      "passo_motor_onde": "tombstone com sentinela — plano 45-07 (D-45-12)",
      "rotulo": "O seu endereço de e-mail nos registros de envio",
      "texto_futuro": "O endereço para onde mandamos as mensagens vai ser apagado do registro de envios; fica só o registro de que houve um envio.",
      "texto_passado": "O endereço para onde mandamos as mensagens foi apagado do registro de envios; ficou só o registro de que houve um envio."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "anonimizar"
      ],
      "colunas_origem": [
        "candidatos.user_id"
      ],
      "item_id": "vinculo_do_cadastro_com_a_conta",
      "passo_motor": "severar_user_id",
      "passo_motor_onde": "migration S1 + tombstone — plano 45-07 (D-45-11)",
      "rotulo": "A ligação entre o seu cadastro e a sua conta de acesso",
      "texto_futuro": "Vai ser cortada antes de a conta ser apagada, para que nada do que ficar aponte de volta para você.",
      "texto_passado": "Foi cortada antes de a conta ser apagada, e nada do que ficou aponta de volta para você."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "anonimizar"
      ],
      "colunas_origem": [
        "ai_call_logs.candidato_id",
        "autorizacoes.candidato_id",
        "autorizacoes.user_id",
        "candidate_ai_decisions.candidato_id",
        "devolutivas_candidato.candidato_id",
        "disponibilidade.candidato_id",
        "historico_acoes.usuario_id",
        "logs_acesso.user_id",
        "logs_auditoria.usuario_id",
        "notificacoes_enviadas.candidato_id",
        "recruiter_alerts.candidato_id"
      ],
      "item_id": "vinculos_nos_registros_que_ficam",
      "passo_motor": "severar_fks_set_null",
      "passo_motor_onde": "tombstone — plano 45-07 (ERASE-09)",
      "rotulo": "As ligações com você nos registros que ficam",
      "texto_futuro": "Os registros que a Beauty Smile é obrigada a manter vão deixar de apontar para você.",
      "texto_passado": "Os registros que a Beauty Smile é obrigada a manter deixaram de apontar para você."
    },
    {
      "aplicavel_quando": "tem_decisao_registrada",
      "classificacoes_origem": [
        "preservar_com_ressalva"
      ],
      "colunas_origem": [
        "decisao_final.justificativa",
        "decisao_final_historico.justificativa"
      ],
      "item_id": "ligacao_com_a_justificativa",
      "passo_motor": "tombstone_decisao_final",
      "passo_motor_onde": "RPC SECURITY DEFINER de anonimização — plano 45-07 (D-45-02/03)",
      "rotulo": "A ligação entre você e a justificativa escrita sobre a sua candidatura",
      "texto_futuro": "Vai ser cortada: o texto continua guardado como prova de que a decisão não foi discriminatória, sem ligação com você.",
      "texto_passado": "Foi cortada: o texto continua guardado como prova de que a decisão não foi discriminatória, sem ligação com você."
    },
    {
      "aplicavel_quando": "sempre",
      "classificacoes_origem": [
        "anonimizar",
        "apagar"
      ],
      "colunas_origem": [
        "sessoes_ativas.browser",
        "sessoes_ativas.city",
        "sessoes_ativas.country",
        "sessoes_ativas.device_info",
        "sessoes_ativas.device_type",
        "sessoes_ativas.ip_address",
        "sessoes_ativas.operating_system",
        "sessoes_ativas.session_token",
        "sessoes_ativas.user_id"
      ],
      "item_id": "sua_conta_de_acesso",
      "passo_motor": "auth_delete_user",
      "passo_motor_onde": "Edge Function (Auth Admin API, hard delete) — plano 45-10 (D-45-09)",
      "rotulo": "A sua conta de acesso e as sessões abertas",
      "texto_futuro": "Vão deixar de existir. Você não vai conseguir mais entrar, e o seu e-mail fica livre para você se cadastrar de novo quando quiser.",
      "texto_passado": "Deixaram de existir. Você não consegue mais entrar, e o seu e-mail está livre para você se cadastrar de novo quando quiser."
    }
  ],
  "fora_do_escopo_do_titular": {
    "configuracoes_empresa": "configuracao_da_empresa",
    "data_deletion_log": "tabela_sem_vinculo_com_titular",
    "preferencias_notificacoes": "pii_de_funcionario",
    "usuarios_rh": "pii_de_funcionario",
    "webhooks_config": "configuracao_da_empresa"
  },
  "fora_do_recibo": {
    "agendamentos_entrevista.compareceu": "estado_do_processo",
    "agendamentos_entrevista.entrevistador": "dado_de_funcionario",
    "agendamentos_entrevista.local_ou_link": "conteudo_do_produto",
    "ai_call_logs.prompt_hash": "chave_tecnica",
    "ai_call_logs.retain_until": "chave_tecnica",
    "ai_call_logs.system_prompt": "conteudo_do_produto",
    "ai_call_logs.user_prompt_template": "conteudo_do_produto",
    "avaliacoes_rh.avaliador_id": "dado_de_funcionario",
    "candidate_ai_decisions.ai_call_log_ids": "chave_tecnica",
    "candidate_ai_decisions.reviewer_id": "dado_de_funcionario",
    "candidatos.ativo": "estado_do_processo",
    "candidatos.bloqueado": "estado_do_processo",
    "candidatos.email_verificado": "estado_do_processo",
    "candidaturas.curriculo_tamanho_bytes": "estado_do_processo",
    "candidaturas.origem_candidatura": "estado_do_processo",
    "cognitivo_respostas.shuffle_seed": "chave_tecnica",
    "comparativo_solicitado.candidatura_ids": "chave_tecnica",
    "comparativo_solicitado.solicitado_por": "dado_de_funcionario",
    "decisao_final.candidatura_id": "chave_tecnica",
    "decisao_final.por_usuario": "dado_de_funcionario",
    "decisao_final_historico.candidatura_id": "chave_tecnica",
    "decisao_final_historico.por_usuario": "dado_de_funcionario",
    "entrevista_analises.revisada_por": "dado_de_funcionario",
    "entrevistas_online.agendado_por": "dado_de_funcionario",
    "entrevistas_online.gravacao_tamanho_mb": "estado_do_processo",
    "entrevistas_online.realizado_por": "dado_de_funcionario",
    "entrevistas_presenciais.documentos_necessarios": "conteudo_do_produto",
    "entrevistas_presenciais.instrucoes_acesso": "conteudo_do_produto",
    "entrevistas_presenciais.local_entrevista": "conteudo_do_produto",
    "entrevistas_presenciais.sala_numero": "conteudo_do_produto",
    "historico_candidatura.ator": "dado_de_funcionario",
    "notificacoes_enviadas.candidatura_id": "chave_tecnica",
    "notificacoes_enviadas.dedupe_key": "chave_tecnica",
    "notificacoes_enviadas.evento": "estado_do_processo",
    "notificacoes_enviadas.provider_message_id": "chave_tecnica",
    "notificacoes_enviadas.status": "estado_do_processo",
    "notificacoes_enviadas.template": "conteudo_do_produto",
    "redacoes_candidato.decisao_revisor": "estado_do_processo",
    "redacoes_candidato.revisada_por": "dado_de_funcionario",
    "redacoes_candidato.texto_hash": "chave_tecnica",
    "respostas_formulario.resposta_numerica": "estado_do_processo",
    "sessoes_ativas.revogado_por": "linha_removida_com_a_conta"
  },
  "meta": {
    "banidos_totalidade": [
      "todos os seus dados",
      "tudo o que temos sobre você",
      "todos os seus registros",
      "apagamos tudo"
    ],
    "banidos_vocabulario": [
      "anonimizado",
      "anonimizada",
      "pseudonimizado",
      "pseudonimizada",
      "tombstone",
      "desvinculado",
      "desvinculada",
      "hash",
      "desativar conta",
      "pausar conta",
      "conta suspensa",
      "conta inativa"
    ],
    "campos_de_texto_de_titular": [
      "rotulo",
      "texto_futuro",
      "texto_passado",
      "base_legal"
    ],
    "consumidores": [
      "supabase/functions/_shared/reciboExclusao.ts — Edge Function de execução (45-10)",
      "src/features/privacidade/constants/reciboExclusao.generated.ts — ReciboExclusao (45-08)"
    ],
    "fase": 45,
    "fonte_classificacao": "docs/compliance/pii-inventory.yaml",
    "fonte_recusada": {
      "arquivo": "supabase/functions/_shared/exportAllowlist.ts",
      "razao": "Cobre 30 de 69 tabelas (45-RESEARCH §C2) e exclui, como telemetria_interna, oito tabelas com PII do titular — inclusive ai_call_logs e logs_acesso, duas das cinco do ERASE-09. Um recibo derivado dele seria omisso sobre o que não diz (§Pitfall 5)."
    },
    "gerado_em": "2026-08-05T04:06:15.390Z",
    "gerador": "docs/compliance/sql/gen-recibo-exclusao.cjs",
    "inventario_coletado_em": "2026-07-29T14:08:18Z",
    "plano": "45-02",
    "requirement": "ERASE-07",
    "totais": {
      "colunas_com_linha_no_recibo": 167,
      "colunas_com_razao_de_silencio": 42,
      "colunas_com_veredito": 209,
      "colunas_em_escopo_do_titular": 209,
      "linhas_mantem": 9,
      "linhas_sai": 11,
      "tabelas_em_escopo_do_titular": 37,
      "tabelas_fora_do_escopo_do_titular": 5,
      "tabelas_no_inventario": 42
    }
  },
  "passos_motor": [
    "storage_remove",
    "tombstone_candidato",
    "tombstone_decisao_final",
    "severar_user_id",
    "severar_fks_set_null",
    "scrub_ledger_email",
    "auth_delete_user"
  ],
  "passos_motor_onde": {
    "auth_delete_user": "Edge Function (Auth Admin API, hard delete) — plano 45-10 (D-45-09)",
    "scrub_ledger_email": "tombstone com sentinela — plano 45-07 (D-45-12)",
    "severar_fks_set_null": "tombstone — plano 45-07 (ERASE-09)",
    "severar_user_id": "migration S1 + tombstone — plano 45-07 (D-45-11)",
    "storage_remove": "Edge Function (Storage Admin API) — plano 45-10",
    "tombstone_candidato": "RPC SECURITY DEFINER de anonimização — plano 45-07",
    "tombstone_decisao_final": "RPC SECURITY DEFINER de anonimização — plano 45-07 (D-45-02/03)"
  },
  "tabelas_sem_pii_titular": {
    "lista": [
      "ai_cost_daily",
      "analise_candidato_vaga",
      "bias_audit_log",
      "biblioteca_perguntas",
      "bigfive_itens",
      "cognitivo_itens",
      "config_sla_etapa",
      "entrevista_guias",
      "pergunta_opcao_metadata",
      "perguntas",
      "perguntas_cultura",
      "perguntas_formulario",
      "perguntas_opcao_sjt",
      "perguntas_redacao",
      "perguntas_vaga_origem",
      "prompt_versions",
      "questoes_bigfive",
      "questoes_disc",
      "questoes_raven",
      "templates_email",
      "vagas",
      "vagas_associadas_recrutadores"
    ],
    "regra_aplicada": "R4"
  }
} as const;
