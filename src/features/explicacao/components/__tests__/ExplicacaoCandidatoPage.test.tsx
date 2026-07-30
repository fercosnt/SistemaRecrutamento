/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 42 / Plano 42-11 Task 2 — o bloco de resultado da revisão Art. 20 na superfície
 * do CANDIDATO (REVISAO-04).
 *
 * REVISAO-04 tem duas metades: a notificação (plano 42-08) e a exibição. Esta suíte é
 * sobre a exibição — quem pediu a revisão passa a **ver** a resposta no painel, não
 * apenas a receber um e-mail.
 *
 * Três coisas aqui não são teste de aparência, são teste de invariante:
 *
 *  1. **Não-regressão.** Com a revisão sem resposta, a página é equivalente à de hoje.
 *     Um bloco novo que aparece cedo é pior que um bloco que falta: afirmaria resposta
 *     onde não há.
 *  2. **A justificativa é renderizada ÍNTEGRA.** Truncá-la esvaziaria o próprio direito
 *     que o Art. 20 concede — daí a asserção de 3000 caracteres e a proibição de classe
 *     de truncamento/altura máxima/rolagem interna no corpo (E5 da 42-UI-SPEC).
 *  3. **O acompanhamento interno do RH nunca alcança esta tela** (invariante 1 da
 *     42-UI-SPEC / D-P42-03) — nem em texto, nem em `title`, nem em `aria-label`. O
 *     Art. 20 não fixa prazo, então qualquer contagem/faixa/rótulo de atraso aqui seria
 *     uma promessa de prazo que o sistema não tem. A asserção varre os ATRIBUTOS, não só
 *     o texto visível: foi exatamente um atributo invisível (o preheader do W-01 da P39)
 *     que passou por asserções que olhavam só o texto.
 *
 * O hook é mockado (a camada de dados tem suíte própria em
 * `services/__tests__/explicacaoService.test.ts`); o `SolicitarRevisaoCTA` REAL é
 * renderizado de propósito, para que a asserção negativa cubra a superfície inteira do
 * candidato e não só o bloco novo.
 *
 * @see .planning/phases/42-invent-rio-gates-fila-art-20/42-UI-SPEC.md (§Superfície do candidato — REVISAO-04)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

const CAND_ID = '11111111-1111-4111-8111-111111111111'

const explicacaoMock = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: CAND_ID }),
}))

vi.mock('@/components/BackgroundImage', () => ({
  BackgroundImage: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../hooks/useExplicacao', () => ({
  useExplicacao: () => explicacaoMock(),
  useSolicitarRevisao: () => ({ mutate: vi.fn(), isPending: false }),
}))

import { ExplicacaoCandidatoPage } from '../ExplicacaoCandidatoPage'

/** Copy verbatim da 42-UI-SPEC §Superfície do candidato — REVISAO-04. */
const COPY_SPEC = {
  eyebrow: 'Resultado da revisão',
  mantida: 'Após a revisão, a decisão foi mantida.',
  revertida: 'Após a revisão, a decisão anterior foi revista.',
  data: 'Respondida em 28/07/2026',
} as const

const JUSTIFICATIVA =
  'Reexaminamos o conjunto do processo seletivo, etapa por etapa, e a base desta resposta.'

/** Uma explicação alcançável (decisão rejeitada), com o ciclo da revisão sobrescrevível. */
function explicacao(over: Record<string, unknown> = {}) {
  return {
    decisao: 'rejeitado',
    reason: 'Avaliamos seu processo de forma global e decidimos não seguir adiante.',
    revisao_solicitada_em: '2026-07-20T10:00:00Z',
    revisao_resultado: null,
    explicacao_solicitada_em: '2026-07-19T09:00:00Z',
    revisao_veredito: null,
    revisao_respondida_em: null,
    ...over,
  }
}

function carregada(over: Record<string, unknown> = {}) {
  explicacaoMock.mockReturnValue({
    data: explicacao(over),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })
}

beforeEach(() => {
  explicacaoMock.mockReset()
})

