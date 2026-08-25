/**
 * Conversão entre a pergunta como a TELA a edita e como o BANCO a guarda.
 *
 * Os dois modelos divergem em quatro pontos, e cada um já foi (ou seria) um
 * defeito silencioso:
 *
 *  1. TIPO — a tela usa kebab-case ('unica-escolha'), o enum do banco usa
 *     snake_case ('single_choice'). Sem tradução, o INSERT falha no enum.
 *  2. OPÇÕES — a tela guarda uma string separada por ';', o banco guarda um
 *     array jsonb. Uma opção que CONTENHA ';' se parte em duas na ida e nunca
 *     mais volta ao original.
 *  3. BLOCO — CHECK fechado no banco (jornada | tecnologia | valores |
 *     curriculo) que a tela não expõe. Se não for preservado no round-trip, uma
 *     pergunta de `jornada` volta como `curriculo` só por ter passado pela tela.
 *  4. ORDEM — CHECK `>= 1` no banco; a tela conhece só a posição no array.
 *
 * @module features/config-vaga/perguntaMapper
 */
import type { PerguntaVaga, BlocoPergunta } from './services/configVagaService'
import type { Database } from '../../../database.types'

type TipoRespostaDb = Database['public']['Enums']['tipo_resposta_pergunta']

export type TipoPerguntaUi =
  | 'unica-escolha'
  | 'multipla-escolha'
  | 'texto-curto'
  | 'texto-longo'
  | 'numerico'

export interface PerguntaUi {
  id: string
  pergunta: string
  ajuda: string
  tipo: TipoPerguntaUi
  opcoes?: string
  dbId?: string | null
  bloco?: BlocoPergunta
  obrigatoria?: boolean
  limiteCaracteres?: number | null
}

/** `valores` é a aba Cultura; os outros três blocos são a aba Triagem. */
export const BLOCO_CULTURA: BlocoPergunta = 'valores'
export const BLOCO_TRIAGEM_PADRAO: BlocoPergunta = 'curriculo'

export const TIPO_UI_PARA_DB: Record<TipoPerguntaUi, TipoRespostaDb> = {
  'unica-escolha': 'single_choice',
  'multipla-escolha': 'multiple_choice',
  'texto-curto': 'texto_curto',
  'texto-longo': 'texto_longo',
  numerico: 'numerico',
}

export const TIPO_DB_PARA_UI: Record<TipoRespostaDb, TipoPerguntaUi> = {
  single_choice: 'unica-escolha',
  multiple_choice: 'multipla-escolha',
  texto_curto: 'texto-curto',
  texto_longo: 'texto-longo',
  numerico: 'numerico',
}

/** Banco → tela. */
export function perguntaDbParaUi(p: PerguntaVaga): PerguntaUi {
  return {
    id: p.id ?? `pergunta-${p.ordem}`,
    dbId: p.id,
    bloco: p.bloco,
    pergunta: p.texto_pergunta,
    ajuda: p.texto_ajuda ?? '',
    tipo: TIPO_DB_PARA_UI[p.tipo_resposta],
    opcoes: (p.opcoes_resposta ?? []).join('; '),
    obrigatoria: p.obrigatoria,
    limiteCaracteres: p.limite_caracteres,
  }
}

/**
 * Tela → banco. `ordem` vem da POSIÇÃO, contando de 1 — é a ordem em que o
 * candidato responde, e o CHECK do banco exige >= 1.
 */
export function perguntaUiParaDb(
  p: PerguntaUi,
  ordem: number,
  blocoPadrao: BlocoPergunta
): PerguntaVaga {
  const tipo = TIPO_UI_PARA_DB[p.tipo]
  const ehChoice = tipo === 'single_choice' || tipo === 'multiple_choice'
  const opcoes = (p.opcoes ?? '')
    .split(';')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)

  return {
    id: p.dbId ?? null,
    bloco: p.bloco ?? blocoPadrao,
    ordem,
    texto_pergunta: p.pergunta.trim(),
    texto_ajuda: p.ajuda.trim() || null,
    tipo_resposta: tipo,
    // CHECK `opcoes_obrigatorias_check`: os dois *_choice exigem array não-vazio.
    opcoes_resposta: ehChoice ? opcoes : null,
    obrigatoria: p.obrigatoria ?? true,
    limite_caracteres: tipo === 'texto_curto' ? (p.limiteCaracteres ?? 500) : null,
  }
}

/**
 * Monta a lista a gravar a partir das duas abas. Triagem primeiro, Cultura
 * depois; perguntas sem enunciado são descartadas (a tela cria a linha vazia no
 * clique de "adicionar", e uma linha nunca preenchida não deve virar registro).
 */
export function montarPerguntasParaSalvar(
  triagem: PerguntaUi[],
  cultura: PerguntaUi[]
): PerguntaVaga[] {
  return [
    ...triagem.map((p, i) => perguntaUiParaDb(p, i + 1, BLOCO_TRIAGEM_PADRAO)),
    ...cultura.map((p, i) =>
      perguntaUiParaDb(p, triagem.length + i + 1, BLOCO_CULTURA)
    ),
  ].filter((p) => p.texto_pergunta.length > 0)
}
