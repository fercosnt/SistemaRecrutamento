/**
 * Serviço de auditoria de viés (admin — LGPD-03).
 *
 * Lê o último snapshot de `bias_audit_log` com allowlist explícito (NUNCA estrela),
 * dispara a RPC `gerar_bias_snapshot` (SECURITY DEFINER, admin-only) e exporta o
 * snapshot atual como CSV (idioma blob-download do AiCostsPage).
 *
 * O snapshot persiste apenas agregados por faixa etária (sem linha por candidato —
 * T-15-16). A leitura usa o allowlist `BIAS_AUDIT_COLUMNS`, nunca a estrela
 * ([[reference_select_star_leaks_pii]]).
 *
 * NOTA (15-06): `bias_audit_log` + `gerar_bias_snapshot` são AUTORADOS na Plan 02 e
 * aplicados em PROD pela Plan 06 [BLOCKING]. Até a regeneração de `database.types.ts`,
 * a tabela/RPC não existem nos tipos gerados → usamos casts `as never` nos pontos de
 * contato com o supabase client. Remover os casts após `npm run db:types` em 15-06.
 *
 * @module features/admin/bias-audit/services/biasAuditService
 * @see src/features/admin/ai-costs/services/aiCostsService.ts (analog: allowlist read + error class)
 * @see src/features/admin/bias-audit/biasMath.ts (the TS mirror of gerar_bias_snapshot)
 */

import { supabase } from '@/lib/supabase/client'
import type { AdverseImpactResult, BandResult } from '../biasMath'

/** Allowlist de colunas — nunca a estrela (LGPD / [[reference_select_star_leaks_pii]]). */
export const BIAS_AUDIT_COLUMNS = 'id, snapshot_em, periodo, dados, criado_em'

/** Uma linha do snapshot de bias_audit_log (agregados por faixa etária — sem PII). */
export interface BiasAuditSnapshot {
  id: string
  snapshot_em: string | null
  periodo: string | null
  dados: AdverseImpactResult
  criado_em: string | null
}

export class BiasAuditServiceError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'DATABASE_ERROR' | 'INVALID_INPUT' | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'BiasAuditServiceError'
  }
}

/** Retorna o YYYY-MM do mês atual (UTC) — período default do snapshot. */
export function currentPeriod(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/**
 * Lê o snapshot mais recente de `bias_audit_log` (allowlist, sem a estrela).
 * Retorna `null` quando ainda não há nenhum snapshot (estado default no ship).
 */
export async function listLatestSnapshot(): Promise<BiasAuditSnapshot | null> {
  try {
    const { data, error } = await supabase
      // bias_audit_log ainda não está nos tipos gerados (aplicado em 15-06) — cast.
      .from('bias_audit_log' as never)
      .select(BIAS_AUDIT_COLUMNS)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new BiasAuditServiceError(
        `Erro ao buscar snapshot de viés: ${error.message}`,
        'DATABASE_ERROR',
        error,
      )
    }
    return (data ?? null) as unknown as BiasAuditSnapshot | null
  } catch (error) {
    if (error instanceof BiasAuditServiceError) throw error
    throw new BiasAuditServiceError(
      'Erro inesperado ao listar snapshot de viés',
      'NETWORK_ERROR',
      error,
    )
  }
}

/**
 * Dispara a RPC `gerar_bias_snapshot(p_periodo)` (SECURITY DEFINER, admin-only).
 * Grava UMA linha em `bias_audit_log` com agregados por faixa etária e retorna a
 * linha inserida. Mirror do idioma `triagemService.reprocessarAnalise`.
 */
export async function gerarSnapshot(periodo: string): Promise<BiasAuditSnapshot> {
  if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    throw new BiasAuditServiceError('Período inválido (esperado YYYY-MM)', 'INVALID_INPUT')
  }

  // gerar_bias_snapshot ainda não está nos tipos gerados (aplicado em 15-06) — cast.
  const { data, error } = await supabase.rpc('gerar_bias_snapshot' as never, {
    p_periodo: periodo,
  } as never)

  if (error) {
    const code =
      (error as { code?: string }).code === '42501' ? 'UNAUTHORIZED' : 'DATABASE_ERROR'
    throw new BiasAuditServiceError(
      `Não foi possível gerar o snapshot: ${error.message}`,
      code,
      error,
    )
  }

  return data as unknown as BiasAuditSnapshot
}

/** Escapa um valor para uma célula CSV (aspas + vírgula seguras). */
function csvCell(value: string | number | boolean): string {
  const s = String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Exporta o snapshot atual como CSV (faixa / applicants / selected / selection_rate /
 * razao_4_5 / flag) usando o idioma blob-download do AiCostsPage.
 */
export function exportCsv(dados: AdverseImpactResult, periodo?: string | null): void {
  const header = [
    'faixa_etaria',
    'applicants',
    'selected',
    'selection_rate',
    'razao_4_5',
    'flag',
  ]
  const rows = (dados.bands ?? []).map((b: BandResult) =>
    [
      csvCell(b.faixa),
      csvCell(b.applicants),
      csvCell(b.selected),
      csvCell(b.selection_rate.toFixed(4)),
      csvCell(b.razao_4_5.toFixed(4)),
      csvCell(b.flag),
    ].join(','),
  )
  const csv = [header.join(','), ...rows].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bias-audit-${periodo ?? currentPeriod()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
