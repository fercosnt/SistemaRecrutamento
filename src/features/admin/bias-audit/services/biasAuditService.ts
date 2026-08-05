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
 * NOTA: `bias_audit_log` + `gerar_bias_snapshot` estão LIVE em PROD e tipados em
 * `database.types.ts` (regen da Plan 15-06). Nenhum cast `as never` permanece nas
 * chamadas ao supabase client; o snapshot é o único produzido pelo SQL RPC.
 *
 * @module features/admin/bias-audit/services/biasAuditService
 * @see src/features/admin/ai-costs/services/aiCostsService.ts (analog: allowlist read + error class)
 * @see src/features/admin/bias-audit/biasMath.ts (the TS mirror of gerar_bias_snapshot)
 */

import { supabase } from '@/lib/supabase/client'
import { bandaSuprimida } from '../biasMath'
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
      // bias_audit_log is live in PROD + present in database.types.ts (15-06 regen).
      .from('bias_audit_log')
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

  // gerar_bias_snapshot is live in PROD + present in database.types.ts (15-06 regen).
  const { data, error } = await supabase.rpc('gerar_bias_snapshot', {
    p_periodo: periodo,
  })

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
 * Exporta o snapshot atual como CSV (faixa / suprimida / motivo_supressao / applicants /
 * selected / selection_rate / razao_4_5 / flag) usando o idioma blob-download do AiCostsPage.
 *
 * ⚠ **CÉLULA VAZIA, NUNCA ZERO — e o CSV é onde isso mais importa.** A planilha é o artefato
 * que sai desta tela e vira anexo de processo; nela ninguém vê o banner de limitação nem o
 * ícone da linha suprimida. Um `0` numa coluna de contagem seria lido como "nenhum candidato
 * desta faixa foi aprovado" quando o fato é "o número não foi publicado porque a faixa tem
 * menos de 5 pessoas" — a afirmação oposta, sobre discriminação, num documento probatório.
 *
 * Por isso as colunas derivadas saem **vazias** nas faixas suprimidas, e duas colunas novas
 * (`suprimida`, `motivo_supressao`) dizem por quê **na própria linha**. Antes desta correção o
 * export sequer chegava a mentir: `b.selection_rate.toFixed(4)` lançava `TypeError` sobre o
 * payload v2 e o download não acontecia.
 */
export function exportCsv(dados: AdverseImpactResult, periodo?: string | null): void {
  const header = [
    'faixa_etaria',
    'suprimida',
    'motivo_supressao',
    'applicants',
    'selected',
    'selection_rate',
    'razao_4_5',
    'flag',
  ]
  const rows = (dados.bands ?? []).map((b: BandResult) =>
    bandaSuprimida(b)
      ? [csvCell(b.faixa), csvCell(true), csvCell(b.motivo_supressao), '', '', '', '', ''].join(',')
      : [
          csvCell(b.faixa),
          csvCell(false),
          '',
          csvCell(b.applicants),
          csvCell(b.selected),
          b.selection_rate == null ? '' : csvCell(b.selection_rate.toFixed(4)),
          b.razao_4_5 == null ? '' : csvCell(b.razao_4_5.toFixed(4)),
          b.flag == null ? '' : csvCell(b.flag),
        ].join(','),
  )

  // Rodapé de proveniência: sem ele, a planilha perde a informação de que houve supressão —
  // e uma tabela com faixas faltando, sem dizer que faltam, é pior que uma tabela incompleta
  // declarada. `n_total` some por desenho quando há supressão primária (é a chave da subtração).
  const rodape: string[] = []
  if (dados.celulas_suprimidas) {
    rodape.push('')
    rodape.push(
      csvCell(
        `# ${dados.celulas_suprimidas} faixa(s) suprimida(s) por k-anonimato (k=${dados.k_supressao ?? 5}). ` +
          `Celulas vazias significam NAO PUBLICADO, nunca zero.`,
      ),
    )
    if (dados.supressao_complementar_aplicada) {
      rodape.push(
        csvCell(
          '# Uma faixa adicional foi suprimida para impedir a recuperacao da primeira por subtracao.',
        ),
      )
    }
    if (dados.n_total_suprimido) {
      rodape.push(
        csvCell('# O total geral (n_total) foi omitido pela mesma razao — ele fecharia a conta.'),
      )
    }
    if (dados.faixa_referencia_suprimida) {
      rodape.push(
        csvCell(
          '# A faixa de referencia (maior taxa) esta suprimida — a razao 4/5 do relatorio nao pode ser calculada.',
        ),
      )
    }
  }

  const csv = [header.join(','), ...rows, ...rodape].join('\n')

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
