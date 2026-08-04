/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-09 Task 2 (TDD RED) — `FilaPedidosDadosTable` (EXPORT-05).
 *
 * A fila de supervisão dos pedidos de cópia de dados (Art. 18, II), com o prazo do
 * Art. 19, II visível ao RH. Esta suíte assere a TABELA, não a rede: os dois hooks do
 * 44-08 são mockados.
 *
 * ── A ASSERÇÃO QUE CARREGA O SC#4 INTEIRO (bv) ────────────────────────────────────
 * Uma linha NÃO ATENDIDA tem de ser distinguível de uma atendida, e a asserção é sobre o
 * canal **TEXTUAL** — a palavra "Não atendido" DENTRO da `<tr>`. Ela nunca consulta classe
 * de cor, e a proibição é substantiva: uma asserção baseada em `bg-amber-500/5` passaria
 * numa UI que quebrou a regra colorblind-safe, que é exatamente o falso verde que a
 * Invariante 6 existe para impedir. Por isso **nenhum matcher de classe do jest-dom é
 * usado nesta suíte**, e o critério de aceite do plano mede essa ausência por grep — as
 * poucas asserções de classe que existem (scrollport, cabeçalho fixo, truncate) são sobre
 * estrutura de layout, feitas por `className`, e nenhuma delas substitui uma asserção de
 * texto. ⚠ Nem esta nota pode nomear o matcher literalmente: o grep do critério não
 * distingue asserção de comentário, e uma explicação verbatim faria o gate reprovar pelo
 * motivo errado — o mesmo cuidado que o plano exige na sonda da frase jurídica (cd).
 *
 * ── A ARMADILHA JURÍDICA (cd) ─────────────────────────────────────────────────────
 * O tooltip vivo de `/rh/revisoes` nega a existência de prazo, e lá isso é verdade (o
 * Art. 20 não fixa um). Aqui seria afirmação FALSA: o Art. 19, II fixa 15 dias corridos.
 * A sonda de texto-fonte prende as duas metades. Os literais são montados em runtime
 * (idioma 42-11): um teste que proíbe uma string e a contém verbatim é sua própria
 * primeira violação.
 *
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§/rh/pedidos-dados · E6)
 * @see src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx (o idioma de mock)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const useFilaMock = vi.fn()
const useConfigMock = vi.fn()

vi.mock('@/features/pedidos-dados/hooks/useFilaPedidosDados', () => ({
  useFilaPedidosDados: (...args: unknown[]) => useFilaMock(...args),
  // ⚠ A fábrica de chaves é RE-DECLARADA dentro do mock: o hook irmão a importa deste
  // módulo, e sem ela o import quebra em tempo de módulo (idioma do análogo vivo).
  pedidosDadosKeys: {
    all: ['pedidos-dados'] as const,
    lists: () => ['pedidos-dados', 'list'] as const,
    list: (f: unknown) => ['pedidos-dados', 'list', f] as const,
    pendentesCount: () => ['pedidos-dados', 'pendentes-count'] as const,
    configSla: () => ['pedidos-dados', 'config-sla'] as const,
  },
}))

vi.mock('@/features/pedidos-dados/hooks/useConfigSlaDados', () => ({
  useConfigSlaDados: (...args: unknown[]) => useConfigMock(...args),
}))

import { FilaPedidosDadosTable } from '../FilaPedidosDadosTable'
import type { FilaPedidoDadosRow } from '../../services/pedidosDadosService'

const UUID = '55555555-5555-4555-8555-555555555555'

/** Um ISO a `n` dias corridos atrás — as faixas do badge dependem do relógio real. */
function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function linha(over: Partial<FilaPedidoDadosRow> = {}): FilaPedidoDadosRow {
  return {
    id: UUID,
    candidato_id: UUID,
    candidato_nome: 'Ana Souza',
    situacao: 'atendido',
    causa: null,
    solicitado_em: diasAtras(1),
    atendido_em: diasAtras(1),
    ...over,
  }
}

function filaState(over: Record<string, unknown> = {}) {
  return {
    data: [] as FilaPedidoDadosRow[],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isRefetching: false,
    ...over,
  }
}

/** As `<tr>` do corpo — a asserção (bv)/(bw) precisa da LINHA, não do documento. */
function linhasDoCorpo(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('tbody tr'))
}

