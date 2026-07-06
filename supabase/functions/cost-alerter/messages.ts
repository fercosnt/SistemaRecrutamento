/**
 * `cost-alerter/messages.ts` — Cópia pt-BR dos alertas de anomalia de custo (AI-06).
 *
 * Phase 23 / Plan 23-03. Extraído de `cost-alerter/index.ts` para um módulo PURO
 * (sem `Deno.serve`, sem rede, sem DB) para que os 4 canais sejam unit-testáveis
 * diretamente — incluindo `candidate_cost_over_1`, que era código morto não-guardado
 * (o trigger só emite `vaga_cost_over_200` + `error_rate` hoje; a emissão do canal
 * candidate fica no Plan 23-05). O handler importa daqui — comportamento byte-idêntico.
 *
 * Segurança (T-09-24): o corpo do alerta carrega apenas ids + limiares numéricos;
 * nenhuma PII. Cópia pt-BR; sem termos de produto proibidos (RNF-12a).
 *
 * @module supabase/functions/cost-alerter/messages
 */

// ---------------------------------------------------------------------------
// Body shape — mirrors notify_cost_anomaly() net.http_post body
// ---------------------------------------------------------------------------

export interface CostAnomalyBody {
  /** maps to recruiter_alerts.threshold_violated, e.g. 'vaga_cost_over_200' | 'error_rate' */
  alert_type: string
  vaga_id: string | null
  /** ISO date (YYYY-MM-DD) — the ai_cost_daily aggregation day */
  date: string
  value: number
  threshold: number
}

/** pt-BR alert copy per threshold. No forbidden product terms. */
export function alertMessage(b: CostAnomalyBody): string {
  switch (b.alert_type) {
    case 'vaga_cost_over_200':
      return `Custo de IA da vaga ultrapassou o limite (US$ ${b.value} / limite US$ ${b.threshold}).`
    case 'error_rate':
      return `Taxa de erro das chamadas de IA acima do limite (${b.value}% / limite ${b.threshold}%).`
    case 'candidate_cost_over_1':
      return `Custo de IA por candidato ultrapassou o limite (US$ ${b.value} / limite US$ ${b.threshold}).`
    default:
      return `Anomalia de custo de IA detectada (valor ${b.value} / limite ${b.threshold}).`
  }
}
