/**
 * TextoRico — renderiza o subconjunto de Markdown que um descritivo de vaga precisa.
 *
 * ## Por que não `react-markdown`
 *
 * Três razões, em ordem de peso:
 *
 * 1. **Orçamento de chunk.** O projeto tem `assert-chunks` (PERF-03) vigiando o
 *    tamanho do bundle eager. `react-markdown` + `remark-gfm` custam ~50 KB para
 *    entregar um conjunto de recursos muito maior do que o necessário aqui.
 * 2. **Superfície de risco.** Este renderizador **nunca** produz HTML a partir do
 *    texto — ele constrói elementos React a partir de tokens reconhecidos, e
 *    qualquer coisa não reconhecida vira texto literal. Não há `dangerouslySetInnerHTML`
 *    em lugar nenhum, então não existe caminho de XSS mesmo que um dia o conteúdo
 *    passe a vir de fonte menos confiável que o RH.
 * 3. **Contrato fechado é o que o plugin vai emitir.** O gerador de vagas produz
 *    exatamente estas marcas. Um renderizador que aceita mais do que o gerador produz
 *    é superfície que ninguém testa.
 *
 * ## O que ele entende
 *
 * | Marca | Vira |
 * |---|---|
 * | `### Título` | subtítulo de seção |
 * | `- item` ou `* item` | lista com marcador |
 * | `1. item` | lista numerada (respeita o número inicial) |
 * | `**negrito**` | `<strong>` |
 * | linha em branco | novo parágrafo |
 *
 * Tudo o mais é texto literal. Um `**` sem par fecha como texto, não como negrito.
 *
 * ⚠ **Aceita `string` E `string[]`.** O schema declara `text` nos campos de vaga, mas
 * os mocks do repositório passam ARRAY em `responsabilidades`, `diferenciais` e
 * `beneficios` e STRING em `sobre_cargo` — divergência real e anterior a este
 * componente, que o teste `rodapeMontagem` expôs em 2026-08-23.
 */

import { Fragment, type ReactNode } from 'react'

/**
 * Parte o texto em `**negrito**` e `*itálico*` sem nunca gerar HTML.
 *
 * ⚠ A ORDEM da alternância importa e não é estilo: `\*\*[^*]+\*\*` vem ANTES de
 * `\*[^*]+\*` porque a regex alterna da esquerda para a direita e a primeira que
 * casar vence. Invertido, `**negrito**` seria lido como itálico vazio seguido de
 * lixo. Marca órfã (`**` ou `*` sem par) cai fora das duas e fica LITERAL, que é o
 * comportamento seguro: o leitor vê o asterisco em vez de perder o resto do texto
 * dentro de um negrito que nunca fecha.
 */
function comEnfase(linha: string): ReactNode {
  const partes = linha.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
  if (partes.length === 1) return linha

  return partes.map((parte, i) => {
    const forte = parte.match(/^\*\*([^*]+)\*\*$/)
    if (forte) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {forte[1]}
        </strong>
      )
    }
    const enfase = parte.match(/^\*([^*]+)\*$/)
    if (enfase) {
      return (
        <em key={i} className="italic text-slate-600">
          {enfase[1]}
        </em>
      )
    }
    return <Fragment key={i}>{parte}</Fragment>
  })
}

type Bloco =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'numerada'; itens: string[]; inicio: number }

/**
 * Agrupa as linhas em blocos.
 *
 * Linhas consecutivas de lista viram UM bloco de lista — é isso que faz a lista
 * parecer lista, e não uma sequência de parágrafos com hífen na frente.
 */
function emBlocos(bruto: string): Bloco[] {
  const linhas = bruto.replace(/\r\n/g, '\n').split('\n')
  const blocos: Bloco[] = []
  let paragrafo: string[] = []

  const fecharParagrafo = () => {
    const texto = paragrafo.join(' ').trim()
    if (texto) blocos.push({ tipo: 'paragrafo', texto })
    paragrafo = []
  }

  for (const linha of linhas) {
    const t = linha.trim()

    if (!t) {
      fecharParagrafo()
      continue
    }

    const tit = t.match(/^#{2,4}\s+(.*)$/)
    if (tit) {
      fecharParagrafo()
      blocos.push({ tipo: 'titulo', texto: tit[1].trim() })
      continue
    }

    const marcador = t.match(/^[-*]\s+(.*)$/)
    if (marcador) {
      fecharParagrafo()
      const ultimo = blocos[blocos.length - 1]
      if (ultimo && ultimo.tipo === 'lista') ultimo.itens.push(marcador[1].trim())
      else blocos.push({ tipo: 'lista', itens: [marcador[1].trim()] })
      continue
    }

    const numerada = t.match(/^(\d+)[.)]\s+(.*)$/)
    if (numerada) {
      fecharParagrafo()
      const ultimo = blocos[blocos.length - 1]
      if (ultimo && ultimo.tipo === 'numerada') ultimo.itens.push(numerada[2].trim())
      else
        blocos.push({
          tipo: 'numerada',
          itens: [numerada[2].trim()],
          inicio: Number(numerada[1]),
        })
      continue
    }

    paragrafo.push(t)
  }

  fecharParagrafo()
  return blocos
}

export function TextoRico({
  texto,
  className = '',
}: {
  texto: string | string[] | null | undefined
  className?: string
}) {
  const bruto = Array.isArray(texto) ? texto.filter(Boolean).join('\n\n') : (texto ?? '')
  const blocos = emBlocos(bruto)

  if (blocos.length === 0) return null

  return (
    <div className={`max-w-[68ch] space-y-4 ${className}`}>
      {blocos.map((bloco, i) => {
        if (bloco.tipo === 'titulo') {
          return (
            <h4
              key={i}
              className="pt-2 text-base font-bold text-slate-900 first:pt-0"
            >
              {comEnfase(bloco.texto)}
            </h4>
          )
        }

        if (bloco.tipo === 'lista') {
          return (
            <ul key={i} className="list-disc space-y-2 pl-5 marker:text-slate-400">
              {bloco.itens.map((item, j) => (
                <li key={j} className="leading-relaxed text-slate-700">
                  {comEnfase(item)}
                </li>
              ))}
            </ul>
          )
        }

        if (bloco.tipo === 'numerada') {
          return (
            <ol
              key={i}
              start={bloco.inicio}
              className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-slate-500"
            >
              {bloco.itens.map((item, j) => (
                <li key={j} className="leading-relaxed text-slate-700">
                  {comEnfase(item)}
                </li>
              ))}
            </ol>
          )
        }

        return (
          <p key={i} className="leading-relaxed text-slate-700">
            {comEnfase(bloco.texto)}
          </p>
        )
      })}
    </div>
  )
}