describe('ExplicacaoCandidatoPage — não-regressão: sem resposta, nada de bloco novo', () => {
  it('revisão pedida e ainda SEM resposta → nenhum bloco de resultado aparece', () => {
    carregada()
    render(<ExplicacaoCandidatoPage />)
    expect(screen.queryByText(COPY_SPEC.eyebrow)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY_SPEC.mantida)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY_SPEC.revertida)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Respondida em/)).not.toBeInTheDocument()
  })

  it('o que a página já mostrava hoje sobre a decisão original continua intocado', () => {
    carregada()
    render(<ExplicacaoCandidatoPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sobre a sua candidatura' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Após avaliarmos seu processo, decidimos não seguir com a sua candidatura nesta vaga.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Por que esta decisão')).toBeInTheDocument()
    expect(
      screen.getByText('Agradecemos seu interesse e o tempo dedicado ao processo.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Você tem o direito de solicitar a revisão desta decisão por uma pessoa natural (LGPD, Art. 20).',
      ),
    ).toBeInTheDocument()
  })
})

describe('ExplicacaoCandidatoPage — o bloco de resultado, byte a byte com a UI-SPEC', () => {
  it('veredito `mantida` → rótulo, linha de veredito, data e justificativa', () => {
    carregada({
      revisao_veredito: 'mantida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText(COPY_SPEC.eyebrow)).toBeInTheDocument()
    expect(screen.getByText(COPY_SPEC.mantida)).toBeInTheDocument()
    expect(screen.getByText(COPY_SPEC.data)).toBeInTheDocument()
    expect(screen.getByText(JUSTIFICATIVA)).toBeInTheDocument()
  })

  it('veredito `revertida` → a linha informa que a decisão anterior foi revista', () => {
    carregada({
      revisao_veredito: 'revertida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText(COPY_SPEC.revertida)).toBeInTheDocument()
    expect(screen.queryByText(COPY_SPEC.mantida)).not.toBeInTheDocument()
    // Estrutura idêntica: só a linha do veredito muda.
    expect(screen.getByText(COPY_SPEC.eyebrow)).toBeInTheDocument()
    expect(screen.getByText(COPY_SPEC.data)).toBeInTheDocument()
    expect(screen.getByText(JUSTIFICATIVA)).toBeInTheDocument()
  })

  it('a linha do veredito é a âncora do bloco: 16px, com o veredito em peso 600', () => {
    carregada({
      revisao_veredito: 'mantida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    render(<ExplicacaoCandidatoPage />)
    const linha = screen.getByText(COPY_SPEC.mantida)
    expect(linha.className).toContain('text-base')
    expect(linha.className).toContain('leading-relaxed')
    // A subordinação do rótulo é por COR e CAIXA, nunca por tamanho — o rótulo fica no
    // papel de label de 14px já declarado (a 42-UI-SPEC eliminou o papel de 12px).
    const rotulo = screen.getByText(COPY_SPEC.eyebrow)
    expect(rotulo.className).toContain('text-sm')
    expect(rotulo.className).toContain('uppercase')
    expect(rotulo.className).not.toContain('text-xs')
  })

  it('veredito desconhecido (fora do vocabulário) NÃO abre o bloco nem ecoa o valor', () => {
    // O service já normaliza para null; se um dia parar de normalizar, a página não pode
    // ser o lugar onde um token cru do servidor aparece ao candidato.
    carregada({
      revisao_veredito: null,
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(screen.queryByText(COPY_SPEC.mantida)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY_SPEC.revertida)).not.toBeInTheDocument()
    // A justificativa e a data seguem visíveis: há resposta, o que falta é o rótulo dela.
    expect(container.textContent).toContain(JUSTIFICATIVA)
    expect(container.textContent).toContain('Respondida em 28/07/2026')
  })
})

describe('ExplicacaoCandidatoPage — a justificativa é leitura de carga (E5)', () => {
  const LONGA = 'Reexame detalhado do processo. '.repeat(100).slice(0, 3000)

  it('3000 caracteres aparecem ÍNTEGROS no DOM', () => {
    expect(LONGA).toHaveLength(3000)
    carregada({
      revisao_veredito: 'mantida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: LONGA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(container.textContent).toContain(LONGA)
  })

  it('o corpo não carrega truncamento, altura máxima nem rolagem interna', () => {
    carregada({
      revisao_veredito: 'mantida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: LONGA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    const corpo = container.querySelector('[data-corpo-revisao]')
    expect(corpo).not.toBeNull()
    // Sobe do corpo até a raiz: nenhum ancestral pode cortar o texto por baixo.
    for (let el: Element | null = corpo; el; el = el.parentElement) {
      expect(el.className.toString()).not.toMatch(
        /truncate|line-clamp|text-ellipsis|max-h-|overflow-(hidden|y-auto|y-scroll|auto|scroll)/,
      )
    }
  })

  it('preserva as quebras de linha escritas por quem revisou', () => {
    const comQuebras = 'Primeiro ponto reexaminado.\n\nSegundo ponto reexaminado.'
    carregada({
      revisao_veredito: 'revertida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: comQuebras,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    const corpo = container.querySelector('[data-corpo-revisao]')
    expect(corpo?.className.toString()).toContain('whitespace-pre-wrap')
    expect(corpo?.textContent).toBe(comQuebras)
  })
})

describe('ExplicacaoCandidatoPage — o acompanhamento interno do RH nunca chega aqui', () => {
  /** Vocabulário do lado do RH (42-09) que é PROIBIDO nesta superfície (D-P42-03). */
  const PROIBIDO: readonly RegExp[] = [
    /dias em espera/i,
    /acompanhament/i,
    /\bem dia\b/i,
    /atrasad/i,
    /\batenção ·/i,
    /faixa/i,
    /\bsla\b/i,
    /prazo/i,
    /\d+\s*dias?\b/i,
    /\bd\b\s*$/,
  ]

  function surfaceStrings(html: string, root: Element): string[] {
    const attrs = Array.from(root.querySelectorAll('[title], [aria-label]')).flatMap((el) => [
      el.getAttribute('title') ?? '',
      el.getAttribute('aria-label') ?? '',
    ])
    return [html, ...attrs]
  }

  it.each([
    ['sem resposta', {}],
    [
      'mantida',
      {
        revisao_veredito: 'mantida',
        revisao_respondida_em: '2026-07-28T14:30:00Z',
        revisao_resultado: JUSTIFICATIVA,
      },
    ],
    [
      'revertida',
      {
        revisao_veredito: 'revertida',
        revisao_respondida_em: '2026-07-28T14:30:00Z',
        revisao_resultado: JUSTIFICATIVA,
      },
    ],
  ])(
    'estado "%s": nenhum vestígio de contagem, faixa ou atraso — nem em title/aria-label',
    (_nome, over) => {
      carregada(over)
      const { container } = render(<ExplicacaoCandidatoPage />)
      for (const alvo of surfaceStrings(container.innerHTML, container)) {
        for (const padrao of PROIBIDO) {
          expect(alvo).not.toMatch(padrao)
        }
      }
    },
  )

  it('nenhuma cor de faixa (verde/âmbar/vermelho) entra nesta superfície', () => {
    carregada({
      revisao_veredito: 'revertida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    for (const cor of ['emerald', 'yellow', 'amber', 'red-']) {
      expect(container.innerHTML).not.toContain(cor)
    }
  })

  it('a identidade de quem revisou não aparece — nem como nome, nem como UUID', () => {
    carregada({
      revisao_veredito: 'mantida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(container.textContent).not.toMatch(/\bpor\s+[A-Z][a-zà-ú]+\s+[A-Z]/)
    expect(container.innerHTML).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    )
  })

  it('o sistema não escreve promessa própria de próximos passos (regra de honestidade)', () => {
    // A RPC desta fase grava um veredito e uma justificativa; ela NÃO reabre o funil.
    // Qualquer encaminhamento é o que a pessoa que revisou escreveu.
    carregada({
      revisao_veredito: 'revertida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    render(<ExplicacaoCandidatoPage />)
    const bloco = screen.getByText(COPY_SPEC.eyebrow).parentElement
    expect(bloco).not.toBeNull()
    for (const promessa of [
      /entraremos em contato/i,
      /entrará em contato/i,
      /voltará ao processo/i,
      /próximos passos/i,
      /em breve/i,
      /aguarde/i,
      /reabert/i,
    ]) {
      expect(bloco?.textContent ?? '').not.toMatch(promessa)
    }
  })
})