beforeEach(() => {
  useFilaMock.mockReset()
  useConfigMock.mockReset()
  useFilaMock.mockReturnValue(filaState())
  useConfigMock.mockReturnValue({ data: { diasAtencao: 7, diasAtraso: 12 } })
})

describe('FilaPedidosDadosTable — os DOIS vazios distintos (E6 empty)', () => {
  it('(bs) o vazio da visão completa e o das falhas são textos DIFERENTES', () => {
    const primeira = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    const headingCompleta = screen.getByText('Nenhum pedido de dados registrado')
    expect(headingCompleta).toBeInTheDocument()
    expect(
      screen.getByText(
        'Quando um candidato pedir uma cópia dos próprios dados, o pedido aparece aqui.',
      ),
    ).toBeInTheDocument()
    const textoCompleta = headingCompleta.textContent
    primeira.unmount()

    render(<FilaPedidosDadosTable soNaoAtendidos />)
    const headingFalhas = screen.getByText('Nenhum pedido ficou sem atendimento')
    expect(headingFalhas).toBeInTheDocument()
    expect(
      screen.getByText(
        'Todos os pedidos registrados foram atendidos no mesmo momento em que foram feitos.',
      ),
    ).toBeInTheDocument()

    // O mesmo vazio para os dois estados MENTIRIA: "nenhum registrado" é uma fila que
    // nunca recebeu pedido; "nenhum ficou sem atendimento" é uma boa notícia.
    expect(headingFalhas.textContent).not.toBe(textoCompleta)
  })
})

describe('FilaPedidosDadosTable — carregamento e erro (E6 loading/error)', () => {
  it('(bt) esqueleto no carregamento; e a config em ERRO não aparece na tela', () => {
    useFilaMock.mockReturnValue(filaState({ isLoading: true }))
    useConfigMock.mockReturnValue({ data: undefined, isLoading: true, isError: true })

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)

    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    // Load-bearing: `null` de config já é apresentação completa (faixa degenerada), então
    // nem `isLoading` nem `isError` dela entram na tabela.
    expect(screen.queryByText(/configuração/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Não foi possível carregar a fila de pedidos de dados.'),
    ).not.toBeInTheDocument()
  })

  it('(bt2) com a config em ERRO e a fila resolvida, a tabela renderiza NORMALMENTE', () => {
    useFilaMock.mockReturnValue(filaState({ data: [linha()] }))
    useConfigMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)

    expect(linhasDoCorpo(container)).toHaveLength(1)
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('(bu) erro: copy própria + nova tentativa, e NUNCA a mensagem crua do transporte', () => {
    const CRU = 'PGRST202 permission denied for function listar_pedidos_dados'
    useFilaMock.mockReturnValue(
      filaState({ isError: true, error: new Error(CRU) }),
    )

    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)

    expect(
      screen.getByText('Não foi possível carregar a fila de pedidos de dados.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Verifique sua conexão e tente novamente.')).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
    expect(screen.queryByText(CRU)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('listar_pedidos_dados')
  })
})

describe('FilaPedidosDadosTable — o BACKSTOP do SC#4 (E6 partial)', () => {
  it('(bv) a linha NÃO ATENDIDA carrega a PALAVRA "Não atendido"; a atendida NÃO', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({
            id: 'p-1',
            candidato_nome: 'Ana Souza',
            situacao: 'pendente',
            causa: 'falha_geracao',
            solicitado_em: diasAtras(2),
            atendido_em: null,
          }),
          linha({ id: 'p-2', candidato_nome: 'Bruno Lima' }),
        ],
      }),
    )

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    const linhas = linhasDoCorpo(container)
    expect(linhas).toHaveLength(2)

    const naoAtendida = linhas.find((tr) => (tr.textContent ?? '').includes('Ana Souza'))
    const atendida = linhas.find((tr) => (tr.textContent ?? '').includes('Bruno Lima'))

    // ⚠ TEXTUAL, jamais por classe de cor. É esta linha que prova o SC#4.
    expect(naoAtendida?.textContent).toContain('Não atendido')
    expect(atendida?.textContent).not.toContain('Não atendido')
    expect(atendida?.textContent).toContain('Atendido')
  })

  it('(bw) parcial de dado: causa nula → "Motivo não registrado."; sem nome → "Não identificado"', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({
            id: 'p-1',
            candidato_nome: null,
            situacao: 'pendente',
            causa: null,
            solicitado_em: diasAtras(3),
            atendido_em: null,
          }),
          linha({ id: 'p-2', candidato_nome: 'Bruno Lima' }),
        ],
      }),
    )

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)

    // Contar as linhas junto do texto: uma asserção puramente textual passaria numa
    // implementação que OMITISSE a linha e escrevesse o rótulo em outro lugar.
    expect(linhasDoCorpo(container)).toHaveLength(2)
    expect(screen.getByText('Não identificado')).toBeInTheDocument()
    expect(screen.getByText('Motivo não registrado.')).toBeInTheDocument()
    // Nem UUID como identidade humana, nem travessão no lugar de "Não identificado".
    expect(document.body.textContent).not.toContain(UUID)
    expect(document.body.textContent).not.toContain('p-1')
  })

  it('(bx) os DOIS eixos na mesma linha: "Não atendido" (âmbar) E "Atrasado" (vermelho)', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({
            id: 'p-1',
            candidato_nome: 'Ana Souza',
            situacao: 'pendente',
            causa: 'permissao',
            solicitado_em: diasAtras(30),
            atendido_em: null,
          }),
        ],
      }),
    )

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos />)
    const tr = linhasDoCorpo(container)[0]

    const situacao = screen.getByText('Não atendido')
    const acompanhamento = screen.getByText(/Atrasado/)

    expect(tr.contains(situacao)).toBe(true)
    expect(tr.contains(acompanhamento)).toBe(true)
    // São DOIS textos distintos, em dois eixos distintos. Unificar as cores destruiria
    // a distinção; unificar os textos destruiria a informação.
    expect(situacao.textContent).not.toBe(acompanhamento.textContent)
    expect(situacao).not.toBe(acompanhamento)
  })
})

