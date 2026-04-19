export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      candidatos: {
        Row: {
          id: string
          user_id: string
          nome_completo: string
          email: string
          celular: string
          cpf: string
          data_nascimento: string
          cidade: string
          estado: string
          logradouro: string | null
          numero: string | null
          bairro: string | null
          cep: string | null
          complemento: string | null
          genero: string | null
          linkedin: string | null
          linkedin_url: string | null
          instagram: string | null
          instagram_url: string | null
          avatar_url: string | null
          ativo: boolean
          bloqueado: boolean
          bloqueado_motivo: string | null
          email_verificado: boolean
          data_ultimo_acesso: string | null
          como_conheceu: string | null
          como_conheceu_detalhes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          nome_completo: string
          email: string
          celular: string
          cpf: string
          data_nascimento: string
          cidade: string
          estado: string
          logradouro?: string | null
          numero?: string | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          genero?: string | null
          linkedin?: string | null
          linkedin_url?: string | null
          instagram?: string | null
          instagram_url?: string | null
          avatar_url?: string | null
          ativo?: boolean
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          email_verificado?: boolean
          data_ultimo_acesso?: string | null
          como_conheceu?: string | null
          como_conheceu_detalhes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          nome_completo?: string
          email?: string
          celular?: string
          cpf?: string
          data_nascimento?: string
          cidade?: string
          estado?: string
          logradouro?: string | null
          numero?: string | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          genero?: string | null
          linkedin?: string | null
          linkedin_url?: string | null
          instagram?: string | null
          instagram_url?: string | null
          avatar_url?: string | null
          ativo?: boolean
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          email_verificado?: boolean
          data_ultimo_acesso?: string | null
          como_conheceu?: string | null
          como_conheceu_detalhes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      vagas: {
        Row: {
          id: string
          titulo: string
          slug: string
          subtitulo: string | null
          descricao_curta: string | null
          sobre_cargo: string | null
          sobre_empresa: string | null
          responsabilidades: string | null
          requisitos_formacao: string | null
          requisitos_experiencia: string | null
          requisitos_tecnicos: string | null
          requisitos_habilidades: string | null
          beneficios: string | null
          diferenciais: string | null
          perfil_ideal: string | null
          departamento: string | null
          cidade: string | null
          estado: string | null
          endereco_completo: string | null
          modelo_trabalho: string | null
          tipo_contrato: string | null
          jornada_trabalho: string | null
          nivel_senioridade: string | null
          faixa_salarial_min: number | null
          faixa_salarial_max: number | null
          exibir_salario: boolean | null
          total_vagas: number | null
          data_abertura: string | null
          data_fechamento: string | null
          status: Database["public"]["Enums"]["status_vaga"]
          prompt_ia_descricao: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          titulo: string
          slug: string
          subtitulo?: string | null
          descricao_curta?: string | null
          sobre_cargo?: string | null
          sobre_empresa?: string | null
          responsabilidades?: string | null
          requisitos_formacao?: string | null
          requisitos_experiencia?: string | null
          requisitos_tecnicos?: string | null
          requisitos_habilidades?: string | null
          beneficios?: string | null
          diferenciais?: string | null
          perfil_ideal?: string | null
          departamento?: string | null
          cidade?: string | null
          estado?: string | null
          endereco_completo?: string | null
          modelo_trabalho?: string | null
          tipo_contrato?: string | null
          jornada_trabalho?: string | null
          nivel_senioridade?: string | null
          faixa_salarial_min?: number | null
          faixa_salarial_max?: number | null
          exibir_salario?: boolean | null
          total_vagas?: number | null
          data_abertura?: string | null
          data_fechamento?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          prompt_ia_descricao?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          titulo?: string
          slug?: string
          subtitulo?: string | null
          descricao_curta?: string | null
          sobre_cargo?: string | null
          sobre_empresa?: string | null
          responsabilidades?: string | null
          requisitos_formacao?: string | null
          requisitos_experiencia?: string | null
          requisitos_tecnicos?: string | null
          requisitos_habilidades?: string | null
          beneficios?: string | null
          diferenciais?: string | null
          perfil_ideal?: string | null
          departamento?: string | null
          cidade?: string | null
          estado?: string | null
          endereco_completo?: string | null
          modelo_trabalho?: string | null
          tipo_contrato?: string | null
          jornada_trabalho?: string | null
          nivel_senioridade?: string | null
          faixa_salarial_min?: number | null
          faixa_salarial_max?: number | null
          exibir_salario?: boolean | null
          total_vagas?: number | null
          data_abertura?: string | null
          data_fechamento?: string | null
          status?: Database["public"]["Enums"]["status_vaga"]
          prompt_ia_descricao?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      candidaturas: {
        Row: {
          id: string
          candidato_id: string
          vaga_id: string
          status: Database["public"]["Enums"]["status_candidatura"]
          etapa_atual: Database["public"]["Enums"]["etapa_processo"]
          feedback_rejeicao: string | null
          score_geral: number | null
          origem_candidatura: string | null
          is_rascunho: boolean
          is_favorito: boolean
          observacoes_rh: string | null
          curriculo_url: string | null
          curriculo_nome_original: string | null
          curriculo_tamanho_bytes: number | null
          tempo_preenchimento_segundos: number | null
          data_candidatura: string
          data_formulario_enviado: string | null
          data_bigfive_enviado: string | null
          data_disc_enviado: string | null
          data_raven_enviado: string | null
          data_entrevista_online: string | null
          data_cultura_enviado: string | null
          data_entrevista_presencial: string | null
          data_decisao_final: string | null
          analise_ia_formulario: Json | null
          analise_ia_bigfive: Json | null
          analise_ia_disc: Json | null
          analise_ia_raven: Json | null
          analise_ia_entrevista_online: Json | null
          analise_ia_cultura: Json | null
          analise_ia_entrevista_presencial: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          candidato_id: string
          vaga_id: string
          status?: Database["public"]["Enums"]["status_candidatura"]
          etapa_atual?: Database["public"]["Enums"]["etapa_processo"]
          feedback_rejeicao?: string | null
          score_geral?: number | null
          origem_candidatura?: string | null
          is_rascunho?: boolean
          is_favorito?: boolean
          observacoes_rh?: string | null
          curriculo_url?: string | null
          curriculo_nome_original?: string | null
          curriculo_tamanho_bytes?: number | null
          tempo_preenchimento_segundos?: number | null
          data_candidatura?: string
          data_formulario_enviado?: string | null
          data_bigfive_enviado?: string | null
          data_disc_enviado?: string | null
          data_raven_enviado?: string | null
          data_entrevista_online?: string | null
          data_cultura_enviado?: string | null
          data_entrevista_presencial?: string | null
          data_decisao_final?: string | null
          analise_ia_formulario?: Json | null
          analise_ia_bigfive?: Json | null
          analise_ia_disc?: Json | null
          analise_ia_raven?: Json | null
          analise_ia_entrevista_online?: Json | null
          analise_ia_cultura?: Json | null
          analise_ia_entrevista_presencial?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          candidato_id?: string
          vaga_id?: string
          status?: Database["public"]["Enums"]["status_candidatura"]
          etapa_atual?: Database["public"]["Enums"]["etapa_processo"]
          feedback_rejeicao?: string | null
          score_geral?: number | null
          origem_candidatura?: string | null
          is_rascunho?: boolean
          is_favorito?: boolean
          observacoes_rh?: string | null
          curriculo_url?: string | null
          curriculo_nome_original?: string | null
          curriculo_tamanho_bytes?: number | null
          tempo_preenchimento_segundos?: number | null
          data_candidatura?: string
          data_formulario_enviado?: string | null
          data_bigfive_enviado?: string | null
          data_disc_enviado?: string | null
          data_raven_enviado?: string | null
          data_entrevista_online?: string | null
          data_cultura_enviado?: string | null
          data_entrevista_presencial?: string | null
          data_decisao_final?: string | null
          analise_ia_formulario?: Json | null
          analise_ia_bigfive?: Json | null
          analise_ia_disc?: Json | null
          analise_ia_raven?: Json | null
          analise_ia_entrevista_online?: Json | null
          analise_ia_cultura?: Json | null
          analise_ia_entrevista_presencial?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
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
            foreignKeyName: "candidaturas_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "vagas"
            referencedColumns: ["id"]
          }
        ]
      }
      usuarios_rh: {
        Row: {
          id: string
          user_id: string
          nome_completo: string
          email: string
          cargo: string
          role: string
          telefone: string | null
          avatar_url: string | null
          ativo: boolean
          primeiro_acesso: boolean
          data_ultimo_login: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          nome_completo: string
          email: string
          cargo: string
          role: string
          telefone?: string | null
          avatar_url?: string | null
          ativo?: boolean
          primeiro_acesso?: boolean
          data_ultimo_login?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          nome_completo?: string
          email?: string
          cargo?: string
          role?: string
          telefone?: string | null
          avatar_url?: string | null
          ativo?: boolean
          primeiro_acesso?: boolean
          data_ultimo_login?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      status_vaga: "rascunho" | "ativa" | "inativa" | "arquivada"
      status_candidatura:
        | "aguardando_resposta"
        | "em_analise"
        | "aprovado_proxima"
        | "rejeitado"
        | "finalizado"
      etapa_processo:
        | "triagem"
        | "bigfive"
        | "disc"
        | "entrevista_online"
        | "raven"
        | "cultura"
        | "entrevista_presencial"
        | "avaliacao_final"
        | "aprovado"
        | "rejeitado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
