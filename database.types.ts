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
  public: {
    Tables: {
      autorizacoes: {
        Row: {
          autorizacao_analise_video: boolean
          autorizacao_comunicacao: boolean
          autorizacao_retencao_curriculo: boolean
          autorizacao_uso_dados: boolean
          candidato_id: string
          created_at: string
          id: string
          ip_aceite: unknown
          policy_version: string
          updated_at: string
          user_agent_aceite: string | null
          user_id: string | null
        }
        Insert: {
          autorizacao_analise_video?: boolean
          autorizacao_comunicacao?: boolean
          autorizacao_retencao_curriculo?: boolean
          autorizacao_uso_dados?: boolean
          candidato_id: string
          created_at?: string
          id?: string
          ip_aceite?: unknown
          policy_version?: string
          updated_at?: string
          user_agent_aceite?: string | null
          user_id?: string | null
        }
        Update: {
          autorizacao_analise_video?: boolean
          autorizacao_comunicacao?: boolean
          autorizacao_retencao_curriculo?: boolean
          autorizacao_uso_dados?: boolean
          candidato_id?: string
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
          cpf: string
          created_at: string
          created_by: string | null
          data_nascimento: string
          data_ultimo_acesso: string | null
          deleted_at: string | null
          email: string
          email_verificado: boolean
          estado: string
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
          user_id: string
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
          cpf: string
          created_at?: string
          created_by?: string | null
          data_nascimento: string
          data_ultimo_acesso?: string | null
          deleted_at?: string | null
          email: string
          email_verificado?: boolean
          estado: string
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
          user_id: string
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
          cpf?: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string
          data_ultimo_acesso?: string | null
          deleted_at?: string | null
          email?: string
          email_verificado?: boolean
          estado?: string
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
          user_id?: string
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
          etapa_atual: Database["public"]["Enums"]["etapa_processo"]
          etapa_justificativa: string | null
          feedback_rejeicao: string | null
          id: string
          is_favorito: boolean
          is_rascunho: boolean
          observacoes_rh: string | null
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
          etapa_atual?: Database["public"]["Enums"]["etapa_processo"]
          etapa_justificativa?: string | null
          feedback_rejeicao?: string | null
          id?: string
          is_favorito?: boolean
          is_rascunho?: boolean
          observacoes_rh?: string | null
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
          etapa_atual?: Database["public"]["Enums"]["etapa_processo"]
          etapa_justificativa?: string | null
          feedback_rejeicao?: string | null
          id?: string
          is_favorito?: boolean
          is_rascunho?: boolean
          observacoes_rh?: string | null
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
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          },
        ]
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
      decisao_final: {
        Row: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em: string
          explicacao_solicitada_em: string | null
          id: string
          justificativa: string
          por_usuario: string
          revisao_resultado: string | null
          revisao_solicitada_em: string | null
        }
        Insert: {
          candidatura_id: string
          decisao: Database["public"]["Enums"]["decisao_final_resultado"]
          em?: string
          explicacao_solicitada_em?: string | null
          id?: string
          justificativa: string
          por_usuario: string
          revisao_resultado?: string | null
          revisao_solicitada_em?: string | null
        }
        Update: {
          candidatura_id?: string
          decisao?: Database["public"]["Enums"]["decisao_final_resultado"]
          em?: string
          explicacao_solicitada_em?: string | null
          id?: string
          justificativa?: string
          por_usuario?: string
          revisao_resultado?: string | null
          revisao_solicitada_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisao_final_candidatura_id_fkey"
            columns: ["candidatura_id"]
            isOneToOne: true
            referencedRelation: "candidaturas"
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
          ip_address: unknown
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
            foreignKeyName: "respostas_raven_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes_raven"
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
          estado: string | null
          exibir_salario: boolean | null
          faixa_salarial_max: number | null
          faixa_salarial_min: number | null
          id: string
          jornada_trabalho: string | null
          modelo_trabalho: string | null
          nivel_senioridade: string | null
          perfil_ideal: string | null
          prompt_ia_descricao: string | null
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
          tipo_contrato: string | null
          titulo: string
          total_vagas: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
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
          estado?: string | null
          exibir_salario?: boolean | null
          faixa_salarial_max?: number | null
          faixa_salarial_min?: number | null
          id?: string
          jornada_trabalho?: string | null
          modelo_trabalho?: string | null
          nivel_senioridade?: string | null
          perfil_ideal?: string | null
          prompt_ia_descricao?: string | null
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
          tipo_contrato?: string | null
          titulo: string
          total_vagas?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
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
          estado?: string | null
          exibir_salario?: boolean | null
          faixa_salarial_max?: number | null
          faixa_salarial_min?: number | null
          id?: string
          jornada_trabalho?: string | null
          modelo_trabalho?: string | null
          nivel_senioridade?: string | null
          perfil_ideal?: string | null
          prompt_ia_descricao?: string | null
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
      avancar_etapa: {
        Args: { candidatura_uuid: string; usuario_rh_uuid: string }
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
      check_candidato_duplicate: {
        Args: { p_cpf: string; p_email: string }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      generate_unique_vaga_slug: {
        Args: { p_exclude_id?: string; p_titulo: string }
        Returns: string
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
      limpar_logs_antigos: { Args: never; Returns: number }
      limpar_sessoes_expiradas: { Args: never; Returns: undefined }
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
      rejeitar_candidato: {
        Args: {
          candidatura_uuid: string
          motivo: string
          usuario_rh_uuid: string
        }
        Returns: undefined
      }
      slugify: { Args: { p_input: string }; Returns: string }
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
      unaccent: { Args: { "": string }; Returns: string }
      validar_referencia_entrevista: {
        Args: {
          p_entrevista_id: string
          p_tipo_entrevista: Database["public"]["Enums"]["tipo_entrevista_avaliacao"]
        }
        Returns: boolean
      }
    }
    Enums: {
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
      etapa_processo:
        | "inscricao"
        | "triagem"
        | "avaliacao_assincrona"
        | "entrevista_online"
        | "entrevista_presencial"
        | "decisao_final"
        | "aprovado"
        | "rejeitado"
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
  public: {
    Enums: {
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
