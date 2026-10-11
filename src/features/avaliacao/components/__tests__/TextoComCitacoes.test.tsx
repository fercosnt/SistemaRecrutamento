/**
 * 52-12 / D-22, D-52-U08, D-52-U09 — o texto do caso aberto, no hub, com as citações da IA marcadas
 * onde aparecem LITERALMENTE. Espaço em branco pode ser normalizado; caixa e acento nunca. Marca a
 * primeira ocorrência; citações sobrepostas ou encostadas viram um trecho só; as não localizadas
 * ficam ao lado. Sem o texto, nenhuma é localizada — todas ficam ao lado (as citações nunca somem).
 *
 * Invariante 5 (UI-SPEC): a montagem é por segmentos (`string` + `<mark>`), nunca HTML.
 *
 * @see src/features/avaliacao/components/TextoComCitacoes.tsx
 */
import type { ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

// Carregado por glob: antes da implementação o arquivo não existe, e o teste tem de reprovar na
// ASSERÇÃO, não na coleta do arquivo (um import estático falharia na resolução).
const encontrados = import.meta.glob('../TextoComCitacoes.tsx', { eager: true })
const mod = (Object.values(encontrados)[0] ?? {}) as Partial<typeof import('../TextoComCitacoes')>
function localizar(texto: string, citacoes: string[]) {
  expect(mod.localizarCitacoes).toEqual(expect.any(Function))
  return mod.localizarCitacoes!(texto, citacoes)
}
function Texto(props: { texto: string | null; citacoes: string[]; semTexto?: ReactNode }) {
  const C = mod.TextoComCitacoes
  if (!C) throw new Error('TextoComCitacoes não exportado')
  return <C {...props} />
}

describe('localizarCitacoes — casamento literal (52-12 / D-22)', () => {
  it('espaço em branco normalizado: o espaço duplo do texto casa com o espaço simples da citação', () => {
    const texto = 'Eu liguei  para o cliente. Depois…'
    const r = localizar(texto, ['liguei para o cliente'])
    expect(r.naoLocalizadas).toEqual([])
    expect(r.intervalos).toHaveLength(1)
    const [{ inicio, fim }] = r.intervalos
    expect(texto.slice(inicio, fim)).toBe('liguei  para o cliente')
  })

  it('caixa diferente NÃO casa', () => {
    const r = localizar('Eu liguei para o cliente.', ['Liguei para'])
    expect(r.intervalos).toEqual([])
    expect(r.naoLocalizadas).toEqual(['Liguei para'])
  })

  it('acento diferente NÃO casa', () => {
    const r = localizar('a explicação do protocolo', ['explicacao'])
    expect(r.intervalos).toEqual([])
    expect(r.naoLocalizadas).toEqual(['explicacao'])
  })

  it('sobrepostas viram um intervalo só', () => {
    const texto = 'a b c'
    const r = localizar(texto, ['a b', 'b c'])
    expect(r.intervalos).toHaveLength(1)
    expect(texto.slice(r.intervalos[0].inicio, r.intervalos[0].fim)).toBe('a b c')
    expect(r.naoLocalizadas).toEqual([])
  })

  it('encostadas (fim de uma = início da outra) viram um intervalo só', () => {
    const texto = 'abcdef'
    const r = localizar(texto, ['abc', 'def'])
    expect(r.intervalos).toEqual([{ inicio: 0, fim: 6 }])
  })

  it('marca a PRIMEIRA ocorrência', () => {
    const texto = 'sim, sim, sim'
    const r = localizar(texto, ['sim'])
    expect(r.intervalos).toEqual([{ inicio: 0, fim: 3 }])
  })

  it('citação vazia (ou só espaço) é ignorada — não marca o texto inteiro nem vai para a lista', () => {
    const r = localizar('qualquer texto', ['', '   '])
    expect(r.intervalos).toEqual([])
    expect(r.naoLocalizadas).toEqual([])
  })

  it('a quebra de linha do texto conta como espaço em branco', () => {
    const texto = 'Primeiro ouviria.\nDepois explicaria.'
    const r = localizar(texto, ['ouviria. Depois'])
    expect(r.intervalos).toHaveLength(1)
    expect(texto.slice(r.intervalos[0].inicio, r.intervalos[0].fim)).toBe('ouviria.\nDepois')
  })
})

describe('TextoComCitacoes — segmentos, legenda e lista lateral (52-12 / D-22)', () => {
  it('cópia exportada', () => {
    expect(mod.COPY_TEXTO_COM_CITACOES).toEqual({
      legenda: 'Trechos marcados: citados pela análise da IA.',
      naoLocalizadas: 'Citações não localizadas no texto',
    })
  })

  it('1 localizada e 1 não: um <mark> com o trecho, a outra na lista lateral, a legenda antes do texto', () => {
    const { container } = render(
      <Texto texto={'Eu ouviria a paciente.\nDepois explicaria.'} citacoes={['ouviria a paciente', 'algo que não está lá']} />,
    )
    const marcas = container.querySelectorAll('mark')
    expect(marcas).toHaveLength(1)
    expect(marcas[0]).toHaveTextContent('ouviria a paciente')
    expect(marcas[0].className).toBe('rounded-sm bg-[#35BFAD]/30 px-1 text-white')

    const lista = screen.getByTestId('caso-aberto-citacoes-nao-localizadas')
    expect(within(lista).getByText('Citações não localizadas no texto')).toBeInTheDocument()
    expect(within(lista).getByText('algo que não está lá')).toBeInTheDocument()
    expect(within(lista).queryByText('ouviria a paciente')).toBeNull()

    const legenda = screen.getByText('Trechos marcados: citados pela análise da IA.')
    const caixa = screen.getByTestId('caso-aberto-texto')
    // A legenda antecede o texto (UI-SPEC §Acessibilidade).
    expect(legenda.compareDocumentPosition(caixa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(caixa.textContent).toBe('Eu ouviria a paciente.\nDepois explicaria.')
    // Grid de duas colunas só porque há citação não localizada.
    expect(container.querySelector('.md\\:grid-cols-\\[2fr_1fr\\]')).not.toBeNull()
  })

  it('a caixa é neutra e em 16px (sai a âmbar de 12px, D-52-U09)', () => {
    render(<Texto texto="Um texto." citacoes={[]} />)
    const caixa = screen.getByTestId('caso-aberto-texto')
    const classes = caixa.className.split(/\s+/)
    for (const c of [
      'rounded-lg',
      'border',
      'border-white/15',
      'bg-white/5',
      'p-4',
      'text-base',
      'text-white/90',
      'whitespace-pre-line',
    ]) {
      expect(classes).toContain(c)
    }
    expect(caixa.className).not.toMatch(/text-xs|text-amber/)
  })

  it('sem nenhuma não localizada: sem grid e sem lista — o texto ocupa a largura toda', () => {
    const { container } = render(<Texto texto="Eu ouviria a paciente." citacoes={['ouviria']} />)
    expect(screen.queryByTestId('caso-aberto-citacoes-nao-localizadas')).toBeNull()
    expect(container.querySelector('[class*="grid-cols"]')).toBeNull()
    expect(container.querySelectorAll('mark')).toHaveLength(1)
  })

  it('sem citação localizada: sem legenda', () => {
    render(<Texto texto="Eu ouviria a paciente." citacoes={['outra coisa']} />)
    expect(screen.queryByText('Trechos marcados: citados pela análise da IA.')).toBeNull()
  })

  it('texto com <b>x</b> aparece LITERAL, nunca como HTML (T-52-34)', () => {
    const { container } = render(<Texto texto="antes <b>x</b> depois" citacoes={['<b>x</b>']} />)
    expect(container.querySelector('b')).toBeNull()
    expect(screen.getByTestId('caso-aberto-texto').textContent).toBe('antes <b>x</b> depois')
    expect(container.querySelector('mark')).toHaveTextContent('<b>x</b>')
  })

  it('citações sobrepostas viram UM <mark>', () => {
    const { container } = render(<Texto texto="a b c d" citacoes={['a b', 'b c']} />)
    const marcas = container.querySelectorAll('mark')
    expect(marcas).toHaveLength(1)
    expect(marcas[0].textContent).toBe('a b c')
  })

  it('texto nulo, 2 citações e um nó `semTexto`: o nó no lugar do texto, as 2 na lista, zero <mark>, sem legenda', () => {
    const { container } = render(
      <Texto texto={null} citacoes={['primeira', 'segunda']} semTexto={<p>Sem o texto agora.</p>} />,
    )
    expect(screen.getByText('Sem o texto agora.')).toBeInTheDocument()
    expect(screen.queryByTestId('caso-aberto-texto')).toBeNull()
    const lista = screen.getByTestId('caso-aberto-citacoes-nao-localizadas')
    expect(within(lista).getByText('primeira')).toBeInTheDocument()
    expect(within(lista).getByText('segunda')).toBeInTheDocument()
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.queryByText('Trechos marcados: citados pela análise da IA.')).toBeNull()
  })

  it('texto nulo e nenhuma citação: só o nó, sem grid', () => {
    const { container } = render(<Texto texto={null} citacoes={[]} semTexto={<p>Sem o texto agora.</p>} />)
    expect(screen.getByText('Sem o texto agora.')).toBeInTheDocument()
    expect(screen.queryByTestId('caso-aberto-citacoes-nao-localizadas')).toBeNull()
    expect(container.querySelector('[class*="grid-cols"]')).toBeNull()
  })

  it('o arquivo do componente não usa dangerouslySetInnerHTML (Invariante 5)', () => {
    const fonte = readFileSync(resolve(__dirname, '../TextoComCitacoes.tsx'), 'utf8')
    expect(fonte).not.toContain('dangerouslySetInnerHTML')
    expect(fonte).not.toMatch(/innerHTML/)
  })
})
