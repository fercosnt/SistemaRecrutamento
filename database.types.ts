/**
 * TypeScript types gerados para o banco de dados Supabase
 * Beauty Smile - Sistema de Recrutamento
 *
 * Este arquivo contém os types para as principais tabelas usadas no sistema.
 * Focado inicialmente nas tabelas necessárias para o PRD-0001 (Cadastro de Candidatos)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Tabela principal de candidatos
      candidatos: {
        Row: {
          id: string
          user_id: string | null
          nome_completo: string
          cpf: string
          rg: string | null
          data_nascimento: string
          sexo: string
          estado_civil: string | null
          telefone: string
          telefone_alternativo: string | null
          email: string
          escolaridade: string | null
          profissao_atual: string | null
          status_processo: string
          etapa_atual: string
          progresso_processo: number
          data_cadastro: string
          data_ultima_atualizacao: string | null
          observacoes: string | null
          foto_perfil_url: string | null
          curriculo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          nome_completo: string
          cpf: string
          rg?: string | null
          data_nascimento: string
          sexo: string
          estado_civil?: string | null
          telefone: string
          telefone_alternativo?: string | null
          email: string
          escolaridade?: string | null
          profissao_atual?: string | null
          status_processo?: string
          etapa_atual?: string
          progresso_processo?: number
          data_cadastro?: string
          data_ultima_atualizacao?: string | null
          observacoes?: string | null
          foto_perfil_url?: string | null
          curriculo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          nome_completo?: string
          cpf?: string
          rg?: string | null
          data_nascimento?: string
          sexo?: string
          estado_civil?: string | null
          telefone?: string
          telefone_alternativo?: string | null
          email?: string
          escolaridade?: string | null
          profissao_atual?: string | null
          status_processo?: string
          etapa_atual?: string
          progresso_processo?: number
          data_cadastro?: string
          data_ultima_atualizacao?: string | null
          observacoes?: string | null
          foto_perfil_url?: string | null
          curriculo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // Endereços dos candidatos
      enderecos: {
        Row: {
          id: string
          candidato_id: string
          tipo_endereco: string
          cep: string
          logradouro: string
          numero: string
          complemento: string | null
          bairro: string
          cidade: string
          estado: string
          pais: string
          endereco_principal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidato_id: string
          tipo_endereco?: string
          cep: string
          logradouro: string
          numero: string
          complemento?: string | null
          bairro: string
          cidade: string
          estado: string
          pais?: string
          endereco_principal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidato_id?: string
          tipo_endereco?: string
          cep?: string
          logradouro?: string
          numero?: string
          complemento?: string | null
          bairro?: string
          cidade?: string
          estado?: string
          pais?: string
          endereco_principal?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'enderecos_candidato_id_fkey'
            columns: ['candidato_id']
            referencedRelation: 'candidatos'
            referencedColumns: ['id']
          }
        ]
      }

      // Dados profissionais dos candidatos
      dados_profissionais: {
        Row: {
          id: string
          candidato_id: string
          possui_experiencia: boolean
          area_atuacao: string | null
          anos_experiencia: number | null
          ultima_empresa: string | null
          cargo_atual: string | null
          competencias: string[] | null
          idiomas: Json | null
          certificacoes: string[] | null
          linkedin_url: string | null
          portfolio_url: string | null
          pretensao_salarial: number | null
          disponibilidade_viagem: boolean
          possui_cnh: boolean
          categoria_cnh: string | null
          possui_veiculo_proprio: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidato_id: string
          possui_experiencia?: boolean
          area_atuacao?: string | null
          anos_experiencia?: number | null
          ultima_empresa?: string | null
          cargo_atual?: string | null
          competencias?: string[] | null
          idiomas?: Json | null
          certificacoes?: string[] | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          disponibilidade_viagem?: boolean
          possui_cnh?: boolean
          categoria_cnh?: string | null
          possui_veiculo_proprio?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidato_id?: string
          possui_experiencia?: boolean
          area_atuacao?: string | null
          anos_experiencia?: number | null
          ultima_empresa?: string | null
          cargo_atual?: string | null
          competencias?: string[] | null
          idiomas?: Json | null
          certificacoes?: string[] | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          pretensao_salarial?: number | null
          disponibilidade_viagem?: boolean
          possui_cnh?: boolean
          categoria_cnh?: string | null
          possui_veiculo_proprio?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dados_profissionais_candidato_id_fkey'
            columns: ['candidato_id']
            referencedRelation: 'candidatos'
            referencedColumns: ['id']
          }
        ]
      }

      // Disponibilidade dos candidatos
      disponibilidade: {
        Row: {
          id: string
          candidato_id: string
          tipo_contrato: string[] | null
          regime_trabalho: string[] | null
          horarios_disponiveis: Json | null
          data_disponibilidade: string | null
          periodo_disponivel: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidato_id: string
          tipo_contrato?: string[] | null
          regime_trabalho?: string[] | null
          horarios_disponiveis?: Json | null
          data_disponibilidade?: string | null
          periodo_disponivel?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidato_id?: string
          tipo_contrato?: string[] | null
          regime_trabalho?: string[] | null
          horarios_disponiveis?: Json | null
          data_disponibilidade?: string | null
          periodo_disponivel?: string | null
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'disponibilidade_candidato_id_fkey'
            columns: ['candidato_id']
            referencedRelation: 'candidatos'
            referencedColumns: ['id']
          }
        ]
      }

      // Autorizações e consentimentos
      autorizacoes: {
        Row: {
          id: string
          candidato_id: string
          consentimento_lgpd: boolean
          consentimento_termos_uso: boolean
          consentimento_politica_privacidade: boolean
          consentimento_comunicacoes: boolean
          consentimento_compartilhamento_dados: boolean
          consentimento_gravacao_video: boolean
          consentimento_ia: boolean
          data_consentimento_lgpd: string | null
          data_consentimento_termos: string | null
          ip_consentimento: string | null
          user_agent_consentimento: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidato_id: string
          consentimento_lgpd?: boolean
          consentimento_termos_uso?: boolean
          consentimento_politica_privacidade?: boolean
          consentimento_comunicacoes?: boolean
          consentimento_compartilhamento_dados?: boolean
          consentimento_gravacao_video?: boolean
          consentimento_ia?: boolean
          data_consentimento_lgpd?: string | null
          data_consentimento_termos?: string | null
          ip_consentimento?: string | null
          user_agent_consentimento?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidato_id?: string
          consentimento_lgpd?: boolean
          consentimento_termos_uso?: boolean
          consentimento_politica_privacidade?: boolean
          consentimento_comunicacoes?: boolean
          consentimento_compartilhamento_dados?: boolean
          consentimento_gravacao_video?: boolean
          consentimento_ia?: boolean
          data_consentimento_lgpd?: string | null
          data_consentimento_termos?: string | null
          ip_consentimento?: string | null
          user_agent_consentimento?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'autorizacoes_candidato_id_fkey'
            columns: ['candidato_id']
            referencedRelation: 'candidatos'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
