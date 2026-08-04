/**
 * exportAllowlist.ts — ESPELHO GERADO da allowlist do export.
 *
 * Requirement: EXPORT-02 · EXPORT-06 · Phase 44
 *
 * ⚠ ARQUIVO GERADO por `docs/compliance/sql/gen-export-allowlist.cjs`.
 * NÃO EDITAR À MÃO — `--check` reprova qualquer divergência, e reprova
 * este arquivo separadamente do `.json`: um `--check` que olhasse só um
 * dos dois deixaria o outro apodrecer.
 *
 * POR QUE UM MÓDULO .ts E NÃO O IMPORT DO .json
 * Import estático de JSON saindo do diretório da Edge Function é a assunção
 * A1 da 44-RESEARCH e pode NÃO sobreviver ao bundler do deploy. Um módulo
 * TypeScript comum não depende de resolução de JSON. Uma fonte só (o
 * gerador), dois artefatos, ambos sob `--check`.
 *
 * Regenerar: node docs/compliance/sql/gen-export-allowlist.cjs
 */
export const EXPORT_ALLOWLIST = {
  "excluidas": {
    "ai_call_logs": "telemetria_interna",
    "ai_cost_daily": "telemetria_interna",
    "bias_audit_log": "telemetria_interna",
    "biblioteca_perguntas": "configuracao_do_produto",
    "bigfive_itens": "configuracao_do_produto",
    "classe_evento_notificacao": "vocabulario_do_sistema",
    "cognitivo_itens": "configuracao_do_produto",
    "comparativo_solicitado": "pii_de_terceiro",
    "config_retencao_etapa": "configuracao_do_produto",
    "config_sla_dados": "configuracao_do_produto",
    "config_sla_etapa": "configuracao_do_produto",
    "config_sla_revisao": "configuracao_do_produto",
    "configuracoes_empresa": "segredo",
    "data_deletion_log": "telemetria_interna",
    "entrevista_guias": "configuracao_do_produto",
    "historico_acoes": "telemetria_interna",
    "logs_acesso": "telemetria_interna",
    "logs_auditoria": "telemetria_interna",
    "notificacoes_enviadas": "telemetria_interna",
    "pergunta_opcao_metadata": "configuracao_do_produto",
    "perguntas": "configuracao_do_produto",
    "perguntas_cultura": "configuracao_do_produto",
    "perguntas_formulario": "configuracao_do_produto",
    "perguntas_opcao_sjt": "configuracao_do_produto",
    "perguntas_redacao": "configuracao_do_produto",
    "perguntas_vaga_origem": "configuracao_do_produto",
    "preferencias_notificacoes": "pii_de_terceiro",
    "prompt_versions": "configuracao_do_produto",
    "questoes_bigfive": "configuracao_do_produto",
    "questoes_disc": "configuracao_do_produto",
    "questoes_raven": "configuracao_do_produto",
    "rate_limit_check_duplicate": "telemetria_interna",
    "sessoes_ativas": "telemetria_interna",
    "templates_email": "configuracao_do_produto",
    "usuarios_rh": "pii_de_terceiro",
    "vagas": "configuracao_do_produto",
    "vagas_associadas_recrutadores": "pii_de_terceiro",
    "webhooks_config": "segredo",
    "webhooks_logs": "telemetria_interna"
  },
  "meta": {
    "consumidores": [
      "Phase 44 — projeção da Edge Function `exportar-meus-dados` (EXPORT-02)",
      "Phase 45 — plano de exclusão/anonimização: o escopo do titular exercitado em produção é o insumo do motor destrutivo (ERASE-02, ERASE-06)"
    ],
    "escopo_declarado_nao_vivo": [],
    "fase": 44,
    "fecho_de_tabela_sobre_catalogo_completo": true,
    "fonte_catalogo": "docs/compliance/catalogo-vivo-44.json",
    "fonte_classificacao": "docs/compliance/pii-inventory.yaml",
    "fonte_escopo": "docs/compliance/export-scope-rules.yaml",
    "gerado_em": "2026-08-04T01:37:44.712Z",
    "gerador": "docs/compliance/sql/gen-export-allowlist.cjs",
    "medido_em": "2026-08-04T01:34:27Z",
    "requirement": "EXPORT-02",
    "totais": {
      "colunas_colhidas": 731,
      "colunas_com_veredito_em_escopo": 399,
      "colunas_excluidas_em_escopo": 34,
      "colunas_exportadas": 365,
      "tabelas_catalogadas": 69,
      "tabelas_com_colunas_colhidas": 51,
      "tabelas_em_escopo": 30,
      "tabelas_excluidas": 39
    },
    "totais_medidos_em_public": {
      "colunas_public": 1025,
      "fks_public": 105,
      "tabelas_base_public": 69
    },
    "versao": "1.1.0"
  },
  "tabelas": {
    "agendamentos_entrevista": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "compareceu",
        "created_at",
        "data_hora",
        "deleted_at",
        "id",
        "local_ou_link",
        "observacoes_rh",
        "status",
        "tipo",
        "updated_at",
        "vaga_id"
      ],
      "colunas_excluidas": {
        "agendado_por": "pii_de_terceiro (R2)",
        "entrevistador": "decisoes_por_coluna: pii_de_terceiro — o `pii-inventory.yaml` anota esta coluna com uma palavra só:\n\"Funcionário\". É o NOME de quem conduziu a entrevista, em `text`.\n\nA regra R2 de `ponteiros` não a pega porque ela não é um UUID: é o mesmo modo de\nevasão de `redacoes_candidato.referencia_match`, e a segunda ocorrência dele nesta\nfase. O escopo já exclui `agendado_por` e `avaliador_id` pela mesma razão; excluir\no UUID do funcionário e exportar o nome dele seria a exclusão em forma, não em\nefeito. A migration `20260716000001_agendamentos_entrevista.sql:131` já declara\nesta coluna fora da assinatura de resultado exposta — este veredito apenas mantém\na allowlist coerente com o que o banco já decidiu.\n",
        "updated_by": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "compareceu": "inventario:preservar",
        "created_at": "R1",
        "data_hora": "R3",
        "deleted_at": "R1",
        "id": "R1",
        "local_ou_link": "inventario:preservar",
        "observacoes_rh": "inventario:preservar_com_ressalva",
        "status": "R3",
        "tipo": "R3",
        "updated_at": "R1",
        "vaga_id": "R1"
      },
      "razao": "Entrevistas marcadas com a pessoa (EXPORT-02 · 44-CONTEXT §Área 2)."
    },
    "analise_candidato_vaga": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "flags",
        "gaps",
        "id",
        "pontos_fortes",
        "resumo_cv",
        "resumo_respostas",
        "score_match",
        "status",
        "updated_at",
        "vaga_id"
      ],
      "colunas_excluidas": {
        "erro": "decisoes_por_coluna: (i) telemetria_interna — mensagem de FALHA do pipeline. Pode carregar payload de provedor, stack e identificador interno de infraestrutura, e a 44-UI-SPEC §Arquivos proíbe literalmente 'qualquer chave, token ou identificador interno de infraestrutura' nos dois arquivos entregues. O titular não fica sem o fato: `status` ENTRA e diz que a análise falhou — o que se omite é o payload interno, não a informação."
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "flags": "decisoes_por_coluna",
        "gaps": "decisoes_por_coluna",
        "id": "R1",
        "pontos_fortes": "decisoes_por_coluna",
        "resumo_cv": "decisoes_por_coluna",
        "resumo_respostas": "decisoes_por_coluna",
        "score_match": "R3",
        "status": "decisoes_por_coluna",
        "updated_at": "R1",
        "vaga_id": "R1"
      },
      "razao": "Resumo e gaps produzidos por IA sobre a pessoa: RESULTADO, não prompt nem telemetria."
    },
    "autorizacoes": {
      "chave_titular": "candidato_id",
      "colunas": [
        "autorizacao_analise_video",
        "autorizacao_comunicacao",
        "autorizacao_marketing_vagas",
        "autorizacao_retencao_curriculo",
        "autorizacao_uso_dados",
        "candidato_id",
        "consent_registrado_em",
        "consent_text_hash",
        "consent_text_version",
        "created_at",
        "id",
        "ip_aceite",
        "policy_version",
        "updated_at",
        "user_agent_aceite",
        "user_id"
      ],
      "colunas_excluidas": {},
      "ligacao": "direta",
      "proveniencia": {
        "autorizacao_analise_video": "inventario:preservar",
        "autorizacao_comunicacao": "inventario:preservar",
        "autorizacao_marketing_vagas": "decisoes_por_coluna",
        "autorizacao_retencao_curriculo": "inventario:preservar",
        "autorizacao_uso_dados": "inventario:preservar",
        "candidato_id": "R2:do_titular",
        "consent_registrado_em": "decisoes_por_coluna",
        "consent_text_hash": "decisoes_por_coluna",
        "consent_text_version": "decisoes_por_coluna",
        "created_at": "R1",
        "id": "R1",
        "ip_aceite": "inventario:anonimizar",
        "policy_version": "inventario:preservar",
        "updated_at": "R1",
        "user_agent_aceite": "inventario:anonimizar",
        "user_id": "R2:do_titular"
      },
      "razao": "Prova de consentimento — inclusive a versão e o hash do texto aceito (dependência declarada da Phase 43)."
    },
    "avaliacoes_rh": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "adequacao_cultural",
        "adequacao_tecnica",
        "candidatura_id",
        "competencias",
        "created_at",
        "deleted_at",
        "entrevista_id",
        "id",
        "justificativa_recomendacao",
        "observacoes",
        "pontos_fortes",
        "pontos_fracos",
        "potencial_crescimento",
        "recomendacao",
        "score_geral",
        "tipo_entrevista",
        "updated_at"
      ],
      "colunas_excluidas": {
        "avaliador_id": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "adequacao_cultural": "R3",
        "adequacao_tecnica": "R3",
        "candidatura_id": "R1",
        "competencias": "decisoes_por_coluna",
        "created_at": "R1",
        "deleted_at": "R1",
        "entrevista_id": "R1",
        "id": "R1",
        "justificativa_recomendacao": "inventario:preservar_com_ressalva",
        "observacoes": "inventario:preservar_com_ressalva",
        "pontos_fortes": "inventario:preservar_com_ressalva",
        "pontos_fracos": "inventario:preservar_com_ressalva",
        "potencial_crescimento": "R3",
        "recomendacao": "R3",
        "score_geral": "R3",
        "tipo_entrevista": "R3",
        "updated_at": "R1"
      },
      "razao": "Avaliação humana do RH sobre a pessoa — o que o RH enxerga entra na cópia."
    },
    "candidate_ai_decisions": {
      "chave_titular": "candidato_id",
      "colunas": [
        "ai_composite_score",
        "ai_reasoning_summary",
        "ai_recommendation",
        "candidato_id",
        "created_at",
        "explanation_channel",
        "explanation_delivered_at",
        "human_decision",
        "human_notes",
        "human_overrode_ai",
        "id",
        "review_requested_at",
        "reviewed_at",
        "status",
        "updated_at",
        "vaga_id"
      ],
      "colunas_excluidas": {
        "ai_call_log_ids": "decisoes_por_coluna: telemetria_interna — `uuid[]` de PONTEIROS para linhas de `ai_call_logs`, tabela\nque o bloco 2 exclui por decisão travada na 44-CONTEXT §Área 2 (prompt, custo e\ntelemetria de LLM não são dado do titular). Exportar os ponteiros seria exportar a\ntabela pela porta dos fundos, em forma de UUID opaco para um registro que o titular\nnão pode ler — e a 44-UI-SPEC §Arquivos proíbe literalmente \"qualquer chave, token\nou identificador interno de infraestrutura\" nos dois arquivos entregues.\nA regra R2 de `ponteiros` não o pega: o nome termina em `_ids`, não em `_id`.\nO titular não perde nada do Art. 20: `ai_recommendation`, `ai_composite_score` e\n`ai_reasoning_summary` — o RESULTADO e a EXPLICAÇÃO — continuam na cópia.\n",
        "review_requested_by": "pii_de_terceiro (R2)",
        "reviewer_id": "pii_de_terceiro (R2)"
      },
      "ligacao": "direta",
      "proveniencia": {
        "ai_composite_score": "inventario:preservar",
        "ai_reasoning_summary": "inventario:apagar",
        "ai_recommendation": "inventario:preservar",
        "candidato_id": "R2:do_titular",
        "created_at": "R1",
        "explanation_channel": "decisoes_por_coluna",
        "explanation_delivered_at": "R3",
        "human_decision": "inventario:preservar",
        "human_notes": "inventario:preservar_com_ressalva",
        "human_overrode_ai": "inventario:preservar",
        "id": "R1",
        "review_requested_at": "R3",
        "reviewed_at": "R3",
        "status": "R3",
        "updated_at": "R1",
        "vaga_id": "R1"
      },
      "razao": "Resultado e explicação da decisão apoiada em IA (Art. 20). O sistema já expõe a explicação em /explicacao desde o M2."
    },
    "candidatos": {
      "chave_titular": "id",
      "colunas": [
        "ativo",
        "avatar_url",
        "bairro",
        "bloqueado",
        "bloqueado_motivo",
        "celular",
        "cep",
        "cidade",
        "como_conheceu",
        "como_conheceu_detalhes",
        "complemento",
        "cpf",
        "created_at",
        "data_nascimento",
        "data_ultimo_acesso",
        "deleted_at",
        "email",
        "email_verificado",
        "estado",
        "genero",
        "id",
        "instagram",
        "instagram_url",
        "linkedin",
        "linkedin_url",
        "logradouro",
        "nome_completo",
        "numero",
        "updated_at",
        "user_id"
      ],
      "colunas_excluidas": {
        "created_by": "pii_de_terceiro (R2)",
        "updated_by": "pii_de_terceiro (R2)"
      },
      "ligacao": "direta",
      "proveniencia": {
        "ativo": "inventario:preservar",
        "avatar_url": "inventario:apagar",
        "bairro": "inventario:apagar",
        "bloqueado": "inventario:preservar",
        "bloqueado_motivo": "inventario:preservar_com_ressalva",
        "celular": "inventario:apagar",
        "cep": "inventario:apagar",
        "cidade": "inventario:anonimizar",
        "como_conheceu": "inventario:preservar",
        "como_conheceu_detalhes": "inventario:apagar",
        "complemento": "inventario:apagar",
        "cpf": "inventario:apagar",
        "created_at": "R1",
        "data_nascimento": "inventario:anonimizar",
        "data_ultimo_acesso": "inventario:apagar",
        "deleted_at": "R1",
        "email": "inventario:anonimizar",
        "email_verificado": "inventario:preservar",
        "estado": "inventario:anonimizar",
        "genero": "inventario:anonimizar",
        "id": "R1",
        "instagram": "inventario:apagar",
        "instagram_url": "inventario:apagar",
        "linkedin": "inventario:apagar",
        "linkedin_url": "inventario:apagar",
        "logradouro": "inventario:apagar",
        "nome_completo": "inventario:anonimizar",
        "numero": "inventario:apagar",
        "updated_at": "R1",
        "user_id": "R2:do_titular"
      },
      "razao": "O cadastro. É a pessoa; a EF resolve esta linha de `auth.uid()` via `user_id`."
    },
    "candidaturas": {
      "chave_titular": "candidato_id",
      "colunas": [
        "analise_ia_bigfive",
        "analise_ia_cultura",
        "analise_ia_disc",
        "analise_ia_entrevista_online",
        "analise_ia_entrevista_presencial",
        "analise_ia_formulario",
        "analise_ia_raven",
        "candidato_id",
        "created_at",
        "curriculo_nome_original",
        "curriculo_tamanho_bytes",
        "curriculo_url",
        "data_bigfive_enviado",
        "data_candidatura",
        "data_cultura_enviado",
        "data_decisao_final",
        "data_disc_enviado",
        "data_entrevista_online",
        "data_entrevista_presencial",
        "data_formulario_enviado",
        "data_raven_enviado",
        "deleted_at",
        "etapa_atual",
        "etapa_justificativa",
        "feedback_rejeicao",
        "id",
        "is_favorito",
        "is_rascunho",
        "motivo_rejeicao",
        "observacoes_rh",
        "opcao_knockout_id",
        "origem_candidatura",
        "score_geral",
        "status",
        "tempo_preenchimento_segundos",
        "updated_at",
        "vaga_id"
      ],
      "colunas_excluidas": {
        "created_by": "pii_de_terceiro (R2)",
        "updated_by": "pii_de_terceiro (R2)"
      },
      "ligacao": "direta",
      "proveniencia": {
        "analise_ia_bigfive": "inventario:preservar_com_ressalva",
        "analise_ia_cultura": "inventario:preservar_com_ressalva",
        "analise_ia_disc": "inventario:preservar_com_ressalva",
        "analise_ia_entrevista_online": "inventario:preservar_com_ressalva",
        "analise_ia_entrevista_presencial": "inventario:preservar_com_ressalva",
        "analise_ia_formulario": "inventario:preservar_com_ressalva",
        "analise_ia_raven": "inventario:preservar_com_ressalva",
        "candidato_id": "R2:do_titular",
        "created_at": "R1",
        "curriculo_nome_original": "inventario:apagar",
        "curriculo_tamanho_bytes": "inventario:preservar",
        "curriculo_url": "decisoes_por_coluna",
        "data_bigfive_enviado": "R3",
        "data_candidatura": "R3",
        "data_cultura_enviado": "R3",
        "data_decisao_final": "R3",
        "data_disc_enviado": "R3",
        "data_entrevista_online": "R3",
        "data_entrevista_presencial": "R3",
        "data_formulario_enviado": "R3",
        "data_raven_enviado": "R3",
        "deleted_at": "R1",
        "etapa_atual": "R3",
        "etapa_justificativa": "inventario:preservar_com_ressalva",
        "feedback_rejeicao": "inventario:preservar_com_ressalva",
        "id": "R1",
        "is_favorito": "R3",
        "is_rascunho": "R3",
        "motivo_rejeicao": "inventario:preservar_com_ressalva",
        "observacoes_rh": "inventario:preservar_com_ressalva",
        "opcao_knockout_id": "decisoes_por_coluna",
        "origem_candidatura": "inventario:preservar",
        "score_geral": "R3",
        "status": "R3",
        "tempo_preenchimento_segundos": "R3",
        "updated_at": "R1",
        "vaga_id": "R1"
      },
      "razao": "Vínculo candidato↔vaga: currículo, etapa, scores e o texto livre do RH sobre a pessoa."
    },
    "cognitivo_respostas": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "completion_time_seconds",
        "created_at",
        "id",
        "proctoring",
        "raw_responses",
        "shuffle_seed"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "completion_time_seconds": "R3",
        "created_at": "R1",
        "id": "R1",
        "proctoring": "inventario:apagar",
        "raw_responses": "inventario:apagar",
        "shuffle_seed": "inventario:preservar"
      },
      "razao": "Respostas do teste cognitivo. A telemetria de proctoring é vigilância SOBRE a pessoa e o titular tem direito de vê-la."
    },
    "decisao_final": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "decisao",
        "em",
        "explicacao_solicitada_em",
        "id",
        "revisao_respondida_em",
        "revisao_resultado",
        "revisao_solicitada_em",
        "revisao_veredito"
      ],
      "colunas_excluidas": {
        "justificativa": "decisoes_por_coluna: DECISÃO DO OPERADOR EM ABERTO (BD-9) + correção de segurança viva — NÃO é decisão\nda engenharia, e por isso a engenharia escolhe o lado que não vaza.\n\nO `explicacaoService.ts` projeta para o candidato exatamente\n`decisao, revisao_solicitada_em, revisao_resultado, explicacao_solicitada_em,\nrevisao_veredito, revisao_respondida_em` — e `justificativa` está FORA por uma\ncorreção que embarcou: a Phase-24 CR-01 removeu-a da projeção porque a RLS é\nrow-level e não esconde coluna, e o texto interno cru do RH estava atravessando a\nrede até o navegador do candidato. O docblock do serviço diz, verbatim, que essa\nexclusão \"must not\" ser desfeita.\n\nPô-la na allowlist do export reabriria o MESMO vazamento por uma porta nova,\nsem que ninguém assinasse. E o `pii-inventory.yaml` marca a coluna como\n\"⚠ BD-9 EM ABERTO — … simultaneamente prova de não-discriminação (Art. 7º, VI) e\nvetor de PII de terceiro. Decisão do operador, não da engenharia\".\n\n⚠ ESTA LINHA É REVERSÍVEL COM UMA PALAVRA. Se o operador decidir que o Art. 18, II\nprevalece sobre o CR-01, troque `false` por `true`, regere e o par volta. O que\nnão pode acontecer é a coluna entrar por omissão — que é exatamente o que\naconteceria sem este veredito.\n",
        "por_usuario": "pii_de_terceiro (R2)",
        "revisao_por_usuario": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "inventario:preservar",
        "decisao": "inventario:preservar",
        "em": "inventario:preservar",
        "explicacao_solicitada_em": "inventario:preservar",
        "id": "R1",
        "revisao_respondida_em": "R1",
        "revisao_resultado": "inventario:preservar_com_ressalva",
        "revisao_solicitada_em": "inventario:preservar",
        "revisao_veredito": "decisoes_por_coluna"
      },
      "razao": "A decisão e sua justificativa. Art. 20 dá direito à explicação; omitir seria incoerente com a tela que já a mostra."
    },
    "decisao_final_historico": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "arquivado_em",
        "candidatura_id",
        "decidido_em",
        "decisao",
        "id"
      ],
      "colunas_excluidas": {
        "justificativa": "decisoes_por_coluna: Mesma coluna, versões arquivadas da mesma decisão. Um veredito que valesse só para a linha corrente deixaria o histórico entregando o que a corrente esconde. Reverte junto com `decisao_final.justificativa` se o operador decidir por `true`.",
        "por_usuario": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "arquivado_em": "inventario:preservar",
        "candidatura_id": "inventario:preservar",
        "decidido_em": "inventario:preservar",
        "decisao": "inventario:preservar",
        "id": "R1"
      },
      "razao": "Decisões anteriores arquivadas da mesma candidatura."
    },
    "devolutivas_candidato": {
      "chave_titular": "candidato_id",
      "colunas": [
        "candidato_id",
        "candidatura_id",
        "conteudo_jsonb",
        "created_at",
        "id"
      ],
      "colunas_excluidas": {
        "modelo_ia": "decisoes_por_coluna: (i) telemetria_interna — qual modelo gerou a devolutiva. O RESULTADO entregue à pessoa entra; a ficha técnica de como ele foi produzido, não.",
        "prompt_version": "decisoes_por_coluna: (i) telemetria_interna — idem. O CONTEÚDO da devolutiva (`conteudo_jsonb`) entra por R5; é ele que a pessoa recebeu."
      },
      "ligacao": "direta",
      "proveniencia": {
        "candidato_id": "R2:do_titular",
        "candidatura_id": "R1",
        "conteudo_jsonb": "inventario:apagar",
        "created_at": "R1",
        "id": "R1"
      },
      "razao": "Devolutiva comportamental entregue ao titular — já é mostrada a ele no painel."
    },
    "disponibilidade": {
      "chave_titular": "candidato_id",
      "colunas": [
        "candidato_id",
        "created_at",
        "data_disponibilidade",
        "disponibilidade_imediata",
        "id",
        "periodo_disponivel",
        "regime_trabalho",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "direta",
      "proveniencia": {
        "candidato_id": "R2:do_titular",
        "created_at": "R1",
        "data_disponibilidade": "inventario:apagar",
        "disponibilidade_imediata": "inventario:apagar",
        "id": "R1",
        "periodo_disponivel": "inventario:apagar",
        "regime_trabalho": "inventario:apagar",
        "updated_at": "R1"
      },
      "razao": "Declaração de disponibilidade feita pela própria pessoa."
    },
    "entrevista_analises": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "bias_flags",
        "bloqueio_avanco",
        "candidatura_id",
        "citacoes",
        "competencias",
        "created_at",
        "id",
        "notas_humanas",
        "revisao_confirmada_em",
        "scores_humanos",
        "status_analise"
      ],
      "colunas_excluidas": {
        "prompt_version": "decisoes_por_coluna: (i) telemetria_interna — idem `redacoes_candidato.prompt_version`.",
        "revisada_por": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "bias_flags": "inventario:preservar",
        "bloqueio_avanco": "R3",
        "candidatura_id": "R1",
        "citacoes": "inventario:apagar",
        "competencias": "inventario:preservar_com_ressalva",
        "created_at": "R1",
        "id": "R1",
        "notas_humanas": "inventario:preservar_com_ressalva",
        "revisao_confirmada_em": "R1",
        "scores_humanos": "inventario:preservar",
        "status_analise": "decisoes_por_coluna"
      },
      "razao": "Análise da entrevista, incluindo citações da fala da pessoa."
    },
    "entrevistas_online": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "analise_ia",
        "avaliacao_candidato_score",
        "candidatura_id",
        "created_at",
        "data_agendada",
        "data_fim_real",
        "data_inicio_real",
        "deleted_at",
        "duracao_estimada_minutos",
        "duracao_real_minutos",
        "feedback_candidato",
        "gravacao_tamanho_mb",
        "gravacao_url",
        "id",
        "link_videochamada",
        "notas_durante",
        "notas_preparacao",
        "observacoes_gerais",
        "plataforma",
        "resumo_ia",
        "status",
        "transcricao",
        "updated_at"
      ],
      "colunas_excluidas": {
        "agendado_por": "pii_de_terceiro (R2)",
        "realizado_por": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "analise_ia": "inventario:preservar_com_ressalva",
        "avaliacao_candidato_score": "R3",
        "candidatura_id": "R1",
        "created_at": "R1",
        "data_agendada": "R3",
        "data_fim_real": "R3",
        "data_inicio_real": "R3",
        "deleted_at": "R1",
        "duracao_estimada_minutos": "R3",
        "duracao_real_minutos": "R3",
        "feedback_candidato": "inventario:apagar",
        "gravacao_tamanho_mb": "inventario:preservar",
        "gravacao_url": "inventario:apagar",
        "id": "R1",
        "link_videochamada": "inventario:apagar",
        "notas_durante": "inventario:preservar_com_ressalva",
        "notas_preparacao": "inventario:preservar_com_ressalva",
        "observacoes_gerais": "inventario:preservar_com_ressalva",
        "plataforma": "decisoes_por_coluna",
        "resumo_ia": "inventario:apagar",
        "status": "R3",
        "transcricao": "inventario:apagar",
        "updated_at": "R1"
      },
      "razao": "Conteúdo de entrevista — alta densidade de PII do titular."
    },
    "entrevistas_presenciais": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "data_agendada",
        "data_fim_real",
        "data_inicio_real",
        "deleted_at",
        "documentos_apresentados",
        "documentos_necessarios",
        "duracao_estimada_minutos",
        "duracao_real_minutos",
        "id",
        "instrucoes_acesso",
        "local_entrevista",
        "notas_durante",
        "notas_preparacao",
        "observacoes_gerais",
        "primeira_impressao",
        "sala_numero",
        "status",
        "updated_at"
      ],
      "colunas_excluidas": {
        "agendado_por": "pii_de_terceiro (R2)",
        "realizado_por": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "data_agendada": "R3",
        "data_fim_real": "R3",
        "data_inicio_real": "R3",
        "deleted_at": "R1",
        "documentos_apresentados": "inventario:apagar",
        "documentos_necessarios": "inventario:preservar",
        "duracao_estimada_minutos": "R3",
        "duracao_real_minutos": "R3",
        "id": "R1",
        "instrucoes_acesso": "inventario:preservar",
        "local_entrevista": "inventario:preservar",
        "notas_durante": "inventario:preservar_com_ressalva",
        "notas_preparacao": "inventario:preservar_com_ressalva",
        "observacoes_gerais": "inventario:preservar_com_ressalva",
        "primeira_impressao": "inventario:preservar_com_ressalva",
        "sala_numero": "inventario:preservar",
        "status": "R3",
        "updated_at": "R1"
      },
      "razao": "Idem, presencial."
    },
    "historico_candidatura": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "auto_rejeitado",
        "candidatura_id",
        "criado_em",
        "criterio_texto",
        "etapa_de",
        "etapa_para",
        "id"
      ],
      "colunas_excluidas": {
        "ator": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "auto_rejeitado": "inventario:preservar",
        "candidatura_id": "R1",
        "criado_em": "R1",
        "criterio_texto": "inventario:preservar_com_ressalva",
        "etapa_de": "inventario:preservar",
        "etapa_para": "inventario:preservar",
        "id": "R1"
      },
      "razao": "Trilha de etapas da candidatura — é a história do processo dela."
    },
    "recruiter_alerts": {
      "chave_titular": "candidato_id",
      "colunas": [
        "call_type",
        "candidato_id",
        "created_at",
        "id",
        "is_read",
        "message",
        "resolved_at",
        "threshold",
        "threshold_violated",
        "vaga_id",
        "value"
      ],
      "colunas_excluidas": {
        "channel": "decisoes_por_coluna: (i) telemetria_interna — canal de ENTREGA do alerta AO FUNCIONÁRIO ('email' | 'cost_anomaly'), medido no DDL da migration 20260609000001. Descreve como o sistema notificou o RH, não a pessoa; é o mesmo ledger operacional de entrega por que `notificacoes_enviadas` está fora. Contrasta deliberadamente com `candidate_ai_decisions.explanation_channel`, que é entrega AO TITULAR e por isso ENTRA."
      },
      "ligacao": "direta",
      "proveniencia": {
        "call_type": "R3",
        "candidato_id": "R2:do_titular",
        "created_at": "R1",
        "id": "R1",
        "is_read": "R3",
        "message": "inventario:preservar_com_ressalva",
        "resolved_at": "R3",
        "threshold": "R3",
        "threshold_violated": "decisoes_por_coluna",
        "vaga_id": "R1",
        "value": "R3"
      },
      "razao": "Alerta que o RH enxerga SOBRE a pessoa — o critério da cópia honesta é o que o RH vê, não o que é confortável mostrar."
    },
    "redacoes_candidato": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "analise_ia",
        "bloqueio_avanco",
        "candidatura_id",
        "classificacao_cor",
        "decisao_revisor",
        "eh_pergunta_padrao",
        "flags",
        "ia_processada_em",
        "id",
        "notas_revisor",
        "ordem",
        "pergunta_id",
        "red_flag_etico",
        "revisada_em",
        "score_ponderado_0_100",
        "scores_dimensao",
        "scores_humanos",
        "status_analise",
        "submetida_em",
        "tempo_gasto_segundos",
        "texto",
        "texto_hash",
        "word_count"
      ],
      "colunas_excluidas": {
        "cost_tokens_input": "decisoes_por_coluna: (i) telemetria_interna — CUSTO em tokens da chamada ao modelo. Custo de LLM não é dado do titular no sentido do Art. 18, II: é a decisão travada na 44-CONTEXT §Área 2, a mesma por que `ai_cost_daily` e `ai_call_logs` estão fora no nível da tabela. Entrou por R3 (é `integer`); sai por veredito explícito, ao lado das três irmãs de telemetria da mesma tabela.",
        "cost_tokens_output": "decisoes_por_coluna: (i) telemetria_interna — idem, tokens de saída.",
        "input_hash": "decisoes_por_coluna: (i) telemetria_interna — hash do insumo enviado ao modelo, usado para deduplicação/cache. É identificador interno de execução; não é fato sobre a pessoa e nada acrescenta à cópia dela.",
        "model_version": "decisoes_por_coluna: (i) telemetria_interna — qual modelo rodou. Idem.",
        "prompt_version": "decisoes_por_coluna: (i) telemetria_interna — versão do prompt que rodou. Descreve o SISTEMA, não a pessoa. Mesma família de `ai_call_logs`, fora do escopo por decisão travada na 44-CONTEXT §Área 2.",
        "referencia_match": "decisoes_por_coluna: pii_de_terceiro — E ESTE É O ACHADO QUE JUSTIFICA O FECHO COLUNA A COLUNA.\nO DDL (20260623100003_redacoes_candidato.sql:70) é literal: `uuid[] NOT NULL\n-- candidatura_ids match no hash`. São os identificadores das candidaturas\nde OUTRAS PESSOAS cuja redação bateu no mesmo hash anti-plágio (RF-R-18).\nExportá-lo entregaria ao titular uma lista de candidaturas alheias — a mesma\n`pii_de_terceiro` por que `comparativo_solicitado` está fora no nível da\ntabela. A regra R2 de `ponteiros` não o pega porque o nome não termina em\n`_id`; foi o ERRO DE FECHAMENTO que o trouxe à mesa. É exatamente o vazamento\nque uma allowlist \"gerada por regra\" teria produzido em silêncio.\nO titular não perde o fato: `flags` ENTRA e carrega\n`possivel_plagio_intercandidato` — ele fica sabendo da suspeita levantada\nsobre ele sem receber a identidade de quem mais foi apanhado no mesmo hash.\n",
        "revisada_por": "pii_de_terceiro (R2)"
      },
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "analise_ia": "inventario:preservar_com_ressalva",
        "bloqueio_avanco": "R3",
        "candidatura_id": "R1",
        "classificacao_cor": "decisoes_por_coluna",
        "decisao_revisor": "inventario:preservar",
        "eh_pergunta_padrao": "R3",
        "flags": "decisoes_por_coluna",
        "ia_processada_em": "R1",
        "id": "R1",
        "notas_revisor": "inventario:preservar_com_ressalva",
        "ordem": "R3",
        "pergunta_id": "R1",
        "red_flag_etico": "R3",
        "revisada_em": "R1",
        "score_ponderado_0_100": "R3",
        "scores_dimensao": "inventario:preservar",
        "scores_humanos": "inventario:preservar",
        "status_analise": "decisoes_por_coluna",
        "submetida_em": "R1",
        "tempo_gasto_segundos": "R3",
        "texto": "inventario:apagar",
        "texto_hash": "inventario:preservar",
        "word_count": "R3"
      },
      "razao": "Produção escrita do titular."
    },
    "redacoes_candidato_em_progresso": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "completou_em",
        "id",
        "iniciado_em",
        "pergunta_id",
        "texto_em_progresso",
        "ultima_atividade_em",
        "user_agent",
        "word_count"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "completou_em": "R1",
        "id": "R1",
        "iniciado_em": "R1",
        "pergunta_id": "R1",
        "texto_em_progresso": "inventario:apagar",
        "ultima_atividade_em": "R1",
        "user_agent": "inventario:apagar",
        "word_count": "R3"
      },
      "razao": "Rascunho da produção escrita — o sistema guarda, logo a pessoa tem direito à cópia."
    },
    "respostas_avaliacao": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "id",
        "respostas",
        "teste",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "id": "R1",
        "respostas": "inventario:apagar",
        "teste": "decisoes_por_coluna",
        "updated_at": "R1"
      },
      "razao": "Idem, avaliação genérica."
    },
    "respostas_bigfive": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "questao_id",
        "resposta",
        "tempo_resposta_segundos"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "questao_id": "R1",
        "resposta": "inventario:apagar",
        "tempo_resposta_segundos": "R3"
      },
      "razao": "Respostas comportamentais dadas pela própria pessoa."
    },
    "respostas_cultura": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "id",
        "pergunta_id",
        "resposta_texto",
        "tempo_resposta_segundos",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "id": "R1",
        "pergunta_id": "R1",
        "resposta_texto": "inventario:apagar",
        "tempo_resposta_segundos": "R3",
        "updated_at": "R1"
      },
      "razao": "Idem, adequação cultural."
    },
    "respostas_disc": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "mais_caracteristico",
        "menos_caracteristico",
        "questao_id",
        "tempo_resposta_segundos"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "mais_caracteristico": "inventario:apagar",
        "menos_caracteristico": "inventario:apagar",
        "questao_id": "R1",
        "tempo_resposta_segundos": "R3"
      },
      "razao": "Idem, DISC."
    },
    "respostas_formulario": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "id",
        "pergunta_id",
        "resposta_numerica",
        "resposta_opcoes",
        "resposta_texto",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "id": "R1",
        "pergunta_id": "R1",
        "resposta_numerica": "inventario:preservar",
        "resposta_opcoes": "inventario:preservar_com_ressalva",
        "resposta_texto": "inventario:apagar",
        "updated_at": "R1"
      },
      "razao": "Idem, formulário da vaga."
    },
    "respostas_raven": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "created_at",
        "questao_id",
        "resposta",
        "tempo_resposta_segundos"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "created_at": "R1",
        "questao_id": "R1",
        "resposta": "inventario:apagar",
        "tempo_resposta_segundos": "R3"
      },
      "razao": "Idem, avaliação cognitiva."
    },
    "scores_bigfive": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "analise_ia",
        "candidatura_id",
        "created_at",
        "score_agreeableness",
        "score_conscientiousness",
        "score_extraversion",
        "score_neuroticism",
        "score_openness",
        "tempo_total_segundos",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "analise_ia": "inventario:preservar_com_ressalva",
        "candidatura_id": "R1",
        "created_at": "R1",
        "score_agreeableness": "R3",
        "score_conscientiousness": "R3",
        "score_extraversion": "R3",
        "score_neuroticism": "R3",
        "score_openness": "R3",
        "tempo_total_segundos": "R3",
        "updated_at": "R1"
      },
      "razao": "Perfil comportamental derivado — resultado da avaliação, direito do Art. 20."
    },
    "scores_candidato": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "candidatura_id",
        "citacoes",
        "created_at",
        "id",
        "metadata",
        "pergunta_id",
        "red_flags",
        "score",
        "score_max",
        "status",
        "subtipo",
        "tipo",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "candidatura_id": "R1",
        "citacoes": "inventario:apagar",
        "created_at": "R1",
        "id": "R1",
        "metadata": "inventario:preservar_com_ressalva",
        "pergunta_id": "R1",
        "red_flags": "inventario:preservar",
        "score": "R3",
        "score_max": "R3",
        "status": "R3",
        "subtipo": "decisoes_por_coluna",
        "tipo": "R3",
        "updated_at": "R1"
      },
      "razao": "Score consolidado por pergunta, com citações literais do que a pessoa disse."
    },
    "scores_disc": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "analise_ia",
        "candidatura_id",
        "created_at",
        "perfil_primario",
        "perfil_secundario",
        "score_c",
        "score_d",
        "score_i",
        "score_s",
        "tempo_total_segundos",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "analise_ia": "inventario:preservar_com_ressalva",
        "candidatura_id": "R1",
        "created_at": "R1",
        "perfil_primario": "decisoes_por_coluna",
        "perfil_secundario": "decisoes_por_coluna",
        "score_c": "R3",
        "score_d": "R3",
        "score_i": "R3",
        "score_s": "R3",
        "tempo_total_segundos": "R3",
        "updated_at": "R1"
      },
      "razao": "Idem, DISC."
    },
    "scores_raven": {
      "chave_titular": "candidatura_id",
      "colunas": [
        "acertos_por_serie",
        "analise_ia",
        "candidatura_id",
        "classificacao",
        "created_at",
        "percentil",
        "percentual_acerto",
        "tempo_total_segundos",
        "total_acertos",
        "updated_at"
      ],
      "colunas_excluidas": {},
      "ligacao": "via:candidaturas",
      "proveniencia": {
        "acertos_por_serie": "decisoes_por_coluna",
        "analise_ia": "inventario:preservar_com_ressalva",
        "candidatura_id": "R1",
        "classificacao": "decisoes_por_coluna",
        "created_at": "R1",
        "percentil": "R3",
        "percentual_acerto": "R3",
        "tempo_total_segundos": "R3",
        "total_acertos": "R3",
        "updated_at": "R1"
      },
      "razao": "Idem, cognitivo."
    },
    "solicitacoes_dados": {
      "chave_titular": "candidato_id",
      "colunas": [
        "atendido_em",
        "candidato_id",
        "causa",
        "id",
        "situacao",
        "solicitado_em",
        "tipo"
      ],
      "colunas_excluidas": {},
      "ligacao": "direta",
      "proveniencia": {
        "atendido_em": "R1",
        "candidato_id": "R2:do_titular",
        "causa": "decisoes_por_coluna",
        "id": "R1",
        "situacao": "decisoes_por_coluna",
        "solicitado_em": "R1",
        "tipo": "decisoes_por_coluna"
      },
      "razao": "Os próprios pedidos de acesso/exclusão do titular — o registro de que ele exerceu o direito. DDL escrito no 44-02, aplicado no 44-04."
    }
  }
} as const;
