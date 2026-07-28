/**
 * `slaService` — leitura da config estática de prazos (`config_sla_etapa`) para a timeline
 * do painel do candidato (TIMELINE-02).
 *
 * A tabela é non-PII e tem RLS `sla_public_read` (anon + authenticated), então o read usa
 * o client anon com uma **allowlist explícita** de colunas — nunca projeção estrela (RLS é
 * row-level; uma projeção com estrela vazaria qualquer coluna futura). Zero escrita.
 */
import { supabase } from '@/lib/supabase/client'
import type { SlaEtapa } from '../types/timelineTypes'

/** Erro do serviço de SLA (convenção camelCaseService.ts). */
export class SlaServiceError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'SlaServiceError'
  }
}

/** Colunas candidate-facing — allowlist (NUNCA `*`). */
const SLA_COLUMNS = 'etapa, prazo_valor, prazo_unidade, rotulo_candidato'

/**
 * Lê todas as linhas de `config_sla_etapa` (8 etapas). A tabela é pequena e estática —
 * o hook consumidor cacheia com `staleTime: Infinity`.
 */
export async function listarSlaEtapas(): Promise<SlaEtapa[]> {
  const { data, error } = await supabase
    .from('config_sla_etapa')
    .select(SLA_COLUMNS)

  if (error) {
    throw new SlaServiceError(
      `Não foi possível carregar os prazos das etapas: ${error.message}`,
      error,
    )
  }
  return (data ?? []) as SlaEtapa[]
}
