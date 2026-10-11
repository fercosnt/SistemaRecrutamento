/**
 * TextoComCitacoes — 52-12 / D-22, D-52-U08, D-52-U09: o texto do caso aberto, no hub do RH, com as
 * citações da análise da IA marcadas ONDE aparecem literalmente.
 *
 * Citação localizada = ocorrência literal no texto. Espaço em branco (inclusive quebra de linha) é
 * normalizado nos dois lados; caixa e acento NUNCA — casamento aproximado atribuiria à IA um trecho
 * que ela não citou (T-52-35). Marca a primeira ocorrência; intervalos sobrepostos ou encostados
 * viram um trecho só. Citação vazia é ignorada (não marca o texto inteiro).
 *
 * As não localizadas ficam AO LADO, como antes (D-22): com ao menos uma, grade texto | lista a
 * partir de `md:`, empilhada no celular; sem nenhuma, o texto ocupa a largura toda. Sem o texto
 * (`texto` nulo), nenhuma citação pode ser localizada — TODAS vão para a lista, e o lugar do texto
 * mostra o nó `semTexto`. As citações nunca somem do card por falta do texto.
 *
 * Invariante 5 (UI-SPEC): a montagem é por SEGMENTOS — nós de texto React e `<mark>` construídos
 * pelo React. Nunca HTML injetado, nunca markdown em runtime (T-52-34).
 *
 * @module features/avaliacao/components/TextoComCitacoes
 */
import type { ReactNode } from 'react'

export const COPY_TEXTO_COM_CITACOES = {
  legenda: 'Trechos marcados: citados pela análise da IA.',
  naoLocalizadas: 'Citações não localizadas no texto',
} as const

export interface IntervaloCitacao {
  /** Índice no texto ORIGINAL (inclusivo). */
  inicio: number
  /** Índice no texto ORIGINAL (exclusivo). */
  fim: number
}

export interface CitacoesLocalizadas {
  intervalos: IntervaloCitacao[]
  naoLocalizadas: string[]
}

const ESPACO = /\s/

/**
 * O texto com cada sequência de espaço em branco reduzida a um espaço, e o mapa de cada caractere
 * normalizado para o trecho do original que ele representa.
 */
function normalizarComMapa(texto: string): { norm: string; inicio: number[]; fim: number[] } {
  let norm = ''
  const inicio: number[] = []
  const fim: number[] = []
  let i = 0
  while (i < texto.length) {
    if (ESPACO.test(texto[i])) {
      let j = i
      while (j < texto.length && ESPACO.test(texto[j])) j += 1
      norm += ' '
      inicio.push(i)
      fim.push(j)
      i = j
    } else {
      norm += texto[i]
      inicio.push(i)
      fim.push(i + 1)
      i += 1
    }
  }
  return { norm, inicio, fim }
}

function normalizarCitacao(citacao: string): string {
  return citacao.replace(/\s+/g, ' ').trim()
}

/**
 * Localiza cada citação no texto (pura). Devolve os intervalos no texto ORIGINAL, ordenados e
 * fundidos (sobrepostos ou encostados viram um), e as citações não localizadas na ordem recebida.
 */
export function localizarCitacoes(texto: string, citacoes: string[]): CitacoesLocalizadas {
  const { norm, inicio, fim } = normalizarComMapa(texto)
  const brutos: IntervaloCitacao[] = []
  const naoLocalizadas: string[] = []

  for (const citacao of citacoes) {
    const alvo = normalizarCitacao(citacao)
    if (alvo === '') continue
    const pos = norm.indexOf(alvo)
    if (pos === -1) {
      naoLocalizadas.push(citacao)
      continue
    }
    brutos.push({ inicio: inicio[pos], fim: fim[pos + alvo.length - 1] })
  }

  brutos.sort((a, b) => a.inicio - b.inicio || a.fim - b.fim)
  const intervalos: IntervaloCitacao[] = []
  for (const atual of brutos) {
    const ultimo = intervalos[intervalos.length - 1]
    if (ultimo && atual.inicio <= ultimo.fim) {
      ultimo.fim = Math.max(ultimo.fim, atual.fim)
    } else {
      intervalos.push({ ...atual })
    }
  }
  return { intervalos, naoLocalizadas }
}

/** Os segmentos do texto: trechos soltos como nó de texto, os citados dentro de `<mark>`. */
function segmentos(texto: string, intervalos: IntervaloCitacao[]): ReactNode[] {
  const partes: ReactNode[] = []
  let cursor = 0
  intervalos.forEach(({ inicio, fim }, i) => {
    if (inicio > cursor) partes.push(texto.slice(cursor, inicio))
    partes.push(
      <mark key={`m-${i}`} className="rounded-sm bg-[#35BFAD]/30 px-1 text-white">
        {texto.slice(inicio, fim)}
      </mark>,
    )
    cursor = fim
  })
  if (cursor < texto.length) partes.push(texto.slice(cursor))
  return partes
}

export interface TextoComCitacoesProps {
  /** O texto do candidato; `null` quando ele não existe ou ainda não chegou. */
  texto: string | null
  /** As citações da análise da IA, como texto. */
  citacoes: string[]
  /** O que ocupa o lugar do texto quando ele não existe (frase de estado). */
  semTexto?: ReactNode
}

export function TextoComCitacoes({ texto, citacoes, semTexto = null }: TextoComCitacoesProps) {
  const validas = citacoes.filter((c) => c.trim() !== '')
  const { intervalos, naoLocalizadas } = texto
    ? localizarCitacoes(texto, validas)
    : { intervalos: [] as IntervaloCitacao[], naoLocalizadas: validas }

  const corpo = (
    <div className="min-w-0 space-y-2">
      {intervalos.length > 0 ? (
        <p className="text-sm text-white/70">{COPY_TEXTO_COM_CITACOES.legenda}</p>
      ) : null}
      {texto ? (
        <p
          data-testid="caso-aberto-texto"
          className="whitespace-pre-line break-words rounded-lg border border-white/15 bg-white/5 p-4 text-base leading-relaxed text-white/90"
        >
          {segmentos(texto, intervalos)}
        </p>
      ) : (
        semTexto
      )}
    </div>
  )

  if (naoLocalizadas.length === 0) return corpo

  return (
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      {corpo}
      <div data-testid="caso-aberto-citacoes-nao-localizadas" className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-white/70">{COPY_TEXTO_COM_CITACOES.naoLocalizadas}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
          {naoLocalizadas.map((c, i) => (
            <li key={i} className="break-words text-white/70">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
