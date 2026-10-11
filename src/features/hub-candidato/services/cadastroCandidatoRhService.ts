/**
 * cadastroCandidatoRhService — a leitura do contato e do cadastro do candidato pelo hub do RH
 * (Phase 52 / Plan 52-09; JORN-53, JORN-54; D-08..D-11, D-16, D-40).
 *
 * Caminho ÚNICO: `supabase.functions.invoke('ler-cadastro-candidato-rh')` com o JWT do usuário.
 * A EF autoriza pela linha viva de `usuarios_rh` e escreve a linha de log (só ids e papel) — uma
 * leitura direta do cliente liberada por RLS não geraria log nenhum (D-11). Nenhuma tela lê
 * estes dados por outro caminho.
 *
 * Contrato: o serviço valida a forma da resposta antes de entregá-la à tela e, quando ela não
 * bate, lança com MENSAGEM FIXA. `details` carrega só o código de erro e o `error` do invoke —
 * NUNCA o `data`, que pode trazer dado pessoal do candidato.
 *
 * @module features/hub-candidato/services/cadastroCandidatoRhService
 * @see supabase/functions/ler-cadastro-candidato-rh/index.ts (o contrato do servidor)
 * @see src/features/avaliacao/services/scoresRhService.ts (validação sem ecoar valor)
 */
import { supabase } from '@/lib/supabase/client'
import { extractEfErrorCode } from '@/lib/efErrors'

/** Erro do serviço (convenção `camelCaseService.ts`, CLAUDE.md). */
export class CadastroCandidatoRhServiceError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'SERVER_ERROR',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'CadastroCandidatoRhServiceError'
  }
}

/** Contato oferecido no cabeçalho do hub. `null` para registro fictício/anonimizado (D-40). */
export interface ContatoCandidatoRh {
  email: string | null
  celular: string | null
}

/** O que a EF devolve ao hub. */
export interface CadastroCandidatoRh {
  vaga_titulo: string | null
  contato: ContatoCandidatoRh | null
}

const MSG_FALHA = 'Não foi possível carregar os dados do candidato.'
const MSG_FORMATO = 'Dados do candidato em formato inesperado.'

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function ehTextoOuNulo(v: unknown): v is string | null {
  return v === null || typeof v === 'string'
}

function contatoValido(v: unknown): v is ContatoCandidatoRh | null {
  if (v === null) return true
  return ehObjeto(v) && ehTextoOuNulo(v.email) && ehTextoOuNulo(v.celular)
}

/** Código do serviço a partir do `error_code` da EF (só o código; nunca o corpo). */
function codigoDe(errorCode: string | undefined): CadastroCandidatoRhServiceError['code'] {
  switch (errorCode) {
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      return 'UNAUTHORIZED'
    case 'NOT_FOUND':
      return 'NOT_FOUND'
    case 'VALIDATION':
      return 'INVALID_INPUT'
    case 'SERVER_ERROR':
      return 'SERVER_ERROR'
    default:
      return 'NETWORK_ERROR'
  }
}

/**
 * Lê o contato do candidato de uma candidatura (e, a partir da Task 2, o cadastro, a
 * disponibilidade e as respostas da inscrição). Cada chamada escreve uma linha de log no
 * servidor — o hook compartilha UMA chamada entre o cabeçalho e a aba Cadastro.
 *
 * @throws {CadastroCandidatoRhServiceError} INVALID_INPUT (id não-uuid, sem chamar a EF),
 *   UNAUTHORIZED (401/403), NOT_FOUND (404), SERVER_ERROR (500 ou contrato fora da forma),
 *   NETWORK_ERROR (falha de transporte sem código).
 */
export async function lerCadastroCandidatoRh(candidaturaId: string): Promise<CadastroCandidatoRh> {
  if (typeof candidaturaId !== 'string' || !UUID_RE.test(candidaturaId)) {
    throw new CadastroCandidatoRhServiceError('Candidatura inválida.', 'INVALID_INPUT')
  }

  const { data, error } = await supabase.functions.invoke('ler-cadastro-candidato-rh', {
    body: { candidatura_id: candidaturaId },
  })

  if (error) {
    const error_code = await extractEfErrorCode(null, error)
    throw new CadastroCandidatoRhServiceError(MSG_FALHA, codigoDe(error_code), { error_code, raw: error })
  }

  if (!ehObjeto(data) || data.ok !== true) {
    // O corpo pode ser `{ ok:false, error_code }` — só o código atravessa, nunca o `data`.
    const error_code =
      ehObjeto(data) && typeof data.error_code === 'string' ? data.error_code : undefined
    throw new CadastroCandidatoRhServiceError(MSG_FALHA, codigoDe(error_code ?? 'SERVER_ERROR'), {
      error_code,
    })
  }

  if (!ehTextoOuNulo(data.vaga_titulo) || !contatoValido(data.contato)) {
    throw new CadastroCandidatoRhServiceError(MSG_FORMATO, 'SERVER_ERROR')
  }

  return {
    vaga_titulo: data.vaga_titulo,
    contato: data.contato === null ? null : { email: data.contato.email, celular: data.contato.celular },
  }
}
