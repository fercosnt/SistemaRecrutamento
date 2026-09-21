/**
 * candidaturaEncerrada — o predicado canônico de «esta candidatura ACABOU», no front.
 *
 * É o espelho TS da função SQL `public.candidatura_encerrada(etapa, status)` (migration
 * `20260921000001_p48_candidatura_encerrada.sql`, plano 48-01, em PROD):
 *
 *   COALESCE(p_etapa IN ('aprovado','rejeitado'), false)
 *   OR COALESCE(p_status IN ('rejeitado','finalizado'), false)
 *
 * Os dois lados têm de dizer a mesma coisa. Se um mudar, o outro muda junto — a tabela-verdade
 * do SQL está no `p48_candidatura_encerrada_smoke.sql` e os mesmos casos estão no teste deste
 * arquivo (`__tests__/candidaturaEncerrada.test.ts`).
 *
 * POR QUE `etapa` E `status`, e não só a etapa (JORN-26 / D-11): o knockout da inscrição
 * PRESERVA `etapa_atual='inscricao'` por desenho e só move `status` para `rejeitado`; e há
 * linhas legadas com `status='finalizado'` em etapa de trabalho (`triagem`, `entrevista_online`,
 * `decisao_final`). Todo código que decidia «acabou?» olhando só `etapa_atual` errava nesses
 * dois casos — o hub do RH oferecia «Avançar» a uma candidata eliminada, e isso a devolvia ao
 * funil (varredura `48-VARREDURA-ETAPA-ATUAL.md`, C1/C1b/C2).
 *
 * É uma ALLOWLIST de estados terminais, null-safe: valor desconhecido/nulo NÃO encerra.
 * `aprovado_proxima` não encerra — ali há de fato um próximo passo.
 *
 * ⚠ O SERVIDOR É QUEM DECIDE. `rejeitar_candidatura` recusa candidatura encerrada (48-01, D3);
 * este helper só serve para a tela não OFERECER uma ação que não faz sentido. Não use o
 * resultado dele como autorização de nada.
 *
 * @module lib/candidatura/candidaturaEncerrada
 * @see supabase/migrations/20260921000001_p48_candidatura_encerrada.sql (a função SQL espelhada)
 * @see src/components/pages/DashboardCandidatoPage.tsx (origem da regra: o antigo `STATUS_TERMINAIS` local)
 */

/** Etapas que só existem depois de o processo acabar. */
export const ETAPAS_TERMINAIS: ReadonlySet<string> = new Set(['aprovado', 'rejeitado'])

/**
 * Status em que a candidatura acabou, esteja em que etapa estiver — `rejeitado` cobre o
 * knockout (etapa `inscricao`), `finalizado` cobre o legado em etapa de trabalho.
 */
export const STATUS_TERMINAIS: ReadonlySet<string> = new Set(['rejeitado', 'finalizado'])

/**
 * `true` se a candidatura acabou: etapa terminal OU status terminal. Null-safe — `null`/
 * `undefined` em qualquer um dos dois lados conta como «não terminal» naquele lado.
 */
export function candidaturaEncerrada(
  etapa: string | null | undefined,
  status: string | null | undefined,
): boolean {
  return (!!etapa && ETAPAS_TERMINAIS.has(etapa)) || (!!status && STATUS_TERMINAIS.has(status))
}