describe('FilaPedidosDadosTable — a coluna Acompanhamento nas quatro situações (E6 zero-one-many)', () => {
  it('(by1) pendente COM config → a faixa do badge reusado', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({ situacao: 'pendente', causa: null, solicitado_em: diasAtras(0), atendido_em: null }),
        ],
      }),
    )
    render(<FilaPedidosDadosTable soNaoAtendidos />)
    expect(screen.getByText(/Em dia/)).toBeInTheDocument()
  })

  it('(by2) pendente com config `null` → a contagem SEM badge, e a tabela não quebra', () => {
    useConfigMock.mockReturnValue({ data: null, isLoading: false, isError: false })
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({ situacao: 'pendente', causa: null, solicitado_em: diasAtras(4), atendido_em: null }),
        ],
      }),
    )

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos />)

    expect(linhasDoCorpo(container)).toHaveLength(1)
    expect(screen.getByText('4d')).toBeInTheDocument()
    expect(screen.queryByText(/Em dia/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Atrasado/)).not.toBeInTheDocument()
  })

  it('(by3) atendido no MESMO DIA → "Atendido no mesmo dia" (nunca "0d", que leria como bug)', () => {
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ solicitado_em: diasAtras(0), atendido_em: diasAtras(0) })] }),
    )
    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    expect(screen.getByText('Atendido no mesmo dia')).toBeInTheDocument()
    expect(screen.queryByText('Atendido em 0 dias')).not.toBeInTheDocument()
  })

  it('(by4) atendido em 1 dia → o SINGULAR ("1 dias" leria como defeito)', () => {
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ solicitado_em: diasAtras(1), atendido_em: diasAtras(0) })] }),
    )
    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    expect(screen.getByText('Atendido em 1 dia')).toBeInTheDocument()
  })

  it('(by5) atendido em 3 dias → o plural', () => {
    useFilaMock.mockReturnValue(
      filaState({ data: [linha({ solicitado_em: diasAtras(3), atendido_em: diasAtras(0) })] }),
    )
    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    expect(screen.getByText('Atendido em 3 dias')).toBeInTheDocument()
  })
})

describe('FilaPedidosDadosTable — a Invariante 5 em forma executável', () => {
  it('(bz) ZERO elemento acionável dentro da tabela: nenhum controle, nenhum link', () => {
    useFilaMock.mockReturnValue(
      filaState({
        data: [
          linha({ id: 'p-1', situacao: 'pendente', causa: 'curriculo_ausente', atendido_em: null }),
          linha({ id: 'p-2', candidato_nome: 'Bruno Lima' }),
        ],
      }),
    )

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    const tabela = container.querySelector('table')

    expect(tabela).not.toBeNull()
    expect(tabela?.querySelectorAll('button')).toHaveLength(0)
    expect(tabela?.querySelectorAll('a')).toHaveLength(0)
    expect(tabela?.querySelectorAll('[role="button"]')).toHaveLength(0)
    // E nenhum caminho de download em lugar nenhum da tela (2ª superfície de exfiltração).
    expect(container.querySelectorAll('[download]')).toHaveLength(0)
  })
})

