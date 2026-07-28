/**
 * Tipos da feature timeline (TIMELINE-02) — a estimativa de prazo por etapa exibida no
 * painel do candidato. Deriva do Row gerado de `config_sla_etapa` para não divergir do
 * schema (a tabela é seedada na P37; nunca editar `database.types.ts` à mão).
 */
import type { Database } from '@/../database.types'

/** A projeção candidate-facing de `config_sla_etapa` — allowlist de 4 colunas non-PII. */
export type SlaEtapa = Pick<
  Database['public']['Tables']['config_sla_etapa']['Row'],
  'etapa' | 'prazo_valor' | 'prazo_unidade' | 'rotulo_candidato'
>
