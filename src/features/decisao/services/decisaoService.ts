/**
 * Decisão service — the RH consolidated-decision data layer (DECISAO-01/02/03).
 *
 * Four operations, all reusing the Phase-10 triagemService idioms:
 *   - `getConsolidacao`  — invokes the `consolidar-decisao-final` EF (read-only
 *     weighted aggregate of already-recorded scores; NEVER re-scores).
 *   - `registrarDecisao` — calls the SECURITY DEFINER `registrar_decisao` RPC, the
 *     SOLE writer of `decisao_final` (`por_usuario := auth.uid()`, the LGPD-02
 *     structural guardrail) + the terminal `avancar_etapa()` transition.
 *   - `listFinalistas`   — ALLOWLIST read of `decisao_final` (candidatura_id, decisao)
 *     to derive the finalist candidaturaIds the embedded Comparativo compares.
 *   - `getDecisaoAtual`  — ALLOWLIST read (decisao, justificativa, em) driving the
 *     append-only "Já existe uma decisão" note.
 *
 * EVERY read names an EXPLICIT column allowlist — NEVER the wildcard projection.
 * RLS is row-level only and does NOT hide columns (Phase-8 LGPD leak lesson,
 * T-15-09). [[reference_select_star_leaks_pii]]
 *
 * The request body for the EF is built from the SHARED `consolidacaoSchema.ts`
 * so the client↔EF contract cannot drift (the Phase-11 SJT integration-contract
 * lesson). [[feedback_integration_contract_gap]]
 *
 * @module features/decisao/services/decisaoService
 * @see src/features/triagem/services/triagemService.ts (error class + EF/RPC invoke analogs)
 * @see supabase/functions/consolidar-decisao-final/index.ts (the EF this invokes)
 * @see supabase/migrations/20260625100001_decisao_final_phase15.sql (the registrar_decisao RPC — AUTHORED-NOT-APPLIED)
 */

import { supabase } from '@/lib/supabase/client'
import {
  ConsolidacaoRequestSchema,
  type ConsolidacaoResponse,
} from '../schemas/consolidacaoSchema'
import type { DecisaoFormValues } from '../schemas/decisaoSchema'

/**
 * Erro do serviço de decisão (espelha TriagemServiceError).
 */
export class DecisaoServiceError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND'
      | 'UNAUTHORIZED',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'DecisaoServiceError'
  }
}

/** Um finalista da vaga (já tem uma row em decisao_final). */
export interface Finalista {
  candidatura_id: string
  decisao: string
}

/** A decisão atual de uma candidatura (allowlist — drives the append-only note). */
export interface DecisaoAtual {
  decisao: string
  justificativa: string
  em: string
}

/**
 * Invoca a EF `consolidar-decisao-final` (DECISAO-01) com `{ candidatura_id, vaga_id }`.
 *
 * O body é validado pelo schema COMPARTILHADO (`ConsolidacaoRequestSchema.strict()`)
 * ANTES do invoke — o mesmo schema que a EF re-declara, então o contrato não pode
 * driftar. Mapeia o erro de transporte / EF para a cópia pt-BR exata do UI-SPEC.
 */
export async function getConsolidacao(
  candidaturaId: string,
  vagaId: string,
): Promise<ConsolidacaoResponse> {
  // Valida no schema compartilhado (.strict(), uuids) — rejeita id ausente/inválido.
  const parsed = ConsolidacaoRequestSchema.safeParse({
    candidatura_id: candidaturaId,
    vaga_id: vagaId,
  })
  if (!parsed.success) {
    throw new DecisaoServiceError(
      'Identificadores da consolidação inválidos.',
      'INVALID_INPUT',
      parsed.error,
    )
  }

  const { data, error } = await supabase.functions.invoke('consolidar-decisao-final', {
    body: parsed.data,
  })

  if (error) {
    throw new DecisaoServiceError(
      'Não foi possível carregar a consolidação. Verifique a conexão e tente novamente.',
      'NETWORK_ERROR',
      error,
    )
  }

  // A EF devolve { ok:false, error_code } em falha de autorização/validação.
  if (data && (data as { ok?: boolean }).ok === false) {
    throw new DecisaoServiceError(
      'Não foi possível carregar a consolidação. Verifique a conexão e tente novamente.',
      'NETWORK_ERROR',
      data,
    )
  }

  return data as ConsolidacaoResponse
}