describe('FilaPedidosDadosTable — o corte do servidor (E6 overflow)', () => {
  function muitas(n: number): FilaPedidoDadosRow[] {
    return Array.from({ length: n }, (_, i) => linha({ id: `p-${i}` }))
  }

  it('(ca1) com 199 linhas o aviso de corte NÃO aparece — abaixo do cap a fila está completa', () => {
    useFilaMock.mockReturnValue(filaState({ data: muitas(199) }))
    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    expect(screen.queryByText(/Mostrando 200 pedidos/)).not.toBeInTheDocument()
  })

  it('(ca2) com 200 linhas o aviso aparece, e ele é honesto sobre o que ficou de fora', () => {
    useFilaMock.mockReturnValue(filaState({ data: muitas(200) }))
    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    expect(
      screen.getByText(
        'Mostrando 200 pedidos. Todos os não atendidos aparecem; os atendidos mais antigos podem ter ficado de fora.',
      ),
    ).toBeInTheDocument()
  })

  it('(cb) scrollport `max-h-[70vh]` e cabeçalho fixo nas CÉLULAS, nas cinco colunas', () => {
    useFilaMock.mockReturnValue(filaState({ data: [linha()] }))
    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)

    const scrollport = container.querySelector('[data-slot="table-container"]')?.parentElement
    expect(scrollport?.className ?? '').toContain('max-h-[70vh]')

    const cabecalhos = Array.from(container.querySelectorAll('th'))
    expect(cabecalhos).toHaveLength(5)
    for (const th of cabecalhos) {
      // Com `border-collapse` do preflight, sticky em `<thead>` não gruda — vai na célula.
      expect(th.className).toContain('sticky')
      expect(th.className).toContain('top-0')
    }
  })
})

describe('FilaPedidosDadosTable — texto livre e a armadilha jurídica', () => {
  it('(cc) nome longo TRUNCA e carrega o valor íntegro em `title` — o par obrigatório', () => {
    const NOME = 'Maria Aparecida da Conceição Nascimento Rodrigues de Albuquerque Filha'
    useFilaMock.mockReturnValue(filaState({ data: [linha({ candidato_nome: NOME })] }))

    const { container } = render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    const celula = container.querySelector('tbody tr td') as HTMLElement

    expect(celula.textContent).toBe(NOME)
    expect(celula.className).toContain('truncate')
    expect(celula.className).toContain('max-w-[220px]')
    // `truncate` sozinho apaga informação sem oferecer como recuperá-la.
    expect(celula.getAttribute('title')).toBe(NOME)
  })

  it('(cd) sonda de texto-fonte: o teto CERTO está escrito e a frase da fila gêmea NÃO', () => {
    // ⚠ Caminho ancorado em `process.cwd()`, NÃO em `import.meta.url`. Sob o ambiente
    // `happy-dom` deste projeto o `URL` global reescreve a base para a origem do
    // documento (`http://localhost:3000/…`), e `fileURLToPath` rejeita o que não é
    // `file:` — medido diretamente. O `cwd` da suíte é a raiz do repositório, e um cwd
    // errado faria o `readFileSync` LANÇAR, nunca passar em silêncio.
    const fonte = readFileSync(
      join(process.cwd(), 'src/features/pedidos-dados/components/FilaPedidosDadosTable.tsx'),
      'utf8',
    )

    // Literais montados em runtime — ver o docblock deste arquivo.
    const negaPrazo = ['não', 'fixa', 'prazo'].join(' ')
    const tetoCorreto = ['15', 'dias', 'corridos'].join(' ')

    expect(fonte).not.toContain(negaPrazo)
    expect(fonte).toContain(tetoCorreto)
    // E o teto aparece na TELA, não só no arquivo.
    useFilaMock.mockReturnValue(filaState({ data: [linha()] }))
    render(<FilaPedidosDadosTable soNaoAtendidos={false} />)
    expect(document.body.textContent).toContain(tetoCorreto)
  })
})
