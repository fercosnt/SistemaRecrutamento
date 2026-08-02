/**
 * privacidadeService — a camada de dados de `/candidato/privacidade` (CONSENT-04 / RETEN-03).
 *
 * ⚠ ESQUELETO RED (Task 1 do plano 43-08). As funções abaixo têm a assinatura final e
 * lançam de propósito: o ciclo TDD desta task exige um commit em que a suíte de
 * `ConsentimentoSwitchRow` REPROVA. A implementação chega no commit GREEN seguinte.
 *
 * O RED é expresso como falha de RUNTIME e não de compilação — idioma estabelecido pela
 * deviação 5 do plano 43-03: o hook de pre-commit conta erros de `tsc` sobre o
 * repositório inteiro contra uma baseline congelada (97) e `--no-verify` é proibido
 * nesta fase, então um RED que não compilasse tornaria o próprio commit RED impossível
 * de fazer honestamente.
 *
 * @module features/privacidade/services/privacidadeService
 */

/** Erro de serviço no padrão `camelCaseService.ts` (CLAUDE.md). */
export class PrivacidadeError extends Error {
  constructor(
    message: string,
    public code:
      | 'INVALID_INPUT'
      | 'NETWORK_ERROR'
      | 'DATABASE_ERROR'
      | 'FORBIDDEN'
      | 'NOT_FOUND',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'PrivacidadeError'
  }
}

/**
 * Allowlist EXPLÍCITA e NOMEADA das 7 colunas que o navegador do candidato pode ver.
 * NUNCA `select('*')`: RLS é row-level e não filtra coluna, e `ip_aceite` /
 * `user_agent_aceite` moram nesta mesma tabela ([[reference_select_star_leaks_pii]]).
 */
export const AUTORIZACOES_ALLOWLIST =
  'id, autorizacao_uso_dados, autorizacao_marketing_vagas, autorizacao_retencao_curriculo, consent_text_version, created_at, updated_at'

/** Allowlist da leitura de candidatura usada só para saber se HÁ currículo guardado. */
export const CANDIDATURA_CURRICULO_ALLOWLIST = 'id, curriculo_url, created_at'

/** A linha de autorizações que atravessa para a tela — sem nenhuma coluna de PII de aceite. */
export interface AutorizacoesCandidato {
  id: string
  autorizacao_uso_dados: boolean
  autorizacao_marketing_vagas: boolean | null
  autorizacao_retencao_curriculo: boolean
  consent_text_version: string | null
  created_at: string
  updated_at: string
}

/** O que a seção "O que guardamos e por quê" precisa saber sobre o currículo. */
export interface GuardaCurriculo {
  temCurriculo: boolean
}

const NAO_IMPLEMENTADO = 'RED do 43-08: implementação chega no commit GREEN.'

export async function obterAutorizacoes(
  candidatoId: string,
): Promise<AutorizacoesCandidato | null> {
  throw new PrivacidadeError(NAO_IMPLEMENTADO, 'DATABASE_ERROR', { candidatoId })
}

export async function revogarMarketing(
  idAutorizacao: string,
  novoValor: boolean,
): Promise<AutorizacoesCandidato> {
  throw new PrivacidadeError(NAO_IMPLEMENTADO, 'DATABASE_ERROR', {
    idAutorizacao,
    novoValor,
  })
}

export async function obterGuardaCurriculo(
  candidatoId: string,
): Promise<GuardaCurriculo> {
  throw new PrivacidadeError(NAO_IMPLEMENTADO, 'DATABASE_ERROR', { candidatoId })
}

/** Export nomeado do namespace (convenção `camelCaseService`). */
export const privacidadeService = {
  obterAutorizacoes,
  revogarMarketing,
  obterGuardaCurriculo,
}