/**
 * Registra a decisão final (DECISAO-03) via a RPC SECURITY DEFINER `registrar_decisao`.
 *
 * A RPC é a ÚNICA escritora de `decisao_final` (`por_usuario := auth.uid()` — o
 * guardrail estrutural LGPD-02; o INSERT do client é bloqueado por `WITH CHECK
 * (false)`). Ela re-assere `length(justificativa) >= 50` (defense in depth) e
 * dispara a transição terminal `avancar_etapa()`. NUNCA decide por score (RNF-07a).
 *
 * AUTHORED-NOT-APPLIED: a RPC vive na migration `20260625100001_decisao_final_phase15.sql`,
 * aplicada em PROD no Plan 15-06 (que também regenera database.types.ts). Até lá a
 * RPC não consta no tipo `Functions` → cast mínimo `as never` (precedente
 * triagemService updateCandidaturaEtapa). 15-06 limpa o cast após o regen.
 */
export async function registrarDecisao({
  candidaturaId,
  decisao,
  justificativa,
}: {
  candidaturaId: string
  decisao: DecisaoFormValues['decisao']
  justificativa: string
}): Promise<void> {
  if (!candidaturaId) {
    throw new DecisaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  // `registrar_decisao` ainda não está no tipo Functions (AUTHORED-NOT-APPLIED) →
  // cast mínimo até o regen do 15-06.
  const { error } = await supabase.rpc('registrar_decisao' as never, {
    p_candidatura_id: candidaturaId,
    p_decisao: decisao,
    p_justificativa: justificativa,
  } as never)

  if (error) {
    throw new DecisaoServiceError(
      `Não foi possível registrar a decisão: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }
}

/**
 * Lista os finalistas de uma vaga (DECISAO-02) — candidaturas que JÁ têm uma row em
 * `decisao_final`. ALLOWLIST: `candidatura_id, decisao` apenas — NUNCA o wildcard,
 * NUNCA PII. Usado para escopar o Comparativo embutido aos finalistas.
 *
 * O filtro por vaga é via o relacionamento candidatura → vaga (inner join allowlist):
 * `candidaturas!inner(vaga_id)`.
 */
export async function listFinalistas(vagaId: string): Promise<Finalista[]> {
  if (!vagaId) {
    throw new DecisaoServiceError('vagaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('decisao_final')
    .select('candidatura_id, decisao, candidaturas!inner(vaga_id)')
    .eq('candidaturas.vaga_id', vagaId)

  if (error) {
    throw new DecisaoServiceError(
      `Não foi possível carregar os finalistas: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  return (data ?? []).map((raw) => {
    const r = raw as Record<string, unknown>
    return {
      candidatura_id: r.candidatura_id as string,
      decisao: r.decisao as string,
    }
  })
}

/**
 * Lê a decisão atual de uma candidatura (se existir) — ALLOWLIST `decisao,
 * justificativa, em`. Dirige a nota append-only "Já existe uma decisão registrada".
 * NUNCA o wildcard. Retorna null quando ainda não há decisão.
 */
export async function getDecisaoAtual(candidaturaId: string): Promise<DecisaoAtual | null> {
  if (!candidaturaId) {
    throw new DecisaoServiceError('candidaturaId é obrigatório', 'INVALID_INPUT')
  }

  const { data, error } = await supabase
    .from('decisao_final')
    .select('decisao, justificativa, em')
    .eq('candidatura_id', candidaturaId)
    .maybeSingle()

  if (error) {
    throw new DecisaoServiceError(
      `Não foi possível carregar a decisão atual: ${error.message}`,
      'DATABASE_ERROR',
      error,
    )
  }

  if (!data) return null

  return {
    decisao: data.decisao as string,
    justificativa: data.justificativa as string,
    em: data.em as string,
  }
}

/** Namespaced object export (camelCaseService convention). */
export const decisaoService = {
  getConsolidacao,
  registrarDecisao,
  listFinalistas,
  getDecisaoAtual,
}
