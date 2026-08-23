export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agendamentos_entrevista: {
        Row: {
          agendado_por: string | null
          candidatura_id: string
          compareceu: boolean | null
          created_at: string
          data_hora: string
          deleted_at: string | null
          entrevistador: string | null
          id: string
          local_ou_link: string | null
          observacoes_rh: string | null
          status: Database["public"]["Enums"]["status_entrevista"]
          tipo: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
          updated_at: string
          updated_by: string | null
          vaga_id: string
        }
        Insert: {
          agendado_por?: string | null
          candidatura_id: string
          compareceu?: boolean | null
          created_at?: string
          data_hora: string
          deleted_at?: string | null
          entrevistador?: string | null
          id?: string
          local_ou_link?: string | null
          observacoes_rh?: string | null
          status?: Database["public"]["Enums"]["status_entrevista"]
          tipo: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
          updated_at?: string
          updated_by?: string | null
          vaga_id: string
        }
        Update: {
          agendado_por?: string | null
          candidatura_id?: string
          compareceu?: boolean | null
          created_at?: string
          data_hora?: string
          deleted_at?: string | null
          entrevistador?: string | null
          id?: string
          local_ou_link?: string | null
          observacoes_rh?: string | null
          status?: Database["public"]["Enums"]["status_entrevista"]
          tipo?: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
          updated_at?: string
          updated_by?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_entrevista_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_entrevista_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "agendamentos_entrevista_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_entrevista_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_logs: {
        Row: {
          attempt_number: number
          call_type: Database["public"]["Enums"]["llm_call_type"]
          candidato_id: string | null
          cost_usd: number | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          input_token_count: number
          latency_ms: number
          model_id: string
          model_snapshot: string | null
          output_token_count: number
          parsed_reasoning: string | null
          parsed_score: number | null
          prompt_hash: string
          prompt_version: string | null
          prompt_version_id: string
          provider: Database["public"]["Enums"]["llm_provider"]
          raw_response: Json
          retain_until: string
          success: boolean
          system_prompt: string
          triggered_by: string
          user_prompt_template: string
          vaga_id: string | null
        }
        Insert: {
          attempt_number?: number
          call_type: Database["public"]["Enums"]["llm_call_type"]
          candidato_id?: string | null
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          input_token_count: number
          latency_ms: number
          model_id: string
          model_snapshot?: string | null
          output_token_count: number
          parsed_reasoning?: string | null
          parsed_score?: number | null
          prompt_hash: string
          prompt_version?: string | null
          prompt_version_id: string
          provider: Database["public"]["Enums"]["llm_provider"]
          raw_response: Json
          retain_until: string
          success?: boolean
          system_prompt: string
          triggered_by?: string
          user_prompt_template: string
          vaga_id?: string | null
        }
        Update: {
          attempt_number?: number
          call_type?: Database["public"]["Enums"]["llm_call_type"]
          candidato_id?: string | null
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          input_token_count?: number
          latency_ms?: number
          model_id?: string
          model_snapshot?: string | null
          output_token_count?: number
          parsed_reasoning?: string | null
          parsed_score?: number | null
          prompt_hash?: string
          prompt_version?: string | null
          prompt_version_id?: string
          provider?: Database["public"]["Enums"]["llm_provider"]
          raw_response?: Json
          retain_until?: string
          success?: boolean
          system_prompt?: string
          triggered_by?: string
          user_prompt_template?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_logs_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_logs_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_logs_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
          {
            foreignKeyName: "ai_call_logs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_call_logs_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cost_daily: {
        Row: {
          call_count: number
          call_type: Database["public"]["Enums"]["llm_call_type"]
          date: string
          error_count: number
          id: string
          provider: Database["public"]["Enums"]["llm_provider"]
          total_cost_usd: number
          total_input_tokens: number
          total_output_tokens: number
          vaga_id: string | null
        }
        Insert: {
          call_count?: number
          call_type: Database["public"]["Enums"]["llm_call_type"]
          date: string
          error_count?: number
          id?: string
          provider: Database["public"]["Enums"]["llm_provider"]
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          vaga_id?: string | null
        }
        Update: {
          call_count?: number
          call_type?: Database["public"]["Enums"]["llm_call_type"]
          date?: string
          error_count?: number
          id?: string
          provider?: Database["public"]["Enums"]["llm_provider"]
          total_cost_usd?: number
          total_input_tokens?: number
          total_output_tokens?: number
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_cost_daily_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      analise_candidato_vaga: {
        Row: {
          candidatura_id: string
          created_at: string
          erro: string | null
          flags: string[]
          gaps: string[]
          id: string
          pontos_fortes: string[]
          resumo_cv: string | null
          resumo_respostas: string | null
          score_match: number | null
          status: string
          updated_at: string
          vaga_id: string
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          erro?: string | null
          flags?: string[]
          gaps?: string[]
          id?: string
          pontos_fortes?: string[]
          resumo_cv?: string | null
          resumo_respostas?: string | null
          score_match?: number | null
          status?: string
          updated_at?: string
          vaga_id: string
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          erro?: string | null
          flags?: string[]
          gaps?: string[]
          id?: string
          pontos_fortes?: string[]
          resumo_cv?: string | null
          resumo_respostas?: string | null
          score_match?: number | null
          status?: string
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analise_candidato_vaga_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analise_candidato_vaga_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "analise_candidato_vaga_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      autorizacoes: {
        Row: {
          autorizacao_analise_video: boolean | null
          autorizacao_comunicacao: boolean
          autorizacao_marketing_vagas: boolean | null
          autorizacao_retencao_curriculo: boolean
          autorizacao_uso_dados: boolean
          candidato_id: string
          consent_registrado_em: string | null
          consent_text_hash: string | null
          consent_text_version: string | null
          created_at: string
          id: string
          ip_aceite: unknown
          policy_version: string
          updated_at: string
          user_agent_aceite: string | null
          user_id: string | null
        }
        Insert: {
          autorizacao_analise_video?: boolean | null
          autorizacao_comunicacao?: boolean
          autorizacao_marketing_vagas?: boolean | null
          autorizacao_retencao_curriculo?: boolean
          autorizacao_uso_dados?: boolean
          candidato_id: string
          consent_registrado_em?: string | null
          consent_text_hash?: string | null
          consent_text_version?: string | null
          created_at?: string
          id?: string
          ip_aceite?: unknown
          policy_version?: string
          updated_at?: string
          user_agent_aceite?: string | null
          user_id?: string | null
        }
        Update: {
          autorizacao_analise_video?: boolean | null
          autorizacao_comunicacao?: boolean
          autorizacao_marketing_vagas?: boolean | null
          autorizacao_retencao_curriculo?: boolean
          autorizacao_uso_dados?: boolean
          candidato_id?: string
          consent_registrado_em?: string | null
          consent_text_hash?: string | null
          consent_text_version?: string | null
          created_at?: string
          id?: string
          ip_aceite?: unknown
          policy_version?: string
          updated_at?: string
          user_agent_aceite?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autorizacoes_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autorizacoes_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
        ]
      }
      avaliacoes_rh: {
        Row: {
          adequacao_cultural: number | null
          adequacao_tecnica: number | null
          avaliador_id: string
          candidatura_id: string
          competencias: Json
          created_at: string
          deleted_at: string | null
          entrevista_id: string
          id: string
          justificativa_recomendacao: string
          observacoes: string | null
          pontos_fortes: string[]
          pontos_fracos: string[]
          potencial_crescimento: number | null
          recomendacao: Database["public"]["Enums"]["recomendacao_avaliacao"]
          score_geral: number
          tipo_entrevista: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
          updated_at: string
        }
        Insert: {
          adequacao_cultural?: number | null
          adequacao_tecnica?: number | null
          avaliador_id: string
          candidatura_id: string
          competencias: Json
          created_at?: string
          deleted_at?: string | null
          entrevista_id: string
          id?: string
          justificativa_recomendacao: string
          observacoes?: string | null
          pontos_fortes?: string[]
          pontos_fracos?: string[]
          potencial_crescimento?: number | null
          recomendacao: Database["public"]["Enums"]["recomendacao_avaliacao"]
          score_geral: number
          tipo_entrevista: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
          updated_at?: string
        }
        Update: {
          adequacao_cultural?: number | null
          adequacao_tecnica?: number | null
          avaliador_id?: string
          candidatura_id?: string
          competencias?: Json
          created_at?: string
          deleted_at?: string | null
          entrevista_id?: string
          id?: string
          justificativa_recomendacao?: string
          observacoes?: string | null
          pontos_fortes?: string[]
          pontos_fracos?: string[]
          potencial_crescimento?: number | null
          recomendacao?: Database["public"]["Enums"]["recomendacao_avaliacao"]
          score_geral?: number
          tipo_entrevista?: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_rh_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_rh_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_rh_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_rh_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "avaliacoes_rh_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      bias_audit_log: {
        Row: {
          criado_em: string
          dados: Json
          id: string
          periodo: string | null
          snapshot_em: string
        }
        Insert: {
          criado_em?: string
          dados?: Json
          id?: string
          periodo?: string | null
          snapshot_em?: string
        }
        Update: {
          criado_em?: string
          dados?: Json
          id?: string
          periodo?: string | null
          snapshot_em?: string
        }
        Relationships: []
      }
      biblioteca_perguntas: {
        Row: {
          categoria: string
          created_at: string | null
          created_by: string | null
          criado_por_usuario: string
          deleted_at: string | null
          id: string
          is_publica: boolean | null
          limite_caracteres: number | null
          obrigatoria: boolean | null
          opcoes_resposta: Json | null
          permite_outros: boolean | null
          tags: string[] | null
          texto_ajuda: string | null
          texto_pergunta: string
          tipo_resposta: Database["public"]["Enums"]["tipo_resposta_pergunta"]
          titulo: string
          total_usos: number | null
          ultima_utilizacao: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          categoria: string
          created_at?: string | null
          created_by?: string | null
          criado_por_usuario: string
          deleted_at?: string | null
          id?: string
          is_publica?: boolean | null
          limite_caracteres?: number | null
          obrigatoria?: boolean | null
          opcoes_resposta?: Json | null
          permite_outros?: boolean | null
          tags?: string[] | null
          texto_ajuda?: string | null
          texto_pergunta: string
          tipo_resposta: Database["public"]["Enums"]["tipo_resposta_pergunta"]
          titulo: string
          total_usos?: number | null
          ultima_utilizacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          criado_por_usuario?: string
          deleted_at?: string | null
          id?: string
          is_publica?: boolean | null
          limite_caracteres?: number | null
          obrigatoria?: boolean | null
          opcoes_resposta?: Json | null
          permite_outros?: boolean | null
          tags?: string[] | null
          texto_ajuda?: string | null
          texto_pergunta?: string
          tipo_resposta?: Database["public"]["Enums"]["tipo_resposta_pergunta"]
          titulo?: string
          total_usos?: number | null
          ultima_utilizacao?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_perguntas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_perguntas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_perguntas_criado_por_usuario_fkey"
            columns: ["criado_por_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_perguntas_criado_por_usuario_fkey"
            columns: ["criado_por_usuario"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_perguntas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_perguntas_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      bigfive_itens: {
        Row: {
          ativo: boolean
          created_at: string
          dimensao: string
          faceta: number
          item_id: number
          ordem: number
          reverse_keyed: boolean
          texto: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dimensao: string
          faceta: number
          item_id: number
          ordem: number
          reverse_keyed: boolean
          texto: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dimensao?: string
          faceta?: number
          item_id?: number
          ordem?: number
          reverse_keyed?: boolean
          texto?: string
        }
        Relationships: []
      }
      candidate_ai_decisions: {
        Row: {
          ai_call_log_ids: string[]
          ai_composite_score: number
          ai_reasoning_summary: string
          ai_recommendation: string
          candidato_id: string
          created_at: string
          explanation_channel: string | null
          explanation_delivered_at: string | null
          human_decision: string | null
          human_notes: string | null
          human_overrode_ai: boolean | null
          id: string
          review_requested_at: string | null
          review_requested_by: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string
          vaga_id: string
        }
        Insert: {
          ai_call_log_ids: string[]
          ai_composite_score: number
          ai_reasoning_summary: string
          ai_recommendation: string
          candidato_id: string
          created_at?: string
          explanation_channel?: string | null
          explanation_delivered_at?: string | null
          human_decision?: string | null
          human_notes?: string | null
          human_overrode_ai?: boolean | null
          id?: string
          review_requested_at?: string | null
          review_requested_by?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
          vaga_id: string
        }
        Update: {
          ai_call_log_ids?: string[]
          ai_composite_score?: number
          ai_reasoning_summary?: string
          ai_recommendation?: string
          candidato_id?: string
          created_at?: string
          explanation_channel?: string | null
          explanation_delivered_at?: string | null
          human_decision?: string | null
          human_notes?: string | null
          human_overrode_ai?: boolean | null
          id?: string
          review_requested_at?: string | null
          review_requested_by?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_ai_decisions_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_ai_decisions_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_ai_decisions_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
          {
            foreignKeyName: "candidate_ai_decisions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_ai_decisions_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_ai_decisions_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          bairro: string | null
          bloqueado: boolean
          bloqueado_motivo: string | null
          celular: string
          cep: string | null
          cidade: string
          como_conheceu: string | null
          como_conheceu_detalhes: string | null
          complemento: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string
          data_ultimo_acesso: string | null
          deleted_at: string | null
          email: string
          email_verificado: boolean
          estado: string
          faixa_etaria_materializada: string | null
          genero: string | null
          id: string
          instagram: string | null
          instagram_url: string | null
          linkedin: string | null
          linkedin_url: string | null
          logradouro: string | null
          nome_completo: string
          numero: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          celular: string
          cep?: string | null
          cidade: string
          como_conheceu?: string | null
          como_conheceu_detalhes?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento: string
          data_ultimo_acesso?: string | null
          deleted_at?: string | null
          email: string
          email_verificado?: boolean
          estado: string
          faixa_etaria_materializada?: string | null
          genero?: string | null
          id?: string
          instagram?: string | null
          instagram_url?: string | null
          linkedin?: string | null
          linkedin_url?: string | null
          logradouro?: string | null
          nome_completo: string
          numero?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          bairro?: string | null
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          celular?: string
          cep?: string | null
          cidade?: string
          como_conheceu?: string | null
          como_conheceu_detalhes?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string
          data_ultimo_acesso?: string | null
          deleted_at?: string | null
          email?: string
          email_verificado?: boolean
          estado?: string
          faixa_etaria_materializada?: string | null
          genero?: string | null
          id?: string
          instagram?: string | null
          instagram_url?: string | null
          linkedin?: string | null
          linkedin_url?: string | null
          logradouro?: string | null
          nome_completo?: string
          numero?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      candidaturas: {
        Row: {
          analise_ia_bigfive: Json | null
          analise_ia_cultura: Json | null
          analise_ia_disc: Json | null
          analise_ia_entrevista_online: Json | null
          analise_ia_entrevista_presencial: Json | null
          analise_ia_formulario: Json | null
          analise_ia_raven: Json | null
          candidato_id: string
          created_at: string
          created_by: string | null
          curriculo_nome_original: string | null
          curriculo_tamanho_bytes: number | null
          curriculo_url: string | null
          data_bigfive_enviado: string | null
          data_candidatura: string
          data_cultura_enviado: string | null
          data_decisao_final: string | null
          data_disc_enviado: string | null
          data_entrevista_online: string | null
          data_entrevista_presencial: string | null
          data_formulario_enviado: string | null
          data_raven_enviado: string | null
          deleted_at: string | null
          encerrada_a_pedido_em: string | null
          etapa_atual: Database["public"]["Enums"]["etapa_processo"]
          etapa_justificativa: string | null
          feedback_rejeicao: string | null
          id: string
          is_favorito: boolean
          is_rascunho: boolean
          motivo_rejeicao: string | null
          observacoes_rh: string | null
          opcao_knockout_id: string | null
          origem_candidatura: string | null
          score_geral: number | null
          status: Database["public"]["Enums"]["status_candidatura"]
          tempo_preenchimento_segundos: number | null
          updated_at: string
          updated_by: string | null
          vaga_id: string
        }
        Insert: {
          analise_ia_bigfive?: Json | null
          analise_ia_cultura?: Json | null
          analise_ia_disc?: Json | null
          analise_ia_entrevista_online?: Json | null
          analise_ia_entrevista_presencial?: Json | null
          analise_ia_formulario?: Json | null
          analise_ia_raven?: Json | null
          candidato_id: string
          created_at?: string
          created_by?: string | null
          curriculo_nome_original?: string | null
          curriculo_tamanho_bytes?: number | null
          curriculo_url?: string | null
          data_bigfive_enviado?: string | null
          data_candidatura?: string
          data_cultura_enviado?: string | null
          data_decisao_final?: string | null
          data_disc_enviado?: string | null
          data_entrevista_online?: string | null
          data_entrevista_presencial?: string | null
          data_formulario_enviado?: string | null
          data_raven_enviado?: string | null
          deleted_at?: string | null
          encerrada_a_pedido_em?: string | null
          etapa_atual?: Database["public"]["Enums"]["etapa_processo"]
          etapa_justificativa?: string | null
          feedback_rejeicao?: string | null
          id?: string
          is_favorito?: boolean
          is_rascunho?: boolean
          motivo_rejeicao?: string | null
          observacoes_rh?: string | null
          opcao_knockout_id?: string | null
          origem_candidatura?: string | null
          score_geral?: number | null
          status?: Database["public"]["Enums"]["status_candidatura"]
          tempo_preenchimento_segundos?: number | null
          updated_at?: string
          updated_by?: string | null
          vaga_id: string
        }
        Update: {
          analise_ia_bigfive?: Json | null
          analise_ia_cultura?: Json | null
          analise_ia_disc?: Json | null
          analise_ia_entrevista_online?: Json | null
          analise_ia_entrevista_presencial?: Json | null
          analise_ia_formulario?: Json | null
          analise_ia_raven?: Json | null
          candidato_id?: string
          created_at?: string
          created_by?: string | null
          curriculo_nome_original?: string | null
          curriculo_tamanho_bytes?: number | null
          curriculo_url?: string | null
          data_bigfive_enviado?: string | null
          data_candidatura?: string
          data_cultura_enviado?: string | null
          data_decisao_final?: string | null
          data_disc_enviado?: string | null
          data_entrevista_online?: string | null
          data_entrevista_presencial?: string | null
          data_formulario_enviado?: string | null
          data_raven_enviado?: string | null
          deleted_at?: string | null
          encerrada_a_pedido_em?: string | null
          etapa_atual?: Database["public"]["Enums"]["etapa_processo"]
          etapa_justificativa?: string | null
          feedback_rejeicao?: string | null
          id?: string
          is_favorito?: boolean
          is_rascunho?: boolean
          motivo_rejeicao?: string | null
          observacoes_rh?: string | null
          opcao_knockout_id?: string | null
          origem_candidatura?: string | null
          score_geral?: number | null
          status?: Database["public"]["Enums"]["status_candidatura"]
          tempo_preenchimento_segundos?: number | null
          updated_at?: string
          updated_by?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
          {
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      classe_evento_notificacao: {
        Row: {
          classe: string
          descricao: string
          evento: string
        }
        Insert: {
          classe: string
          descricao: string
          evento: string
        }
        Update: {
          classe?: string
          descricao?: string
          evento?: string
        }
        Relationships: []
      }
      cognitivo_itens: {
        Row: {
          alternativas: Json
          created_at: string
          enunciado: string
          gabarito_idx: number
          id: string
          ordem: number
          secao: string
        }
        Insert: {
          alternativas: Json
          created_at?: string
          enunciado: string
          gabarito_idx: number
          id?: string
          ordem?: number
          secao: string
        }
        Update: {
          alternativas?: Json
          created_at?: string
          enunciado?: string
          gabarito_idx?: number
          id?: string
          ordem?: number
          secao?: string
        }
        Relationships: []
      }
      cognitivo_respostas: {
        Row: {
          candidatura_id: string
          completion_time_seconds: number | null
          created_at: string
          id: string
          proctoring: Json
          raw_responses: Json
          shuffle_seed: string | null
        }
        Insert: {
          candidatura_id: string
          completion_time_seconds?: number | null
          created_at?: string
          id?: string
          proctoring?: Json
          raw_responses?: Json
          shuffle_seed?: string | null
        }
        Update: {
          candidatura_id?: string
          completion_time_seconds?: number | null
          created_at?: string
          id?: string
          proctoring?: Json
          raw_responses?: Json
          shuffle_seed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cognitivo_respostas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cognitivo_respostas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "cognitivo_respostas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      comparativo_solicitado: {
        Row: {
          candidatura_ids: string[]
          created_at: string
          id: string
          latencia_ms: number | null
          ranking: Json
          solicitado_por: string | null
          vaga_id: string
        }
        Insert: {
          candidatura_ids: string[]
          created_at?: string
          id?: string
          latencia_ms?: number | null
          ranking: Json
          solicitado_por?: string | null
          vaga_id: string
        }
        Update: {
          candidatura_ids?: string[]
          created_at?: string
          id?: string
          latencia_ms?: number | null
          ranking?: Json
          solicitado_por?: string | null
          vaga_id?: string
        }
        Relationships: []
      }
      config_janela_exclusao: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string | null
          dias: number
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao?: string | null
          dias: number
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string | null
          dias?: number
        }
        Relationships: []
      }
      config_purga: {
        Row: {
          alterado_por: string | null
          atualizado_em: string
          cap_titulares: number
          id: boolean
          janela_notificacoes_meses: number
          modo: string
        }
        Insert: {
          alterado_por?: string | null
          atualizado_em?: string
          cap_titulares?: number
          id?: boolean
          janela_notificacoes_meses?: number
          modo?: string
        }
        Update: {
          alterado_por?: string | null
          atualizado_em?: string
          cap_titulares?: number
          id?: boolean
          janela_notificacoes_meses?: number
          modo?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_purga_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_purga_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_retencao_etapa: {
        Row: {
          alterado_por: string | null
          atualizado_em: string
          elegivel_purga: boolean
          etapa: Database["public"]["Enums"]["etapa_processo"]
          janela_meses: number
          origem: string
        }
        Insert: {
          alterado_por?: string | null
          atualizado_em?: string
          elegivel_purga?: boolean
          etapa: Database["public"]["Enums"]["etapa_processo"]
          janela_meses: number
          origem?: string
        }
        Update: {
          alterado_por?: string | null
          atualizado_em?: string
          elegivel_purga?: boolean
          etapa?: Database["public"]["Enums"]["etapa_processo"]
          janela_meses?: number
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_retencao_etapa_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_retencao_etapa_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_sla_dados: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string | null
          dias_atencao: number
          dias_atraso: number
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao?: string | null
          dias_atencao: number
          dias_atraso: number
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string | null
          dias_atencao?: number
          dias_atraso?: number
        }
        Relationships: []
      }
      config_sla_etapa: {
        Row: {
          atualizado_em: string
          etapa: Database["public"]["Enums"]["etapa_processo"]
          prazo_unidade: string | null
          prazo_valor: number | null
          rotulo_candidato: string
        }
        Insert: {
          atualizado_em?: string
          etapa: Database["public"]["Enums"]["etapa_processo"]
          prazo_unidade?: string | null
          prazo_valor?: number | null
          rotulo_candidato: string
        }
        Update: {
          atualizado_em?: string
          etapa?: Database["public"]["Enums"]["etapa_processo"]
          prazo_unidade?: string | null
          prazo_valor?: number | null
          rotulo_candidato?: string
        }
        Relationships: []
      }
      config_sla_revisao: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string | null
          dias_atencao: number
          dias_atraso: number
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao?: string | null
          dias_atencao: number
          dias_atraso: number
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string | null
          dias_atencao?: number
          dias_atraso?: number
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          cor_accent: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          dias_retencao_logs: number | null
          email_contato: string | null
          email_notificacoes: string[] | null
          empresa_id: string
          endereco_completo: string | null
          favicon_url: string | null
          id: string
          idioma: string | null
          logo_url: string | null
          max_tamanho_curriculo_mb: number | null
          max_tamanho_gravacao_mb: number | null
          nome_empresa: string
          notificar_nova_candidatura: boolean | null
          notificar_teste_concluido: boolean | null
          site_url: string | null
          smtp_from_email: string | null
          smtp_from_nome: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_senha_encrypted: string | null
          smtp_usar_tls: boolean | null
          smtp_usuario: string | null
          telefone_contato: string | null
          timezone: string | null
          updated_at: string | null
          updated_by: string | null
          webhook_analise_bigfive_url: string | null
          webhook_analise_cultura_url: string | null
          webhook_analise_disc_url: string | null
          webhook_analise_entrevista_url: string | null
          webhook_analise_formulario_url: string | null
          webhook_analise_raven_url: string | null
          webhook_envio_emails_url: string | null
          webhook_lembretes_url: string | null
          webhook_retry_tentativas: number | null
          webhook_secret: string | null
          webhook_timeout_segundos: number | null
        }
        Insert: {
          cor_accent?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dias_retencao_logs?: number | null
          email_contato?: string | null
          email_notificacoes?: string[] | null
          empresa_id?: string
          endereco_completo?: string | null
          favicon_url?: string | null
          id?: string
          idioma?: string | null
          logo_url?: string | null
          max_tamanho_curriculo_mb?: number | null
          max_tamanho_gravacao_mb?: number | null
          nome_empresa?: string
          notificar_nova_candidatura?: boolean | null
          notificar_teste_concluido?: boolean | null
          site_url?: string | null
          smtp_from_email?: string | null
          smtp_from_nome?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_senha_encrypted?: string | null
          smtp_usar_tls?: boolean | null
          smtp_usuario?: string | null
          telefone_contato?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          webhook_analise_bigfive_url?: string | null
          webhook_analise_cultura_url?: string | null
          webhook_analise_disc_url?: string | null
          webhook_analise_entrevista_url?: string | null
          webhook_analise_formulario_url?: string | null
          webhook_analise_raven_url?: string | null
          webhook_envio_emails_url?: string | null
          webhook_lembretes_url?: string | null
          webhook_retry_tentativas?: number | null
          webhook_secret?: string | null
          webhook_timeout_segundos?: number | null
        }
        Update: {
          cor_accent?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          dias_retencao_logs?: number | null
          email_contato?: string | null
          email_notificacoes?: string[] | null
          empresa_id?: string
          endereco_completo?: string | null
          favicon_url?: string | null
          id?: string
          idioma?: string | null
          logo_url?: string | null
          max_tamanho_curriculo_mb?: number | null
          max_tamanho_gravacao_mb?: number | null
          nome_empresa?: string
          notificar_nova_candidatura?: boolean | null
          notificar_teste_concluido?: boolean | null
          site_url?: string | null
          smtp_from_email?: string | null
          smtp_from_nome?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_senha_encrypted?: string | null
          smtp_usar_tls?: boolean | null
          smtp_usuario?: string | null
          telefone_contato?: string | null
          timezone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          webhook_analise_bigfive_url?: string | null
          webhook_analise_cultura_url?: string | null
          webhook_analise_disc_url?: string | null
          webhook_analise_entrevista_url?: string | null
          webhook_analise_formulario_url?: string | null
          webhook_analise_raven_url?: string | null
          webhook_envio_emails_url?: string | null
          webhook_lembretes_url?: string | null
          webhook_retry_tentativas?: number | null
          webhook_secret?: string | null
          webhook_timeout_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_empresa_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_log: {
        Row: {
          created_at: string
          deleted_at: string
          deletion_type: string
          id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deletion_type: string
          id?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deletion_type?: string
          id?: string
        }
        Relationships: []
      }
      decisao_final: {
        Row: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em: string
          explicacao_solicitada_em: string | null
          id: string
          justificativa: string
          por_usuario: string
          revisao_por_usuario: string | null
          revisao_respondida_em: string | null
          revisao_resultado: string | null
          revisao_solicitada_em: string | null
          revisao_veredito: string | null
        }
        Insert: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em?: string
          explicacao_solicitada_em?: string | null
          id?: string
          justificativa: string
          por_usuario: string
          revisao_por_usuario?: string | null
          revisao_respondida_em?: string | null
          revisao_resultado?: string | null
          revisao_solicitada_em?: string | null
          revisao_veredito?: string | null
        }
        Update: {
          candidatura_id?: string
          decisao?: Database["public"]["Enums"]["decisao_final_resultado"]
          em?: string
          explicacao_solicitada_em?: string | null
          id?: string
          justificativa?: string
          por_usuario?: string
          revisao_por_usuario?: string | null
          revisao_respondida_em?: string | null
          revisao_resultado?: string | null
          revisao_solicitada_em?: string | null
          revisao_veredito?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisao_final_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisao_final_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "decisao_final_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      decisao_final_historico: {
        Row: {
          arquivado_em: string
          candidatura_id: string
          decidido_em: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          id: string
          justificativa: string
          por_usuario: string
        }
        Insert: {
          arquivado_em?: string
          candidatura_id: string
          decidido_em: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          id?: string
          justificativa: string
          por_usuario: string
        }
        Update: {
          arquivado_em?: string
          candidatura_id?: string
          decidido_em?: string
          decisao?: Database["public"]["Enums"]["decisao_final_resultado"]
          id?: string
          justificativa?: string
          por_usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisao_final_historico_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisao_final_historico_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "decisao_final_historico_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      devolutivas_candidato: {
        Row: {
          candidato_id: string
          candidatura_id: string
          conteudo_jsonb: Json
          created_at: string
          id: string
          modelo_ia: string | null
          prompt_version: string | null
        }
        Insert: {
          candidato_id: string
          candidatura_id: string
          conteudo_jsonb: Json
          created_at?: string
          id?: string
          modelo_ia?: string | null
          prompt_version?: string | null
        }
        Update: {
          candidato_id?: string
          candidatura_id?: string
          conteudo_jsonb?: Json
          created_at?: string
          id?: string
          modelo_ia?: string | null
          prompt_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devolutivas_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolutivas_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "devolutivas_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilidade: {
        Row: {
          candidato_id: string
          created_at: string
          data_disponibilidade: string | null
          disponibilidade_imediata: boolean
          id: string
          periodo_disponivel: string
          regime_trabalho: string
          updated_at: string
        }
        Insert: {
          candidato_id: string
          created_at?: string
          data_disponibilidade?: string | null
          disponibilidade_imediata?: boolean
          id?: string
          periodo_disponivel: string
          regime_trabalho: string
          updated_at?: string
        }
        Update: {
          candidato_id?: string
          created_at?: string
          data_disponibilidade?: string | null
          disponibilidade_imediata?: boolean
          id?: string
          periodo_disponivel?: string
          regime_trabalho?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidade_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilidade_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disponibilidade_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
        ]
      }
      entrevista_analises: {
        Row: {
          bias_flags: Json | null
          bloqueio_avanco: boolean
          candidatura_id: string
          citacoes: Json | null
          competencias: Json | null
          created_at: string
          id: string
          notas_humanas: string | null
          prompt_version: string | null
          revisada_por: string | null
          revisao_confirmada_em: string | null
          scores_humanos: Json | null
          status_analise: string
        }
        Insert: {
          bias_flags?: Json | null
          bloqueio_avanco?: boolean
          candidatura_id: string
          citacoes?: Json | null
          competencias?: Json | null
          created_at?: string
          id?: string
          notas_humanas?: string | null
          prompt_version?: string | null
          revisada_por?: string | null
          revisao_confirmada_em?: string | null
          scores_humanos?: Json | null
          status_analise?: string
        }
        Update: {
          bias_flags?: Json | null
          bloqueio_avanco?: boolean
          candidatura_id?: string
          citacoes?: Json | null
          competencias?: Json | null
          created_at?: string
          id?: string
          notas_humanas?: string | null
          prompt_version?: string | null
          revisada_por?: string | null
          revisao_confirmada_em?: string | null
          scores_humanos?: Json | null
          status_analise?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevista_analises_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevista_analises_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "entrevista_analises_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      entrevista_guias: {
        Row: {
          candidatura_id: string
          created_at: string
          guia: Json
          id: string
          prompt_version: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          guia: Json
          id?: string
          prompt_version?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          guia?: Json
          id?: string
          prompt_version?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevista_guias_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevista_guias_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "entrevista_guias_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      entrevistas_online: {
        Row: {
          agendado_por: string
          analise_ia: Json | null
          avaliacao_candidato_score: number | null
          candidatura_id: string
          created_at: string
          data_agendada: string
          data_fim_real: string | null
          data_inicio_real: string | null
          deleted_at: string | null
          duracao_estimada_minutos: number | null
          duracao_real_minutos: number | null
          feedback_candidato: string | null
          gravacao_tamanho_mb: number | null
          gravacao_url: string | null
          id: string
          link_videochamada: string
          notas_durante: string | null
          notas_preparacao: string | null
          observacoes_gerais: string | null
          plataforma: string | null
          realizado_por: string | null
          resumo_ia: string | null
          status: Database["public"]["Enums"]["status_entrevista"]
          transcricao: string | null
          updated_at: string
        }
        Insert: {
          agendado_por: string
          analise_ia?: Json | null
          avaliacao_candidato_score?: number | null
          candidatura_id: string
          created_at?: string
          data_agendada: string
          data_fim_real?: string | null
          data_inicio_real?: string | null
          deleted_at?: string | null
          duracao_estimada_minutos?: number | null
          duracao_real_minutos?: number | null
          feedback_candidato?: string | null
          gravacao_tamanho_mb?: number | null
          gravacao_url?: string | null
          id?: string
          link_videochamada: string
          notas_durante?: string | null
          notas_preparacao?: string | null
          observacoes_gerais?: string | null
          plataforma?: string | null
          realizado_por?: string | null
          resumo_ia?: string | null
          status?: Database["public"]["Enums"]["status_entrevista"]
          transcricao?: string | null
          updated_at?: string
        }
        Update: {
          agendado_por?: string
          analise_ia?: Json | null
          avaliacao_candidato_score?: number | null
          candidatura_id?: string
          created_at?: string
          data_agendada?: string
          data_fim_real?: string | null
          data_inicio_real?: string | null
          deleted_at?: string | null
          duracao_estimada_minutos?: number | null
          duracao_real_minutos?: number | null
          feedback_candidato?: string | null
          gravacao_tamanho_mb?: number | null
          gravacao_url?: string | null
          id?: string
          link_videochamada?: string
          notas_durante?: string | null
          notas_preparacao?: string | null
          observacoes_gerais?: string | null
          plataforma?: string | null
          realizado_por?: string | null
          resumo_ia?: string | null
          status?: Database["public"]["Enums"]["status_entrevista"]
          transcricao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_online_agendado_por_fkey"
            columns: ["agendado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_online_agendado_por_fkey"
            columns: ["agendado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_online_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_online_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "entrevistas_online_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_online_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_online_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      entrevistas_presenciais: {
        Row: {
          agendado_por: string
          candidatura_id: string
          created_at: string
          data_agendada: string
          data_fim_real: string | null
          data_inicio_real: string | null
          deleted_at: string | null
          documentos_apresentados: Json | null
          documentos_necessarios: Json | null
          duracao_estimada_minutos: number | null
          duracao_real_minutos: number | null
          id: string
          instrucoes_acesso: string | null
          local_entrevista: string
          notas_durante: string | null
          notas_preparacao: string | null
          observacoes_gerais: string | null
          primeira_impressao: string | null
          realizado_por: string | null
          sala_numero: string | null
          status: Database["public"]["Enums"]["status_entrevista"]
          updated_at: string
        }
        Insert: {
          agendado_por: string
          candidatura_id: string
          created_at?: string
          data_agendada: string
          data_fim_real?: string | null
          data_inicio_real?: string | null
          deleted_at?: string | null
          documentos_apresentados?: Json | null
          documentos_necessarios?: Json | null
          duracao_estimada_minutos?: number | null
          duracao_real_minutos?: number | null
          id?: string
          instrucoes_acesso?: string | null
          local_entrevista: string
          notas_durante?: string | null
          notas_preparacao?: string | null
          observacoes_gerais?: string | null
          primeira_impressao?: string | null
          realizado_por?: string | null
          sala_numero?: string | null
          status?: Database["public"]["Enums"]["status_entrevista"]
          updated_at?: string
        }
        Update: {
          agendado_por?: string
          candidatura_id?: string
          created_at?: string
          data_agendada?: string
          data_fim_real?: string | null
          data_inicio_real?: string | null
          deleted_at?: string | null
          documentos_apresentados?: Json | null
          documentos_necessarios?: Json | null
          duracao_estimada_minutos?: number | null
          duracao_real_minutos?: number | null
          id?: string
          instrucoes_acesso?: string | null
          local_entrevista?: string
          notas_durante?: string | null
          notas_preparacao?: string | null
          observacoes_gerais?: string | null
          primeira_impressao?: string | null
          realizado_por?: string | null
          sala_numero?: string | null
          status?: Database["public"]["Enums"]["status_entrevista"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_presenciais_agendado_por_fkey"
            columns: ["agendado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_presenciais_agendado_por_fkey"
            columns: ["agendado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_presenciais_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_presenciais_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "entrevistas_presenciais_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_presenciais_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_presenciais_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_acoes: {
        Row: {
          candidatura_id: string
          created_at: string
          descricao: string
          id: string
          metadata: Json | null
          tipo_acao: Database["public"]["Enums"]["tipo_acao_historico"]
          usuario_id: string | null
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          descricao: string
          id?: string
          metadata?: Json | null
          tipo_acao: Database["public"]["Enums"]["tipo_acao_historico"]
          usuario_id?: string | null
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          descricao?: string
          id?: string
          metadata?: Json | null
          tipo_acao?: Database["public"]["Enums"]["tipo_acao_historico"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_acoes_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_acoes_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "historico_acoes_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_acoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_acoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_candidatura: {
        Row: {
          ator: string | null
          auto_rejeitado: boolean
          candidatura_id: string
          criado_em: string
          criterio_texto: string | null
          etapa_de: Database["public"]["Enums"]["etapa_processo"] | null
          etapa_para: Database["public"]["Enums"]["etapa_processo"]
          id: string
        }
        Insert: {
          ator?: string | null
          auto_rejeitado?: boolean
          candidatura_id: string
          criado_em?: string
          criterio_texto?: string | null
          etapa_de?: Database["public"]["Enums"]["etapa_processo"] | null
          etapa_para: Database["public"]["Enums"]["etapa_processo"]
          id?: string
        }
        Update: {
          ator?: string | null
          auto_rejeitado?: boolean
          candidatura_id?: string
          criado_em?: string
          criterio_texto?: string | null
          etapa_de?: Database["public"]["Enums"]["etapa_processo"] | null
          etapa_para?: Database["public"]["Enums"]["etapa_processo"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_candidatura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_candidatura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "historico_candidatura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_acesso: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_info: string | null
          device_type: string | null
          email_tentativa: string | null
          erro_mensagem: string | null
          evento: string
          id: string
          ip_address: unknown
          operating_system: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          device_type?: string | null
          email_tentativa?: string | null
          erro_mensagem?: string | null
          evento: string
          id?: string
          ip_address?: unknown
          operating_system?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          device_type?: string | null
          email_tentativa?: string | null
          erro_mensagem?: string | null
          evento?: string
          id?: string
          ip_address?: unknown
          operating_system?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      logs_auditoria: {
        Row: {
          acao: string
          categoria: Database["public"]["Enums"]["categoria_log_auditoria"]
          created_at: string | null
          dados_antes: Json | null
          dados_depois: Json | null
          descricao: string
          duracao_ms: number | null
          erro_mensagem: string | null
          id: string
          ip_address: unknown
          recurso_id: string | null
          recurso_tipo: string | null
          sessao_id: string | null
          severidade: Database["public"]["Enums"]["severidade_log"]
          sucesso: boolean | null
          user_agent: string | null
          usuario_id: string | null
          usuario_tipo: string | null
        }
        Insert: {
          acao: string
          categoria: Database["public"]["Enums"]["categoria_log_auditoria"]
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          descricao: string
          duracao_ms?: number | null
          erro_mensagem?: string | null
          id?: string
          ip_address?: unknown
          recurso_id?: string | null
          recurso_tipo?: string | null
          sessao_id?: string | null
          severidade?: Database["public"]["Enums"]["severidade_log"]
          sucesso?: boolean | null
          user_agent?: string | null
          usuario_id?: string | null
          usuario_tipo?: string | null
        }
        Update: {
          acao?: string
          categoria?: Database["public"]["Enums"]["categoria_log_auditoria"]
          created_at?: string | null
          dados_antes?: Json | null
          dados_depois?: Json | null
          descricao?: string
          duracao_ms?: number | null
          erro_mensagem?: string | null
          id?: string
          ip_address?: unknown
          recurso_id?: string | null
          recurso_tipo?: string | null
          sessao_id?: string | null
          severidade?: Database["public"]["Enums"]["severidade_log"]
          sucesso?: boolean | null
          user_agent?: string | null
          usuario_id?: string | null
          usuario_tipo?: string | null
        }
        Relationships: []
      }
      notificacoes_enviadas: {
        Row: {
          atualizado_em: string
          bounce_em: string | null
          candidato_id: string
          candidatura_id: string
          criado_em: string
          dedupe_key: string
          destinatario_email: string
          destinatario_original: string
          entregue_em: string | null
          enviado_em: string | null
          evento: string
          id: string
          modo: string
          provider_message_id: string | null
          proxima_tentativa_em: string | null
          reclamado_em: string | null
          status: Database["public"]["Enums"]["status_notificacao"]
          template: string
          tentativas: number
          ultimo_erro: string | null
        }
        Insert: {
          atualizado_em?: string
          bounce_em?: string | null
          candidato_id: string
          candidatura_id: string
          criado_em?: string
          dedupe_key: string
          destinatario_email: string
          destinatario_original: string
          entregue_em?: string | null
          enviado_em?: string | null
          evento: string
          id?: string
          modo?: string
          provider_message_id?: string | null
          proxima_tentativa_em?: string | null
          reclamado_em?: string | null
          status?: Database["public"]["Enums"]["status_notificacao"]
          template: string
          tentativas?: number
          ultimo_erro?: string | null
        }
        Update: {
          atualizado_em?: string
          bounce_em?: string | null
          candidato_id?: string
          candidatura_id?: string
          criado_em?: string
          dedupe_key?: string
          destinatario_email?: string
          destinatario_original?: string
          entregue_em?: string | null
          enviado_em?: string | null
          evento?: string
          id?: string
          modo?: string
          provider_message_id?: string | null
          proxima_tentativa_em?: string | null
          reclamado_em?: string | null
          status?: Database["public"]["Enums"]["status_notificacao"]
          template?: string
          tentativas?: number
          ultimo_erro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_enviadas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_enviadas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_enviadas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
          {
            foreignKeyName: "notificacoes_enviadas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_enviadas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "notificacoes_enviadas_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      pergunta_opcao_metadata: {
        Row: {
          created_at: string
          id: string
          nota_ia: string | null
          opcao_id: string
          opcao_texto: string
          ordem: number
          pergunta_id: string
          peso: number
          tag: Database["public"]["Enums"]["enum_tag_opcao"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nota_ia?: string | null
          opcao_id: string
          opcao_texto: string
          ordem?: number
          pergunta_id: string
          peso?: number
          tag?: Database["public"]["Enums"]["enum_tag_opcao"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nota_ia?: string | null
          opcao_id?: string
          opcao_texto?: string
          ordem?: number
          pergunta_id?: string
          peso?: number
          tag?: Database["public"]["Enums"]["enum_tag_opcao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pergunta_opcao_metadata_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas_formulario"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas: {
        Row: {
          cargo: string
          cenario: string
          content_hash: string | null
          created_at: string
          dimensao_primaria: string | null
          formato: string
          id: string
          rubric: Json | null
          status: string
          tempo_est_min: number | null
          tipo: string
        }
        Insert: {
          cargo: string
          cenario: string
          content_hash?: string | null
          created_at?: string
          dimensao_primaria?: string | null
          formato: string
          id?: string
          rubric?: Json | null
          status?: string
          tempo_est_min?: number | null
          tipo?: string
        }
        Update: {
          cargo?: string
          cenario?: string
          content_hash?: string | null
          created_at?: string
          dimensao_primaria?: string | null
          formato?: string
          id?: string
          rubric?: Json | null
          status?: string
          tempo_est_min?: number | null
          tipo?: string
        }
        Relationships: []
      }
      perguntas_cultura: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          limite_caracteres: number | null
          obrigatoria: boolean
          ordem: number
          texto_ajuda: string | null
          texto_pergunta: string
          updated_at: string
          updated_by: string | null
          vaga_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          limite_caracteres?: number | null
          obrigatoria?: boolean
          ordem: number
          texto_ajuda?: string | null
          texto_pergunta: string
          updated_at?: string
          updated_by?: string | null
          vaga_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          limite_caracteres?: number | null
          obrigatoria?: boolean
          ordem?: number
          texto_ajuda?: string | null
          texto_pergunta?: string
          updated_at?: string
          updated_by?: string | null
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_cultura_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas_formulario: {
        Row: {
          bloco: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          limite_caracteres: number | null
          obrigatoria: boolean
          opcoes_resposta: Json | null
          ordem: number
          permite_outros: boolean
          texto_ajuda: string | null
          texto_pergunta: string
          tipo_resposta: Database["public"]["Enums"]["tipo_resposta_pergunta"]
          updated_at: string
          updated_by: string | null
          vaga_id: string
          valor_maximo: number | null
          valor_minimo: number | null
        }
        Insert: {
          bloco: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          limite_caracteres?: number | null
          obrigatoria?: boolean
          opcoes_resposta?: Json | null
          ordem: number
          permite_outros?: boolean
          texto_ajuda?: string | null
          texto_pergunta: string
          tipo_resposta: Database["public"]["Enums"]["tipo_resposta_pergunta"]
          updated_at?: string
          updated_by?: string | null
          vaga_id: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Update: {
          bloco?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          limite_caracteres?: number | null
          obrigatoria?: boolean
          opcoes_resposta?: Json | null
          ordem?: number
          permite_outros?: boolean
          texto_ajuda?: string | null
          texto_pergunta?: string
          tipo_resposta?: Database["public"]["Enums"]["tipo_resposta_pergunta"]
          updated_at?: string
          updated_by?: string | null
          vaga_id?: string
          valor_maximo?: number | null
          valor_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_formulario_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas_opcao_sjt: {
        Row: {
          created_at: string
          id: string
          opcao_id: string
          opcao_texto: string
          ordem: number
          pergunta_id: string
          peso: number
          tag: Database["public"]["Enums"]["enum_tag_opcao"]
        }
        Insert: {
          created_at?: string
          id?: string
          opcao_id: string
          opcao_texto: string
          ordem?: number
          pergunta_id: string
          peso?: number
          tag?: Database["public"]["Enums"]["enum_tag_opcao"]
        }
        Update: {
          created_at?: string
          id?: string
          opcao_id?: string
          opcao_texto?: string
          ordem?: number
          pergunta_id?: string
          peso?: number
          tag?: Database["public"]["Enums"]["enum_tag_opcao"]
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_opcao_sjt_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas_redacao: {
        Row: {
          ativa: boolean
          codigo: string
          criada_em: string
          default_on: boolean
          id: string
          is_padrao: boolean
          template_cargo: string | null
          texto: string
          valor_primario: string | null
          valor_secundario: string | null
          versao: number
        }
        Insert: {
          ativa?: boolean
          codigo: string
          criada_em?: string
          default_on?: boolean
          id?: string
          is_padrao?: boolean
          template_cargo?: string | null
          texto: string
          valor_primario?: string | null
          valor_secundario?: string | null
          versao?: number
        }
        Update: {
          ativa?: boolean
          codigo?: string
          criada_em?: string
          default_on?: boolean
          id?: string
          is_padrao?: boolean
          template_cargo?: string | null
          texto?: string
          valor_primario?: string | null
          valor_secundario?: string | null
          versao?: number
        }
        Relationships: []
      }
      perguntas_vaga_origem: {
        Row: {
          biblioteca_pergunta_id: string
          created_at: string | null
          id: string
          pergunta_formulario_id: string
        }
        Insert: {
          biblioteca_pergunta_id: string
          created_at?: string | null
          id?: string
          pergunta_formulario_id: string
        }
        Update: {
          biblioteca_pergunta_id?: string
          created_at?: string | null
          id?: string
          pergunta_formulario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_vaga_origem_biblioteca_pergunta_id_fkey"
            columns: ["biblioteca_pergunta_id"]
            isOneToOne: false
            referencedRelation: "biblioteca_perguntas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perguntas_vaga_origem_biblioteca_pergunta_id_fkey"
            columns: ["biblioteca_pergunta_id"]
            isOneToOne: false
            referencedRelation: "v_biblioteca_mais_usadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perguntas_vaga_origem_pergunta_formulario_id_fkey"
            columns: ["pergunta_formulario_id"]
            isOneToOne: false
            referencedRelation: "perguntas_formulario"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias_notificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email_entrevistas_agendadas: boolean
          email_novos_candidatos: boolean
          email_resumo_diario: boolean
          email_resumo_semanal: boolean
          email_testes_completos: boolean
          id: string
          notificacoes_app: boolean
          updated_at: string
          updated_by: string | null
          usuario_rh_id: string
          whatsapp_enabled: boolean
          whatsapp_entrevistas: boolean
          whatsapp_numero: string | null
          whatsapp_urgentes: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_entrevistas_agendadas?: boolean
          email_novos_candidatos?: boolean
          email_resumo_diario?: boolean
          email_resumo_semanal?: boolean
          email_testes_completos?: boolean
          id?: string
          notificacoes_app?: boolean
          updated_at?: string
          updated_by?: string | null
          usuario_rh_id: string
          whatsapp_enabled?: boolean
          whatsapp_entrevistas?: boolean
          whatsapp_numero?: string | null
          whatsapp_urgentes?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email_entrevistas_agendadas?: boolean
          email_novos_candidatos?: boolean
          email_resumo_diario?: boolean
          email_resumo_semanal?: boolean
          email_testes_completos?: boolean
          id?: string
          notificacoes_app?: boolean
          updated_at?: string
          updated_by?: string | null
          usuario_rh_id?: string
          whatsapp_enabled?: boolean
          whatsapp_entrevistas?: boolean
          whatsapp_numero?: string | null
          whatsapp_urgentes?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_notificacoes_usuario_rh_id_fkey"
            columns: ["usuario_rh_id"]
            isOneToOne: true
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferencias_notificacoes_usuario_rh_id_fkey"
            columns: ["usuario_rh_id"]
            isOneToOne: true
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          approved_by: string | null
          avg_score_delta: number | null
          call_type: Database["public"]["Enums"]["llm_call_type"]
          canary_pct: number | null
          change_summary: string
          changed_by: string
          content_hash: string
          created_at: string
          deployed_at: string | null
          deprecated_at: string | null
          error_rate_pct: number | null
          id: string
          is_active: boolean
          is_canary: boolean
          max_tokens: number
          model_id: string
          p95_latency_ms: number | null
          previous_version_id: string | null
          schema_version_required: string
          semver: string
          system_template: string
          temperature: number
          user_template: string
        }
        Insert: {
          approved_by?: string | null
          avg_score_delta?: number | null
          call_type: Database["public"]["Enums"]["llm_call_type"]
          canary_pct?: number | null
          change_summary: string
          changed_by: string
          content_hash: string
          created_at?: string
          deployed_at?: string | null
          deprecated_at?: string | null
          error_rate_pct?: number | null
          id?: string
          is_active?: boolean
          is_canary?: boolean
          max_tokens: number
          model_id: string
          p95_latency_ms?: number | null
          previous_version_id?: string | null
          schema_version_required?: string
          semver: string
          system_template: string
          temperature?: number
          user_template: string
        }
        Update: {
          approved_by?: string | null
          avg_score_delta?: number | null
          call_type?: Database["public"]["Enums"]["llm_call_type"]
          canary_pct?: number | null
          change_summary?: string
          changed_by?: string
          content_hash?: string
          created_at?: string
          deployed_at?: string | null
          deprecated_at?: string | null
          error_rate_pct?: number | null
          id?: string
          is_active?: boolean
          is_canary?: boolean
          max_tokens?: number
          model_id?: string
          p95_latency_ms?: number | null
          previous_version_id?: string | null
          schema_version_required?: string
          semver?: string
          system_template?: string
          temperature?: number
          user_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      purga_execucao_itens: {
        Row: {
          ancora_em: string
          ancora_origem: string
          candidato_id: string
          concluido_em: string | null
          criado_em: string
          desfecho_auth: string
          desfecho_postgres: string
          desfecho_storage: string
          etapa: Database["public"]["Enums"]["etapa_processo"]
          execucao_id: string
          id: string
          janela_meses_aplicada: number
          relato_dry_run: string | null
        }
        Insert: {
          ancora_em: string
          ancora_origem: string
          candidato_id: string
          concluido_em?: string | null
          criado_em?: string
          desfecho_auth?: string
          desfecho_postgres?: string
          desfecho_storage?: string
          etapa: Database["public"]["Enums"]["etapa_processo"]
          execucao_id: string
          id?: string
          janela_meses_aplicada: number
          relato_dry_run?: string | null
        }
        Update: {
          ancora_em?: string
          ancora_origem?: string
          candidato_id?: string
          concluido_em?: string | null
          criado_em?: string
          desfecho_auth?: string
          desfecho_postgres?: string
          desfecho_storage?: string
          etapa?: Database["public"]["Enums"]["etapa_processo"]
          execucao_id?: string
          id?: string
          janela_meses_aplicada?: number
          relato_dry_run?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purga_execucao_itens_execucao_id_fkey"
            columns: ["execucao_id"]
            isOneToOne: false
            referencedRelation: "purga_execucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      purga_execucoes: {
        Row: {
          cap_vigente: number
          concluida_em: string | null
          elegiveis: number
          id: string
          iniciada_em: string
          modo_vigente: string
          notificacoes_expurgadas: number
          processados: number
          situacao: string
          veredito: string
        }
        Insert: {
          cap_vigente: number
          concluida_em?: string | null
          elegiveis: number
          id?: string
          iniciada_em?: string
          modo_vigente: string
          notificacoes_expurgadas?: number
          processados?: number
          situacao?: string
          veredito: string
        }
        Update: {
          cap_vigente?: number
          concluida_em?: string | null
          elegiveis?: number
          id?: string
          iniciada_em?: string
          modo_vigente?: string
          notificacoes_expurgadas?: number
          processados?: number
          situacao?: string
          veredito?: string
        }
        Relationships: []
      }
      questoes_bigfive: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dimensao: Database["public"]["Enums"]["dimensao_bigfive"]
          id: string
          is_invertida: boolean
          numero_questao: number
          texto_questao: string
          updated_at: string
          versao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dimensao: Database["public"]["Enums"]["dimensao_bigfive"]
          id?: string
          is_invertida?: boolean
          numero_questao: number
          texto_questao: string
          updated_at?: string
          versao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dimensao?: Database["public"]["Enums"]["dimensao_bigfive"]
          id?: string
          is_invertida?: boolean
          numero_questao?: number
          texto_questao?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "questoes_bigfive_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_bigfive_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      questoes_disc: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          numero_questao: number
          opcoes: Json
          updated_at: string
          versao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          numero_questao: number
          opcoes: Json
          updated_at?: string
          versao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          numero_questao?: number
          opcoes?: Json
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "questoes_disc_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_disc_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      questoes_raven: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          imagem_matriz_url: string
          numero_questao: number
          opcoes_imagens: Json
          resposta_correta: number
          serie: Database["public"]["Enums"]["serie_raven"]
          updated_at: string
          versao: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          imagem_matriz_url: string
          numero_questao: number
          opcoes_imagens: Json
          resposta_correta: number
          serie: Database["public"]["Enums"]["serie_raven"]
          updated_at?: string
          versao?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          imagem_matriz_url?: string
          numero_questao?: number
          opcoes_imagens?: Json
          resposta_correta?: number
          serie?: Database["public"]["Enums"]["serie_raven"]
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "questoes_raven_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_raven_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_check_duplicate: {
        Row: {
          called_at: string
          hash_cpf_email: string
          id: number
          x_forwarded_for: string | null
        }
        Insert: {
          called_at?: string
          hash_cpf_email: string
          id?: number
          x_forwarded_for?: string | null
        }
        Update: {
          called_at?: string
          hash_cpf_email?: string
          id?: number
          x_forwarded_for?: string | null
        }
        Relationships: []
      }
      recruiter_alerts: {
        Row: {
          call_type: Database["public"]["Enums"]["llm_call_type"] | null
          candidato_id: string | null
          channel: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          resolved_at: string | null
          threshold: number | null
          threshold_violated: string
          vaga_id: string | null
          value: number | null
        }
        Insert: {
          call_type?: Database["public"]["Enums"]["llm_call_type"] | null
          candidato_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          resolved_at?: string | null
          threshold?: number | null
          threshold_violated: string
          vaga_id?: string | null
          value?: number | null
        }
        Update: {
          call_type?: Database["public"]["Enums"]["llm_call_type"] | null
          candidato_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          resolved_at?: string | null
          threshold?: number | null
          threshold_violated?: string
          vaga_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_alerts_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_alerts_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_alerts_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
          {
            foreignKeyName: "recruiter_alerts_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes_candidato: {
        Row: {
          analise_ia: Json | null
          bloqueio_avanco: boolean
          candidatura_id: string
          classificacao_cor: string | null
          cost_tokens_input: number | null
          cost_tokens_output: number | null
          decisao_revisor: string | null
          eh_pergunta_padrao: boolean
          flags: string[]
          ia_processada_em: string | null
          id: string
          input_hash: string | null
          model_version: string | null
          notas_revisor: string | null
          ordem: number
          pergunta_id: string
          prompt_version: string | null
          red_flag_etico: boolean
          referencia_match: string[]
          revisada_em: string | null
          revisada_por: string | null
          score_ponderado_0_100: number | null
          scores_dimensao: Json | null
          scores_humanos: Json | null
          status_analise: string
          submetida_em: string
          tempo_gasto_segundos: number
          texto: string
          texto_hash: string
          word_count: number
        }
        Insert: {
          analise_ia?: Json | null
          bloqueio_avanco?: boolean
          candidatura_id: string
          classificacao_cor?: string | null
          cost_tokens_input?: number | null
          cost_tokens_output?: number | null
          decisao_revisor?: string | null
          eh_pergunta_padrao: boolean
          flags?: string[]
          ia_processada_em?: string | null
          id?: string
          input_hash?: string | null
          model_version?: string | null
          notas_revisor?: string | null
          ordem: number
          pergunta_id: string
          prompt_version?: string | null
          red_flag_etico?: boolean
          referencia_match?: string[]
          revisada_em?: string | null
          revisada_por?: string | null
          score_ponderado_0_100?: number | null
          scores_dimensao?: Json | null
          scores_humanos?: Json | null
          status_analise?: string
          submetida_em?: string
          tempo_gasto_segundos: number
          texto: string
          texto_hash: string
          word_count: number
        }
        Update: {
          analise_ia?: Json | null
          bloqueio_avanco?: boolean
          candidatura_id?: string
          classificacao_cor?: string | null
          cost_tokens_input?: number | null
          cost_tokens_output?: number | null
          decisao_revisor?: string | null
          eh_pergunta_padrao?: boolean
          flags?: string[]
          ia_processada_em?: string | null
          id?: string
          input_hash?: string | null
          model_version?: string | null
          notas_revisor?: string | null
          ordem?: number
          pergunta_id?: string
          prompt_version?: string | null
          red_flag_etico?: boolean
          referencia_match?: string[]
          revisada_em?: string | null
          revisada_por?: string | null
          score_ponderado_0_100?: number | null
          scores_dimensao?: Json | null
          scores_humanos?: Json | null
          status_analise?: string
          submetida_em?: string
          tempo_gasto_segundos?: number
          texto?: string
          texto_hash?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "redacoes_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_candidato_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas_redacao"
            referencedColumns: ["id"]
          },
        ]
      }
      redacoes_candidato_em_progresso: {
        Row: {
          candidatura_id: string
          completou_em: string | null
          id: string
          iniciado_em: string
          pergunta_id: string
          texto_em_progresso: string | null
          ultima_atividade_em: string
          user_agent: string | null
          word_count: number | null
        }
        Insert: {
          candidatura_id: string
          completou_em?: string | null
          id?: string
          iniciado_em?: string
          pergunta_id: string
          texto_em_progresso?: string | null
          ultima_atividade_em?: string
          user_agent?: string | null
          word_count?: number | null
        }
        Update: {
          candidatura_id?: string
          completou_em?: string | null
          id?: string
          iniciado_em?: string
          pergunta_id?: string
          texto_em_progresso?: string | null
          ultima_atividade_em?: string
          user_agent?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "redacoes_candidato_em_progresso_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_candidato_em_progresso_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "redacoes_candidato_em_progresso_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redacoes_candidato_em_progresso_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas_redacao"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_avaliacao: {
        Row: {
          candidatura_id: string
          id: string
          respostas: Json
          teste: string
          updated_at: string
        }
        Insert: {
          candidatura_id: string
          id?: string
          respostas?: Json
          teste: string
          updated_at?: string
        }
        Update: {
          candidatura_id?: string
          id?: string
          respostas?: Json
          teste?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_avaliacao_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_avaliacao_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "respostas_avaliacao_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_bigfive: {
        Row: {
          candidatura_id: string
          created_at: string
          questao_id: string
          resposta: number
          tempo_resposta_segundos: number | null
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          questao_id: string
          resposta: number
          tempo_resposta_segundos?: number | null
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          questao_id?: string
          resposta?: number
          tempo_resposta_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_bigfive_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_bigfive_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "respostas_bigfive_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_bigfive_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes_bigfive"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_cultura: {
        Row: {
          candidatura_id: string
          created_at: string
          id: string
          pergunta_id: string
          resposta_texto: string
          tempo_resposta_segundos: number | null
          updated_at: string
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          id?: string
          pergunta_id: string
          resposta_texto: string
          tempo_resposta_segundos?: number | null
          updated_at?: string
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          id?: string
          pergunta_id?: string
          resposta_texto?: string
          tempo_resposta_segundos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_cultura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_cultura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "respostas_cultura_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_cultura_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas_cultura"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_disc: {
        Row: {
          candidatura_id: string
          created_at: string
          mais_caracteristico: string
          menos_caracteristico: string
          questao_id: string
          tempo_resposta_segundos: number | null
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          mais_caracteristico: string
          menos_caracteristico: string
          questao_id: string
          tempo_resposta_segundos?: number | null
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          mais_caracteristico?: string
          menos_caracteristico?: string
          questao_id?: string
          tempo_resposta_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_disc_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_disc_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "respostas_disc_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_disc_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes_disc"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_formulario: {
        Row: {
          candidatura_id: string
          created_at: string
          id: string
          pergunta_id: string
          resposta_numerica: number | null
          resposta_opcoes: Json | null
          resposta_texto: string | null
          updated_at: string
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          id?: string
          pergunta_id: string
          resposta_numerica?: number | null
          resposta_opcoes?: Json | null
          resposta_texto?: string | null
          updated_at?: string
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          id?: string
          pergunta_id?: string
          resposta_numerica?: number | null
          resposta_opcoes?: Json | null
          resposta_texto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "respostas_formulario_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_formulario_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "respostas_formulario_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_formulario_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "perguntas_formulario"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_raven: {
        Row: {
          candidatura_id: string
          created_at: string
          questao_id: string
          resposta: number
          tempo_resposta_segundos: number | null
        }
        Insert: {
          candidatura_id: string
          created_at?: string
          questao_id: string
          resposta: number
          tempo_resposta_segundos?: number | null
        }
        Update: {
          candidatura_id?: string
          created_at?: string
          questao_id?: string
          resposta?: number
          tempo_resposta_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_raven_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_raven_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "respostas_raven_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respostas_raven_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes_raven"
            referencedColumns: ["id"]
          },
        ]
      }
      retencao_hold: {
        Row: {
          candidatura_id: string
          criado_em: string
          criado_por: string | null
          detalhe: string | null
          id: string
          liberado_em: string | null
          liberado_por: string | null
          motivo: string
        }
        Insert: {
          candidatura_id: string
          criado_em?: string
          criado_por?: string | null
          detalhe?: string | null
          id?: string
          liberado_em?: string | null
          liberado_por?: string | null
          motivo: string
        }
        Update: {
          candidatura_id?: string
          criado_em?: string
          criado_por?: string | null
          detalhe?: string | null
          id?: string
          liberado_em?: string | null
          liberado_por?: string | null
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_retencao_hold_candidatura"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retencao_hold_candidatura"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "fk_retencao_hold_candidatura"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_hold_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_hold_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_hold_liberado_por_fkey"
            columns: ["liberado_por"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retencao_hold_liberado_por_fkey"
            columns: ["liberado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_bigfive: {
        Row: {
          analise_ia: Json | null
          candidatura_id: string
          created_at: string
          score_agreeableness: number
          score_conscientiousness: number
          score_extraversion: number
          score_neuroticism: number
          score_openness: number
          tempo_total_segundos: number
          updated_at: string
        }
        Insert: {
          analise_ia?: Json | null
          candidatura_id: string
          created_at?: string
          score_agreeableness: number
          score_conscientiousness: number
          score_extraversion: number
          score_neuroticism: number
          score_openness: number
          tempo_total_segundos: number
          updated_at?: string
        }
        Update: {
          analise_ia?: Json | null
          candidatura_id?: string
          created_at?: string
          score_agreeableness?: number
          score_conscientiousness?: number
          score_extraversion?: number
          score_neuroticism?: number
          score_openness?: number
          tempo_total_segundos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_bigfive_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_bigfive_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "scores_bigfive_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_candidato: {
        Row: {
          candidatura_id: string
          citacoes: Json | null
          created_at: string
          id: string
          metadata: Json
          pergunta_id: string | null
          red_flags: Json | null
          score: number | null
          score_max: number | null
          status: Database["public"]["Enums"]["status_score"]
          subtipo: string | null
          tipo: Database["public"]["Enums"]["tipo_score"]
          updated_at: string
        }
        Insert: {
          candidatura_id: string
          citacoes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json
          pergunta_id?: string | null
          red_flags?: Json | null
          score?: number | null
          score_max?: number | null
          status?: Database["public"]["Enums"]["status_score"]
          subtipo?: string | null
          tipo: Database["public"]["Enums"]["tipo_score"]
          updated_at?: string
        }
        Update: {
          candidatura_id?: string
          citacoes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json
          pergunta_id?: string | null
          red_flags?: Json | null
          score?: number | null
          score_max?: number | null
          status?: Database["public"]["Enums"]["status_score"]
          subtipo?: string | null
          tipo?: Database["public"]["Enums"]["tipo_score"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "scores_candidato_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_disc: {
        Row: {
          analise_ia: Json | null
          candidatura_id: string
          created_at: string
          perfil_primario: string
          perfil_secundario: string
          score_c: number
          score_d: number
          score_i: number
          score_s: number
          tempo_total_segundos: number
          updated_at: string
        }
        Insert: {
          analise_ia?: Json | null
          candidatura_id: string
          created_at?: string
          perfil_primario: string
          perfil_secundario: string
          score_c: number
          score_d: number
          score_i: number
          score_s: number
          tempo_total_segundos: number
          updated_at?: string
        }
        Update: {
          analise_ia?: Json | null
          candidatura_id?: string
          created_at?: string
          perfil_primario?: string
          perfil_secundario?: string
          score_c?: number
          score_d?: number
          score_i?: number
          score_s?: number
          tempo_total_segundos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_disc_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_disc_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "scores_disc_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      scores_raven: {
        Row: {
          acertos_por_serie: Json
          analise_ia: Json | null
          candidatura_id: string
          classificacao: string
          created_at: string
          percentil: number
          percentual_acerto: number
          tempo_total_segundos: number
          total_acertos: number
          updated_at: string
        }
        Insert: {
          acertos_por_serie: Json
          analise_ia?: Json | null
          candidatura_id: string
          classificacao: string
          created_at?: string
          percentil: number
          percentual_acerto: number
          tempo_total_segundos: number
          total_acertos: number
          updated_at?: string
        }
        Update: {
          acertos_por_serie?: Json
          analise_ia?: Json | null
          candidatura_id?: string
          classificacao?: string
          created_at?: string
          percentil?: number
          percentual_acerto?: number
          tempo_total_segundos?: number
          total_acertos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_raven_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_raven_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_fila_trabalho"
            referencedColumns: ["candidatura_id"]
          },
          {
            foreignKeyName: "scores_raven_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_ativas: {
        Row: {
          ativo: boolean
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_info: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity: string
          operating_system: string | null
          revogado: boolean
          revogado_em: string | null
          revogado_por: string | null
          session_token: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address: unknown
          last_activity?: string
          operating_system?: string | null
          revogado?: boolean
          revogado_em?: string | null
          revogado_por?: string | null
          session_token?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_info?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          operating_system?: string | null
          revogado?: boolean
          revogado_em?: string | null
          revogado_por?: string | null
          session_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      solicitacoes_dados: {
        Row: {
          atendido_em: string | null
          auth_concluido_em: string | null
          cancelado_em: string | null
          candidato_id: string
          causa: string | null
          executar_em: string | null
          id: string
          plano: Json | null
          postgres_concluido_em: string | null
          recibo_enviado_em: string | null
          situacao: string
          solicitado_em: string
          storage_concluido_em: string | null
          tipo: string
        }
        Insert: {
          atendido_em?: string | null
          auth_concluido_em?: string | null
          cancelado_em?: string | null
          candidato_id: string
          causa?: string | null
          executar_em?: string | null
          id?: string
          plano?: Json | null
          postgres_concluido_em?: string | null
          recibo_enviado_em?: string | null
          situacao?: string
          solicitado_em?: string
          storage_concluido_em?: string | null
          tipo?: string
        }
        Update: {
          atendido_em?: string | null
          auth_concluido_em?: string | null
          cancelado_em?: string | null
          candidato_id?: string
          causa?: string | null
          executar_em?: string | null
          id?: string
          plano?: Json | null
          postgres_concluido_em?: string | null
          recibo_enviado_em?: string | null
          situacao?: string
          solicitado_em?: string
          storage_concluido_em?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_solicitacoes_dados_candidato"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_solicitacoes_dados_candidato"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_solicitacoes_dados_candidato"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
        ]
      }
      templates_email: {
        Row: {
          assunto: string
          ativo: boolean | null
          corpo_html: string
          corpo_texto: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          descricao: string | null
          id: string
          is_padrao: boolean | null
          tipo: Database["public"]["Enums"]["tipo_template_email"]
          updated_at: string | null
          updated_by: string | null
          variaveis_disponiveis: string[]
          versao: number
        }
        Insert: {
          assunto: string
          ativo?: boolean | null
          corpo_html: string
          corpo_texto?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          is_padrao?: boolean | null
          tipo: Database["public"]["Enums"]["tipo_template_email"]
          updated_at?: string | null
          updated_by?: string | null
          variaveis_disponiveis: string[]
          versao?: number
        }
        Update: {
          assunto?: string
          ativo?: boolean | null
          corpo_html?: string
          corpo_texto?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          is_padrao?: boolean | null
          tipo?: Database["public"]["Enums"]["tipo_template_email"]
          updated_at?: string | null
          updated_by?: string | null
          variaveis_disponiveis?: string[]
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_email_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_email_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_email_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_email_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_rh: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string
          created_at: string
          created_by: string | null
          data_ultimo_login: string | null
          deleted_at: string | null
          email: string
          id: string
          nome_completo: string
          primeiro_acesso: boolean
          role: string
          telefone: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo: string
          created_at?: string
          created_by?: string | null
          data_ultimo_login?: string | null
          deleted_at?: string | null
          email: string
          id?: string
          nome_completo: string
          primeiro_acesso?: boolean
          role: string
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string
          created_at?: string
          created_by?: string | null
          data_ultimo_login?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          nome_completo?: string
          primeiro_acesso?: boolean
          role?: string
          telefone?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vagas: {
        Row: {
          aplica_cognitivo: boolean
          beneficios: string | null
          cidade: string | null
          created_at: string
          created_by: string | null
          data_abertura: string | null
          data_fechamento: string | null
          deleted_at: string | null
          departamento: string | null
          descricao_curta: string | null
          diferenciais: string | null
          endereco_completo: string | null
          entrevista_agendada_em: string | null
          estado: string | null
          exibir_salario: boolean | null
          faixa_salarial_max: number | null
          faixa_salarial_min: number | null
          id: string
          jornada_trabalho: string | null
          modelo_trabalho: string | null
          nivel_senioridade: string | null
          perfil_ideal: string | null
          pesos_avaliacao: Json
          prompt_ia_descricao: string | null
          qualificacao_etapa1: Json
          requisitos_experiencia: string | null
          requisitos_formacao: string | null
          requisitos_habilidades: string | null
          requisitos_tecnicos: string | null
          responsabilidades: string | null
          slug: string
          sobre_cargo: string | null
          sobre_empresa: string | null
          status: Database["public"]["Enums"]["status_vaga"]
          subtitulo: string | null
          testes_aplicaveis: Json
          tipo_contrato: string | null
          titulo: string
          total_vagas: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aplica_cognitivo?: boolean
          beneficios?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          descricao_curta?: string | null
          diferenciais?: string | null
          endereco_completo?: string | null
          entrevista_agendada_em?: string | null
          estado?: string | null
          exibir_salario?: boolean | null
          faixa_salarial_max?: number | null
          faixa_salarial_min?: number | null
          id?: string
          jornada_trabalho?: string | null
          modelo_trabalho?: string | null
          nivel_senioridade?: string | null
          perfil_ideal?: string | null
          pesos_avaliacao?: Json
          prompt_ia_descricao?: string | null
          qualificacao_etapa1?: Json
          requisitos_experiencia?: string | null
          requisitos_formacao?: string | null
          requisitos_habilidades?: string | null
          requisitos_tecnicos?: string | null
          responsabilidades?: string | null
          slug: string
          sobre_cargo?: string | null
          sobre_empresa?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          subtitulo?: string | null
          testes_aplicaveis?: Json
          tipo_contrato?: string | null
          titulo: string
          total_vagas?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aplica_cognitivo?: boolean
          beneficios?: string | null
          cidade?: string | null
          created_at?: string
          created_by?: string | null
          data_abertura?: string | null
          data_fechamento?: string | null
          deleted_at?: string | null
          departamento?: string | null
          descricao_curta?: string | null
          diferenciais?: string | null
          endereco_completo?: string | null
          entrevista_agendada_em?: string | null
          estado?: string | null
          exibir_salario?: boolean | null
          faixa_salarial_max?: number | null
          faixa_salarial_min?: number | null
          id?: string
          jornada_trabalho?: string | null
          modelo_trabalho?: string | null
          nivel_senioridade?: string | null
          perfil_ideal?: string | null
          pesos_avaliacao?: Json
          prompt_ia_descricao?: string | null
          qualificacao_etapa1?: Json
          requisitos_experiencia?: string | null
          requisitos_formacao?: string | null
          requisitos_habilidades?: string | null
          requisitos_tecnicos?: string | null
          responsabilidades?: string | null
          slug?: string
          sobre_cargo?: string | null
          sobre_empresa?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          subtitulo?: string | null
          testes_aplicaveis?: Json
          tipo_contrato?: string | null
          titulo?: string
          total_vagas?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      vagas_associadas_recrutadores: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          updated_at: string
          updated_by: string | null
          usuario_rh_id: string
          vaga_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          usuario_rh_id: string
          vaga_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          usuario_rh_id?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vagas_associadas_recrutadores_usuario_rh_id_fkey"
            columns: ["usuario_rh_id"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_associadas_recrutadores_usuario_rh_id_fkey"
            columns: ["usuario_rh_id"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vagas_associadas_recrutadores_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_config: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          headers: Json | null
          id: string
          metodo: string | null
          nome: string
          retry_delay_segundos: number | null
          retry_tentativas: number | null
          secret: string | null
          timeout_segundos: number | null
          tipo: Database["public"]["Enums"]["tipo_webhook"]
          total_chamadas: number | null
          total_erros: number | null
          total_sucessos: number | null
          ultima_chamada_erro: string | null
          ultima_chamada_sucesso: string | null
          updated_at: string | null
          updated_by: string | null
          url: string
          usar_auth: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          headers?: Json | null
          id?: string
          metodo?: string | null
          nome: string
          retry_delay_segundos?: number | null
          retry_tentativas?: number | null
          secret?: string | null
          timeout_segundos?: number | null
          tipo: Database["public"]["Enums"]["tipo_webhook"]
          total_chamadas?: number | null
          total_erros?: number | null
          total_sucessos?: number | null
          ultima_chamada_erro?: string | null
          ultima_chamada_sucesso?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url: string
          usar_auth?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          headers?: Json | null
          id?: string
          metodo?: string | null
          nome?: string
          retry_delay_segundos?: number | null
          retry_tentativas?: number | null
          secret?: string | null
          timeout_segundos?: number | null
          tipo?: Database["public"]["Enums"]["tipo_webhook"]
          total_chamadas?: number | null
          total_erros?: number | null
          total_sucessos?: number | null
          ultima_chamada_erro?: string | null
          ultima_chamada_sucesso?: string | null
          updated_at?: string | null
          updated_by?: string | null
          url?: string
          usar_auth?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios_rh"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhooks_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_rh_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_logs: {
        Row: {
          created_at: string | null
          erro_mensagem: string | null
          id: string
          payload_enviado: Json
          resposta_recebida: Json | null
          status_code: number | null
          sucesso: boolean
          tempo_resposta_ms: number | null
          tentativa_numero: number | null
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          erro_mensagem?: string | null
          id?: string
          payload_enviado: Json
          resposta_recebida?: Json | null
          status_code?: number | null
          sucesso: boolean
          tempo_resposta_ms?: number | null
          tentativa_numero?: number | null
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          erro_mensagem?: string | null
          id?: string
          payload_enviado?: Json
          resposta_recebida?: Json | null
          status_code?: number | null
          sucesso?: boolean
          tempo_resposta_ms?: number | null
          tentativa_numero?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "v_estatisticas_webhooks"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhooks_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks_config"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      security_analysis_view: {
        Row: {
          emails_unicos: number | null
          evento: string | null
          hora: string | null
          ips_unicos: number | null
          total_eventos: number | null
          usuarios_unicos: number | null
        }
        Relationships: []
      }
      v_biblioteca_mais_usadas: {
        Row: {
          categoria: string | null
          criada_em: string | null
          criado_por_cargo: string | null
          criado_por_nome: string | null
          id: string | null
          is_publica: boolean | null
          tags: string[] | null
          texto_pergunta: string | null
          tipo_resposta:
            | Database["public"]["Enums"]["tipo_resposta_pergunta"]
            | null
          titulo: string | null
          total_usos: number | null
          ultima_utilizacao: string | null
        }
        Relationships: []
      }
      v_candidatos_ativos: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          bairro: string | null
          bloqueado: boolean | null
          bloqueado_motivo: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          como_conheceu: string | null
          como_conheceu_detalhes: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          data_nascimento: string | null
          data_ultimo_acesso: string | null
          deleted_at: string | null
          email: string | null
          email_verificado: boolean | null
          estado: string | null
          genero: string | null
          id: string | null
          instagram_url: string | null
          linkedin_url: string | null
          logradouro: string | null
          nome_completo: string | null
          numero: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          bairro?: string | null
          bloqueado?: boolean | null
          bloqueado_motivo?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          como_conheceu?: string | null
          como_conheceu_detalhes?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          data_ultimo_acesso?: string | null
          deleted_at?: string | null
          email?: string | null
          email_verificado?: boolean | null
          estado?: string | null
          genero?: string | null
          id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          logradouro?: string | null
          nome_completo?: string | null
          numero?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          bairro?: string | null
          bloqueado?: boolean | null
          bloqueado_motivo?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          como_conheceu?: string | null
          como_conheceu_detalhes?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          data_nascimento?: string | null
          data_ultimo_acesso?: string | null
          deleted_at?: string | null
          email?: string | null
          email_verificado?: boolean | null
          estado?: string | null
          genero?: string | null
          id?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          logradouro?: string | null
          nome_completo?: string | null
          numero?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_estatisticas_webhooks: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          chamadas_ultimas_24h: number | null
          criado_em: string | null
          erros_ultimas_24h: number | null
          nome: string | null
          sucessos_ultimas_24h: number | null
          taxa_sucesso_percentual: number | null
          tempo_medio_resposta_ms_24h: number | null
          tipo: Database["public"]["Enums"]["tipo_webhook"] | null
          total_chamadas: number | null
          total_erros: number | null
          total_sucessos: number | null
          ultima_chamada_erro: string | null
          ultima_chamada_sucesso: string | null
          url: string | null
          webhook_id: string | null
        }
        Relationships: []
      }
      v_fila_trabalho: {
        Row: {
          candidato_id: string | null
          candidato_nome: string | null
          candidatura_id: string | null
          entrou_etapa_em: string | null
          etapa_atual: Database["public"]["Enums"]["etapa_processo"] | null
          status: Database["public"]["Enums"]["status_candidatura"] | null
          vaga_id: string | null
          vaga_titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_candidatos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidaturas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_triagem_panel"
            referencedColumns: ["candidato_id"]
          },
          {
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sessoes_ativas_validas: {
        Row: {
          ativo: boolean | null
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_info: string | null
          device_type: string | null
          expires_at: string | null
          id: string | null
          ip_address: unknown
          last_activity: string | null
          operating_system: string | null
          revogado: boolean | null
          revogado_em: string | null
          revogado_por: string | null
          session_token: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_info?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string | null
          ip_address?: unknown
          last_activity?: string | null
          operating_system?: string | null
          revogado?: boolean | null
          revogado_em?: string | null
          revogado_por?: string | null
          session_token?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_info?: string | null
          device_type?: string | null
          expires_at?: string | null
          id?: string | null
          ip_address?: unknown
          last_activity?: string | null
          operating_system?: string | null
          revogado?: boolean | null
          revogado_em?: string | null
          revogado_por?: string | null
          session_token?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_triagem_panel: {
        Row: {
          analise_status: string | null
          candidato_id: string | null
          candidato_nome: string | null
          created_at: string | null
          curriculo_nome_original: string | null
          deleted_at: string | null
          encerrada_a_pedido_em: string | null
          etapa_atual: Database["public"]["Enums"]["etapa_processo"] | null
          flags: string[] | null
          gaps: string[] | null
          id: string | null
          pontos_fortes: string[] | null
          score_match: number | null
          status: Database["public"]["Enums"]["status_candidatura"] | null
          vaga_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ultimos_acessos: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_info: string | null
          device_type: string | null
          email_tentativa: string | null
          erro_mensagem: string | null
          evento: string | null
          id: string | null
          ip_address: unknown
          operating_system: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_info?: string | null
          device_type?: string | null
          email_tentativa?: string | null
          erro_mensagem?: string | null
          evento?: string | null
          id?: string | null
          ip_address?: unknown
          operating_system?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_info?: string | null
          device_type?: string | null
          email_tentativa?: string | null
          erro_mensagem?: string | null
          evento?: string | null
          id?: string | null
          ip_address?: unknown
          operating_system?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_usuarios_rh_ativos: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo: string | null
          created_at: string | null
          created_by: string | null
          data_ultimo_login: string | null
          deleted_at: string | null
          email: string | null
          id: string | null
          nome_completo: string | null
          primeiro_acesso: boolean | null
          role: string | null
          telefone: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          created_by?: string | null
          data_ultimo_login?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string | null
          nome_completo?: string | null
          primeiro_acesso?: boolean | null
          role?: string | null
          telefone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          created_by?: string | null
          data_ultimo_login?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string | null
          nome_completo?: string | null
          primeiro_acesso?: boolean | null
          role?: string | null
          telefone?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      anonimizar_candidato: {
        Args: { p_candidato_id: string; p_dry_run?: boolean }
        Returns: Json
      }
      atualizar_meu_perfil_rh: {
        Args: { p_avatar_url?: string; p_nome: string }
        Returns: undefined
      }
      calcular_score_geral: {
        Args: { candidatura_uuid: string }
        Returns: number
      }
      calcular_scores_bigfive: {
        Args: { candidatura_uuid: string }
        Returns: undefined
      }
      calcular_scores_disc: {
        Args: { candidatura_uuid: string }
        Returns: undefined
      }
      calcular_scores_raven: {
        Args: { candidatura_uuid: string }
        Returns: undefined
      }
      cancelar_pedido_exclusao: {
        Args: { p_solicitacao_id: string }
        Returns: {
          cancelado_em: string
          solicitacao_id: string
        }[]
      }
      candidaturas_alem_da_janela: {
        Args: never
        Returns: {
          ancora_em: string
          ancora_origem: string
          candidato_id: string
          candidatura_id: string
          etapa: Database["public"]["Enums"]["etapa_processo"]
          janela_meses_aplicada: number
        }[]
      }
      check_candidato_duplicate: {
        Args: { p_cpf: string; p_email: string }
        Returns: Json
      }
      concluir_item_purga: {
        Args: { p_desfechos: Json; p_item_id: string }
        Returns: undefined
      }
      confirmar_revisao_entrevista: {
        Args: { p_analise_id: string }
        Returns: Json
      }
      contar_pedidos_dados_pendentes: { Args: never; Returns: number }
      contar_revisoes_pendentes: { Args: never; Returns: number }
      criar_usuario_rh_com_audit: {
        Args: {
          p_actor: string
          p_cargo: string
          p_email: string
          p_nome: string
          p_papel: string
          p_user_id: string
        }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      funil_kpis: { Args: { p_vaga_id?: string }; Returns: Json }
      generate_unique_vaga_slug: {
        Args: { p_exclude_id?: string; p_titulo: string }
        Returns: string
      }
      gerar_bias_snapshot: {
        Args: { p_periodo: string }
        Returns: {
          criado_em: string
          dados: Json
          id: string
          periodo: string | null
          snapshot_em: string
        }
        SetofOptions: {
          from: "*"
          to: "bias_audit_log"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gerir_usuario_rh_mutacao: {
        Args: {
          p_action: string
          p_actor: string
          p_novo_papel?: string
          p_target: string
        }
        Returns: undefined
      }
      get_avaliacao_status: {
        Args: { p_candidatura_id: string }
        Returns: Json
      }
      get_bigfive_itens: {
        Args: never
        Returns: {
          item_id: number
          ordem: number
          texto: string
        }[]
      }
      get_cognitivo_itens: {
        Args: never
        Returns: {
          alternativas: Json
          enunciado: string
          id: string
          ordem: number
          secao: string
        }[]
      }
      get_configuracoes: {
        Args: never
        Returns: {
          cor_accent: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          dias_retencao_logs: number | null
          email_contato: string | null
          email_notificacoes: string[] | null
          empresa_id: string
          endereco_completo: string | null
          favicon_url: string | null
          id: string
          idioma: string | null
          logo_url: string | null
          max_tamanho_curriculo_mb: number | null
          max_tamanho_gravacao_mb: number | null
          nome_empresa: string
          notificar_nova_candidatura: boolean | null
          notificar_teste_concluido: boolean | null
          site_url: string | null
          smtp_from_email: string | null
          smtp_from_nome: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_senha_encrypted: string | null
          smtp_usar_tls: boolean | null
          smtp_usuario: string | null
          telefone_contato: string | null
          timezone: string | null
          updated_at: string | null
          updated_by: string | null
          webhook_analise_bigfive_url: string | null
          webhook_analise_cultura_url: string | null
          webhook_analise_disc_url: string | null
          webhook_analise_entrevista_url: string | null
          webhook_analise_formulario_url: string | null
          webhook_analise_raven_url: string | null
          webhook_envio_emails_url: string | null
          webhook_lembretes_url: string | null
          webhook_retry_tentativas: number | null
          webhook_secret: string | null
          webhook_timeout_segundos: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "configuracoes_empresa"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_meu_agendamento: {
        Args: { p_candidatura_id: string }
        Returns: {
          candidatura_id: string
          compareceu: boolean
          data_hora: string
          id: string
          local_ou_link: string
          status: Database["public"]["Enums"]["status_entrevista"]
          tipo: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
        }[]
      }
      get_minha_redacao: {
        Args: { p_candidatura_id: string }
        Returns: {
          id: string
          ordem: number
          pergunta_id: string
          status_analise: string
          submetida_em: string
          texto: string
          word_count: number
        }[]
      }
      get_opcoes_sjt: {
        Args: { p_pergunta_id: string }
        Returns: {
          opcao_id: string
          opcao_texto: string
        }[]
      }
      is_active_rh_admin: { Args: never; Returns: boolean }
      ler_resend_api_key: { Args: never; Returns: string }
      ler_resend_webhook_secret: { Args: never; Returns: string }
      limpar_logs_antigos: { Args: never; Returns: number }
      limpar_sessoes_expiradas: { Args: never; Returns: undefined }
      listar_historico_candidatura: {
        Args: { p_candidatura_id: string }
        Returns: {
          ator_rotulo: string
          criado_em: string
          criterio_texto: string
          etapa_de: Database["public"]["Enums"]["etapa_processo"]
          etapa_para: Database["public"]["Enums"]["etapa_processo"]
        }[]
      }
      listar_matriz_retencao: {
        Args: never
        Returns: {
          alterado_por_nome: string
          atualizado_em: string
          etapa: Database["public"]["Enums"]["etapa_processo"]
          janela_meses: number
          origem: string
        }[]
      }
      listar_pedidos_dados: {
        Args: { p_incluir_atendidos?: boolean }
        Returns: {
          atendido_em: string
          candidato_id: string
          candidato_nome: string
          causa: string
          id: string
          situacao: string
          solicitado_em: string
        }[]
      }
      listar_revisoes_decisao: {
        Args: { p_incluir_respondidos?: boolean }
        Returns: {
          candidato_nome: string
          candidatura_id: string
          decidido_por_nome: string
          decisao: string
          pode_responder: boolean
          respondida_por_nome: string
          revisao_respondida_em: string
          revisao_resultado: string
          revisao_solicitada_em: string
          revisao_veredito: string
          vaga_titulo: string
        }[]
      }
      log_auditoria: {
        Args: {
          p_acao?: string
          p_categoria?: Database["public"]["Enums"]["categoria_log_auditoria"]
          p_dados_antes?: Json
          p_dados_depois?: Json
          p_descricao?: string
          p_erro_mensagem?: string
          p_ip_address?: unknown
          p_recurso_id?: string
          p_recurso_tipo?: string
          p_severidade?: Database["public"]["Enums"]["severidade_log"]
          p_sucesso?: boolean
          p_usuario_id?: string
          p_usuario_tipo?: string
        }
        Returns: string
      }
      obter_detalhes_entrevista: {
        Args: {
          p_entrevista_id: string
          p_tipo_entrevista: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
        }
        Returns: {
          agendado_por: string
          candidatura_id: string
          data_agendada: string
          entrevista_id: string
          realizado_por: string
          status: Database["public"]["Enums"]["status_entrevista"]
        }[]
      }
      plano_exclusao_titular: {
        Args: { p_candidato_id: string }
        Returns: Json
      }
      pode_receber_marketing: {
        Args: { p_candidato_id: string }
        Returns: boolean
      }
      pontuar_cognitivo: {
        Args: {
          p_candidatura_id: string
          p_completion_time_seconds?: number
          p_proctoring?: Json
          p_respostas: Json
          p_shuffle_seed?: string
        }
        Returns: Json
      }
      pontuar_sjt: {
        Args: { p_candidatura_id: string; p_respostas: Json }
        Returns: Json
      }
      previa_retencao: {
        Args: never
        Returns: {
          candidatos_afetados: number
          candidaturas_afetadas: number
          etapa: Database["public"]["Enums"]["etapa_processo"]
        }[]
      }
      previa_retencao_total: {
        Args: never
        Returns: {
          calculada_em: string
          candidatos_afetados: number
        }[]
      }
      promote_canary_to_active: {
        Args: {
          p_call_type: Database["public"]["Enums"]["llm_call_type"]
          p_semver: string
        }
        Returns: string
      }
      promote_to_canary: {
        Args: {
          p_call_type: Database["public"]["Enums"]["llm_call_type"]
          p_canary_pct?: number
          p_semver: string
        }
        Returns: string
      }
      publish_vaga: { Args: { p_vaga_id: string }; Returns: Json }
      registrar_acao_historico: {
        Args: {
          p_candidatura_id: string
          p_descricao: string
          p_metadata?: Json
          p_tipo_acao: Database["public"]["Enums"]["tipo_acao_historico"]
          p_usuario_id?: string
        }
        Returns: string
      }
      registrar_decisao: {
        Args: {
          p_candidatura_id: string
          p_decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          p_justificativa: string
        }
        Returns: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em: string
          explicacao_solicitada_em: string | null
          id: string
          justificativa: string
          por_usuario: string
          revisao_por_usuario: string | null
          revisao_respondida_em: string | null
          revisao_resultado: string | null
          revisao_solicitada_em: string | null
          revisao_veredito: string | null
        }
        SetofOptions: {
          from: "*"
          to: "decisao_final"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_pedido_exclusao: {
        Args: { p_candidato_id: string }
        Returns: {
          candidaturas_encerradas: number
          executar_em: string
          solicitacao_id: string
        }[]
      }
      reivindicar_item_purga: {
        Args: { p_candidato_id: string; p_item_id: string }
        Returns: string
      }
      rejeitar_candidatura: {
        Args: {
          p_candidatura_id: string
          p_justificativa: string
          p_motivo: Database["public"]["Enums"]["motivo_rejeicao_rh"]
        }
        Returns: undefined
      }
      reprocessar_analise: {
        Args: { p_candidatura_id: string }
        Returns: undefined
      }
      responder_revisao_decisao: {
        Args: {
          p_candidatura_id: string
          p_justificativa: string
          p_veredito: string
        }
        Returns: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em: string
          explicacao_solicitada_em: string | null
          id: string
          justificativa: string
          por_usuario: string
          revisao_por_usuario: string | null
          revisao_respondida_em: string | null
          revisao_resultado: string | null
          revisao_solicitada_em: string | null
          revisao_veredito: string | null
        }
        SetofOptions: {
          from: "*"
          to: "decisao_final"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retirar_candidatura: {
        Args: { p_candidatura_id: string }
        Returns: string
      }
      rollback_to_version: {
        Args: {
          p_call_type: Database["public"]["Enums"]["llm_call_type"]
          p_semver: string
        }
        Returns: string
      }
      salvar_avaliacao_entrevista: {
        Args: {
          p_candidatura_id: string
          p_notas: string
          p_scores_humanos: Json
        }
        Returns: Json
      }
      salvar_janela_retencao: {
        Args: {
          p_etapa: Database["public"]["Enums"]["etapa_processo"]
          p_meses: number
        }
        Returns: undefined
      }
      salvar_revisao_redacao: {
        Args: {
          p_decisao: string
          p_notas: string
          p_redacao_id: string
          p_scores_humanos: Json
        }
        Returns: Json
      }
      save_entrevista_guia_edits: {
        Args: { p_candidatura_id: string; p_guia: Json; p_tipo: string }
        Returns: Json
      }
      slugify: { Args: { p_input: string }; Returns: string }
      solicitar_revisao_decisao: {
        Args: { p_candidatura_id: string }
        Returns: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em: string
          explicacao_solicitada_em: string | null
          id: string
          justificativa: string
          por_usuario: string
          revisao_por_usuario: string | null
          revisao_respondida_em: string | null
          revisao_resultado: string | null
          revisao_solicitada_em: string | null
          revisao_veredito: string | null
        }
        SetofOptions: {
          from: "*"
          to: "decisao_final"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      stamp_explicacao_acessada: {
        Args: { p_candidatura_id: string }
        Returns: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em: string
          explicacao_solicitada_em: string | null
          id: string
          justificativa: string
          por_usuario: string
          revisao_por_usuario: string | null
          revisao_respondida_em: string | null
          revisao_resultado: string | null
          revisao_solicitada_em: string | null
          revisao_veredito: string | null
        }
        SetofOptions: {
          from: "*"
          to: "decisao_final"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_candidatura_atomic: {
        Args: {
          p_candidato_id: string
          p_curriculo_nome: string
          p_curriculo_size: number
          p_curriculo_url: string
          p_respostas: Json
          p_vaga_id: string
        }
        Returns: Json
      }
      testar_webhook: { Args: { webhook_config_id: string }; Returns: Json }
      titulares_alem_da_janela: {
        Args: never
        Returns: {
          ancora_em: string
          ancora_origem: string
          candidato_id: string
          candidaturas_alem: number
          etapa: Database["public"]["Enums"]["etapa_processo"]
          janela_meses_aplicada: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
      upsert_pergunta_opcoes_metadata: {
        Args: { p_opcoes: Json; p_pergunta_id: string }
        Returns: Json
      }
      validar_referencia_entrevista: {
        Args: {
          p_entrevista_id: string
          p_tipo_entrevista: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
        }
        Returns: boolean
      }
      varrer_purga_retencao: { Args: never; Returns: undefined }
      varrer_retry_notificacoes: { Args: never; Returns: undefined }
    }
    Enums: {
      candidate_status:
        | "pending_ai"
        | "ai_screened"
        | "auto_approved"
        | "auto_rejected"
        | "flagged_for_review"
        | "human_reviewing"
        | "human_confirmed_approved"
        | "human_confirmed_rejected"
        | "candidate_review_requested"
        | "archived"
      categoria_log_auditoria:
        | "autenticacao"
        | "candidatura"
        | "vaga"
        | "usuario"
        | "configuracao"
        | "teste"
        | "entrevista"
        | "avaliacao"
        | "sistema"
        | "seguranca"
      decisao_final_resultado: "aprovado" | "rejeitado" | "em_espera"
      dimensao_bigfive:
        | "openness"
        | "conscientiousness"
        | "extraversion"
        | "agreeableness"
        | "neuroticism"
      dimensao_disc: "D" | "I" | "S" | "C"
      enum_tag_opcao:
        | "knockout"
        | "atencao"
        | "neutro"
        | "pontua"
        | "fortemente_pontua"
      etapa_processo:
        | "inscricao"
        | "triagem"
        | "avaliacao_assincrona"
        | "entrevista_online"
        | "entrevista_presencial"
        | "decisao_final"
        | "aprovado"
        | "rejeitado"
      llm_call_type:
        | "cv_summary"
        | "cv_job_match"
        | "comparative_ranking"
        | "interview_guide"
        | "transcript_analysis"
        | "culture_fit_essay"
        | "work_sample_sjt"
        | "bigfive_devolutiva"
      llm_provider: "anthropic" | "openai" | "google"
      motivo_rejeicao_rh:
        | "perfil_desalinhado"
        | "reprovado_avaliacao"
        | "reprovado_entrevista"
        | "nao_compareceu"
        | "desistencia"
        | "outro"
      recomendacao_avaliacao: "aprovar" | "rejeitar" | "indeciso"
      serie_raven: "A" | "B" | "C" | "D" | "E"
      severidade_log: "info" | "aviso" | "erro" | "critico"
      status_candidatura:
        | "aguardando_resposta"
        | "em_analise"
        | "aprovado_proxima"
        | "rejeitado"
        | "finalizado"
      status_entrevista:
        | "agendada"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "reagendada"
        | "nao_compareceu"
      status_notificacao:
        | "pendente"
        | "enviado"
        | "entregue"
        | "falhou"
        | "bounce"
        | "reclamado"
      status_score: "sucesso" | "pendente_humano" | "falhou"
      status_vaga: "rascunho" | "ativa" | "inativa" | "arquivada"
      tipo_acao_historico:
        | "candidatura_criada"
        | "formulario_enviado"
        | "formulario_aprovado"
        | "formulario_reprovado"
        | "teste_bigfive_iniciado"
        | "teste_bigfive_concluido"
        | "teste_disc_iniciado"
        | "teste_disc_concluido"
        | "teste_raven_iniciado"
        | "teste_raven_concluido"
        | "entrevista_online_agendada"
        | "entrevista_online_realizada"
        | "entrevista_online_cancelada"
        | "entrevista_presencial_agendada"
        | "entrevista_presencial_realizada"
        | "entrevista_presencial_cancelada"
        | "avaliacao_adicionada"
        | "avaliacao_atualizada"
        | "candidato_aprovado"
        | "candidato_rejeitado"
        | "etapa_avancada"
        | "processo_finalizado"
      tipo_entrevista_avaliacao: "online" | "presencial"
      tipo_resposta_pergunta:
        | "texto_curto"
        | "texto_longo"
        | "single_choice"
        | "multiple_choice"
        | "numerico"
      tipo_score:
        | "sjt"
        | "big_five"
        | "redacao"
        | "entrevista"
        | "cognitivo"
        | "decisao"
      tipo_template_email:
        | "boas_vindas_candidato"
        | "confirmacao_candidatura"
        | "convite_bigfive"
        | "convite_disc"
        | "convite_raven"
        | "convite_cultura"
        | "convite_entrevista_online"
        | "convite_entrevista_presencial"
        | "lembrete_teste"
        | "lembrete_entrevista"
        | "aprovado_proxima_etapa"
        | "aprovado_final"
        | "rejeitado"
        | "feedback_positivo"
        | "recuperacao_senha"
      tipo_webhook:
        | "analise_formulario"
        | "analise_bigfive"
        | "analise_disc"
        | "analise_raven"
        | "analise_cultura"
        | "analise_entrevista"
        | "envio_email"
        | "lembretes"
        | "notificacao_nova_candidatura"
        | "notificacao_teste_concluido"
        | "backup"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      candidate_status: [
        "pending_ai",
        "ai_screened",
        "auto_approved",
        "auto_rejected",
        "flagged_for_review",
        "human_reviewing",
        "human_confirmed_approved",
        "human_confirmed_rejected",
        "candidate_review_requested",
        "archived",
      ],
      categoria_log_auditoria: [
        "autenticacao",
        "candidatura",
        "vaga",
        "usuario",
        "configuracao",
        "teste",
        "entrevista",
        "avaliacao",
        "sistema",
        "seguranca",
      ],
      decisao_final_resultado: ["aprovado", "rejeitado", "em_espera"],
      dimensao_bigfive: [
        "openness",
        "conscientiousness",
        "extraversion",
        "agreeableness",
        "neuroticism",
      ],
      dimensao_disc: ["D", "I", "S", "C"],
      enum_tag_opcao: [
        "knockout",
        "atencao",
        "neutro",
        "pontua",
        "fortemente_pontua",
      ],
      etapa_processo: [
        "inscricao",
        "triagem",
        "avaliacao_assincrona",
        "entrevista_online",
        "entrevista_presencial",
        "decisao_final",
        "aprovado",
        "rejeitado",
      ],
      llm_call_type: [
        "cv_summary",
        "cv_job_match",
        "comparative_ranking",
        "interview_guide",
        "transcript_analysis",
        "culture_fit_essay",
        "work_sample_sjt",
        "bigfive_devolutiva",
      ],
      llm_provider: ["anthropic", "openai", "google"],
      motivo_rejeicao_rh: [
        "perfil_desalinhado",
        "reprovado_avaliacao",
        "reprovado_entrevista",
        "nao_compareceu",
        "desistencia",
        "outro",
      ],
      recomendacao_avaliacao: ["aprovar", "rejeitar", "indeciso"],
      serie_raven: ["A", "B", "C", "D", "E"],
      severidade_log: ["info", "aviso", "erro", "critico"],
      status_candidatura: [
        "aguardando_resposta",
        "em_analise",
        "aprovado_proxima",
        "rejeitado",
        "finalizado",
      ],
      status_entrevista: [
        "agendada",
        "em_andamento",
        "concluida",
        "cancelada",
        "reagendada",
        "nao_compareceu",
      ],
      status_notificacao: [
        "pendente",
        "enviado",
        "entregue",
        "falhou",
        "bounce",
        "reclamado",
      ],
      status_score: ["sucesso", "pendente_humano", "falhou"],
      status_vaga: ["rascunho", "ativa", "inativa", "arquivada"],
      tipo_acao_historico: [
        "candidatura_criada",
        "formulario_enviado",
        "formulario_aprovado",
        "formulario_reprovado",
        "teste_bigfive_iniciado",
        "teste_bigfive_concluido",
        "teste_disc_iniciado",
        "teste_disc_concluido",
        "teste_raven_iniciado",
        "teste_raven_concluido",
        "entrevista_online_agendada",
        "entrevista_online_realizada",
        "entrevista_online_cancelada",
        "entrevista_presencial_agendada",
        "entrevista_presencial_realizada",
        "entrevista_presencial_cancelada",
        "avaliacao_adicionada",
        "avaliacao_atualizada",
        "candidato_aprovado",
        "candidato_rejeitado",
        "etapa_avancada",
        "processo_finalizado",
      ],
      tipo_entrevista_avaliacao: ["online", "presencial"],
      tipo_resposta_pergunta: [
        "texto_curto",
        "texto_longo",
        "single_choice",
        "multiple_choice",
        "numerico",
      ],
      tipo_score: [
        "sjt",
        "big_five",
        "redacao",
        "entrevista",
        "cognitivo",
        "decisao",
      ],
      tipo_template_email: [
        "boas_vindas_candidato",
        "confirmacao_candidatura",
        "convite_bigfive",
        "convite_disc",
        "convite_raven",
        "convite_cultura",
        "convite_entrevista_online",
        "convite_entrevista_presencial",
        "lembrete_teste",
        "lembrete_entrevista",
        "aprovado_proxima_etapa",
        "aprovado_final",
        "rejeitado",
        "feedback_positivo",
        "recuperacao_senha",
      ],
      tipo_webhook: [
        "analise_formulario",
        "analise_bigfive",
        "analise_disc",
        "analise_raven",
        "analise_cultura",
        "analise_entrevista",
        "envio_email",
        "lembretes",
        "notificacao_nova_candidatura",
        "notificacao_teste_concluido",
        "backup",
        "outro",
      ],
    },
  },
} as const
