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

/** Os 19 campos do cadastro (D-08), na ordem do contrato da EF. */
export const CAMPOS_CADASTRO_RH = [
  'nome_completo',
  'email',
  'cpf',
  'celular',
  'data_nascimento',
  'genero',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'linkedin_url',
  'linkedin',
  'instagram_url',
  'instagram',
  'como_conheceu',
  'como_conheceu_detalhes',
] as const

export type CampoCadastroRh = (typeof CAMPOS_CADASTRO_RH)[number]

/**
 * O cadastro como o candidato preencheu. `null` no tombstone de anonimização; nos registros
 * fictícios `@invalido.local`, `email` vem `null` e o celular segue — texto puro na aba, nunca
 * ação de contato (D-40).
 */
export type DadosCadastroRh = Record<CampoCadastroRh, string | null>

/** Disponibilidade (F12 — valores em caixa mista; a tela aplica os mapas sobre `lower(valor)`). */
export interface DisponibilidadeRh {
  periodo_disponivel: string | null
  regime_trabalho: string | null
  disponibilidade_imediata: boolean | null
  data_disponibilidade: string | null
}

/** O que o candidato respondeu a uma pergunta: só os campos preenchidos. */
export interface ValorRespostaInscricaoRh {
  texto?: string
  opcoes?: string[]
  numero?: number
}

/**
 * Uma pergunta da inscrição com a resposta desta candidatura (D-19), já na `ordem` do
 * formulário. `eliminatoria` é só o selo — a opção que elimina nunca vem. `removida`: a pergunta
 * saiu do formulário depois que o candidato a respondeu.
 */
export interface RespostaInscricaoRh {
  pergunta_id: string
  bloco: string
  ordem: number
  texto_pergunta: string
  tipo_resposta: string
  eliminatoria: boolean
  removida: boolean
  resposta: ValorRespostaInscricaoRh | null
}

/** O que a EF devolve ao hub — a query única do cabeçalho (52-23) e da aba Cadastro (52-10). */
export interface CadastroCandidatoRh {
  vaga_titulo: string | null
  contato: ContatoCandidatoRh | null
  cadastro: DadosCadastroRh | null
  disponibilidade: DisponibilidadeRh | null
  inscricao: RespostaInscricaoRh[]
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

function cadastroValido(v: unknown): v is DadosCadastroRh | null {
  if (v === null) return true
  return ehObjeto(v) && CAMPOS_CADASTRO_RH.every((c) => ehTextoOuNulo(v[c]))
}

function disponibilidadeValida(v: unknown): v is DisponibilidadeRh | null {
  if (v === null) return true
  return (
    ehObjeto(v) &&
    ehTextoOuNulo(v.periodo_disponivel) &&
    ehTextoOuNulo(v.regime_trabalho) &&
    (v.disponibilidade_imediata === null || typeof v.disponibilidade_imediata === 'boolean') &&
    ehTextoOuNulo(v.data_disponibilidade)
  )
}

function valorRespostaValido(v: unknown): v is ValorRespostaInscricaoRh | null {
  if (v === null) return true
  if (!ehObjeto(v)) return false
  const chaves = Object.keys(v)
  if (chaves.length === 0 || chaves.some((k) => k !== 'texto' && k !== 'opcoes' && k !== 'numero')) {
    return false
  }
  if ('texto' in v && typeof v.texto !== 'string') return false
  if ('opcoes' in v && !(Array.isArray(v.opcoes) && v.opcoes.every((o) => typeof o === 'string'))) {
    return false
  }
  if ('numero' in v && !(typeof v.numero === 'number' && Number.isFinite(v.numero))) return false
  return true
}

function itemInscricaoValido(v: unknown): v is RespostaInscricaoRh {
  return (
    ehObjeto(v) &&
    typeof v.pergunta_id === 'string' &&
    typeof v.bloco === 'string' &&
    typeof v.ordem === 'number' &&
    typeof v.texto_pergunta === 'string' &&
    typeof v.tipo_resposta === 'string' &&
    typeof v.eliminatoria === 'boolean' &&
    typeof v.removida === 'boolean' &&
    valorRespostaValido(v.resposta)
  )
}

/** Cópia só com os campos do contrato — nada que a EF mande a mais atravessa para a tela. */
function copiarResposta(r: ValorRespostaInscricaoRh | null): ValorRespostaInscricaoRh | null {
  if (r === null) return null
  const out: ValorRespostaInscricaoRh = {}
  if (r.texto !== undefined) out.texto = r.texto
  if (r.opcoes !== undefined) out.opcoes = [...r.opcoes]
  if (r.numero !== undefined) out.numero = r.numero
  return out
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
 * Lê contato, cadastro, disponibilidade e respostas da inscrição de uma candidatura. Cada
 * chamada escreve uma linha de log no servidor — o hook compartilha UMA chamada entre o
 * cabeçalho e a aba Cadastro.
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

  if (
    !ehTextoOuNulo(data.vaga_titulo) ||
    !contatoValido(data.contato) ||
    !cadastroValido(data.cadastro) ||
    !disponibilidadeValida(data.disponibilidade) ||
    !Array.isArray(data.inscricao) ||
    !data.inscricao.every(itemInscricaoValido)
  ) {
    throw new CadastroCandidatoRhServiceError(MSG_FORMATO, 'SERVER_ERROR')
  }

  const cadastro = data.cadastro
  const disp = data.disponibilidade
  return {
    vaga_titulo: data.vaga_titulo,
    contato: data.contato === null ? null : { email: data.contato.email, celular: data.contato.celular },
    cadastro:
      cadastro === null
        ? null
        : (Object.fromEntries(CAMPOS_CADASTRO_RH.map((c) => [c, cadastro[c]])) as DadosCadastroRh),
    disponibilidade:
      disp === null
        ? null
        : {
            periodo_disponivel: disp.periodo_disponivel,
            regime_trabalho: disp.regime_trabalho,
            disponibilidade_imediata: disp.disponibilidade_imediata,
            data_disponibilidade: disp.data_disponibilidade,
          },
    inscricao: data.inscricao.map((i) => ({
      pergunta_id: i.pergunta_id,
      bloco: i.bloco,
      ordem: i.ordem,
      texto_pergunta: i.texto_pergunta,
      tipo_resposta: i.tipo_resposta,
      eliminatoria: i.eliminatoria,
      removida: i.removida,
      resposta: copiarResposta(i.resposta),
    })),
  }
}
