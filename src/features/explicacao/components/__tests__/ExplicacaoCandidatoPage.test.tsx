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
import { CANAL_PRIVACIDADE_EMAIL } from '@/features/privacidade/constants/canalPrivacidade'

/** Copy verbatim da 42-UI-SPEC §Superfície do candidato — REVISAO-04. */
const COPY_SPEC = {
  eyebrow: 'Resultado da revisão',
  mantida: 'Após a revisão, a decisão foi mantida.',
  /**
   * 48-14 (JORN-19 · D-01): a MESMA frase do e-mail do 48-13
   * (`supabase/functions/_shared/email-templates.ts`, COPY_REVISAO_REVERTIDA), letra por
   * letra — sem data quando o prazo não é legível, com a data-limite em SP quando é.
   */
  revertida: 'Após a revisão, sua candidatura foi reaberta e será decidida novamente.',
  revertidaComData: (data: string) =>
    `Após a revisão, sua candidatura foi reaberta e será decidida novamente até ${data}.`,
  data: 'Respondida em 28/07/2026',
} as const

const JUSTIFICATIVA =
  'Reexaminamos o conjunto do processo seletivo, etapa por etapa, e a base desta resposta.'

/** Uma explicação alcançável (decisão rejeitada), com o ciclo da revisão sobrescrevível. */
function explicacao(over: Record<string, unknown> = {}) {
  return {
    // §7.18: o discriminador de origem. Explícito no helper de propósito — deixá-lo
    // `undefined` faria toda esta suíte testar o caminho humano por acidente e não por
    // escolha, e um dia alguém trocaria o default sem que nada aqui reclamasse.
    origem: 'humana',
    decisao: 'rejeitado',
    reason: 'Avaliamos seu processo de forma global e decidimos não seguir adiante.',
    revisao_solicitada_em: '2026-07-20T10:00:00Z',
    revisao_resultado: null,
    explicacao_solicitada_em: '2026-07-19T09:00:00Z',
    revisao_veredito: null,
    revisao_respondida_em: null,
    reaberta_em: null,
    prazo_nova_decisao_em: null,
    ...over,
  }
}

/**
 * Localiza o parágrafo cujo texto COMPLETO é exatamente a linha de veredito da UI-SPEC.
 *
 * `getByText` com string casa só o texto direto do elemento, e a linha do veredito é
 * deliberadamente partida em dois nós — a cláusula que RESPONDE à pergunta do candidato
 * carrega peso 600. A igualdade estrita de `textContent` é mais forte que `getByText`:
 * assere a frase byte a byte, sem normalização de espaço, provando que a partição é
 * tipográfica e não editorial.
 */
function linhaVeredito(container: HTMLElement, texto: string): HTMLElement | null {
  return (
    Array.from(container.querySelectorAll('p')).find((p) => p.textContent === texto) ??
    null
  )
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
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(screen.queryByText(COPY_SPEC.eyebrow)).not.toBeInTheDocument()
    expect(linhaVeredito(container, COPY_SPEC.mantida)).toBeNull()
    expect(linhaVeredito(container, COPY_SPEC.revertida)).toBeNull()
    expect(screen.queryByText(/^Respondida em/)).not.toBeInTheDocument()
    expect(container.querySelector('[data-corpo-revisao]')).toBeNull()
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
    // PIN da introdução do Art. 20 — reescrita pela 43-UI-SPEC (BD-3). O juridiquês
    // morreu; a ÂNCORA LEGAL (LGPD, Art. 20) continua ao lado, que é o ponto inteiro
    // da decisão: linguagem que o titular decodifica SEM perder a citação do artigo.
    expect(
      screen.getByText(
        'Você pode pedir que uma pessoa da nossa equipe revise esta decisão. É um direito seu (LGPD, Art. 20).',
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
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText(COPY_SPEC.eyebrow)).toBeInTheDocument()
    expect(linhaVeredito(container, COPY_SPEC.mantida)).not.toBeNull()
    expect(screen.getByText(COPY_SPEC.data)).toBeInTheDocument()
    expect(screen.getByText(JUSTIFICATIVA)).toBeInTheDocument()
  })

  it('veredito `revertida` → a linha informa que a candidatura foi reaberta (D-01)', () => {
    carregada({
      revisao_veredito: 'revertida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(linhaVeredito(container, COPY_SPEC.revertida)).not.toBeNull()
    expect(linhaVeredito(container, COPY_SPEC.mantida)).toBeNull()
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
    const { container } = render(<ExplicacaoCandidatoPage />)
    const linha = linhaVeredito(container, COPY_SPEC.mantida)
    expect(linha).not.toBeNull()
    expect(linha?.className).toContain('text-base')
    expect(linha?.className).toContain('leading-relaxed')
    // A cláusula que RESPONDE à pergunta carrega peso 600; o prefixo, não.
    const enfase = linha?.querySelector('span')
    expect(enfase?.textContent).toBe('a decisão foi mantida.')
    expect(enfase?.className).toContain('font-semibold')
    // A subordinação do rótulo é por COR e CAIXA, nunca por tamanho — o rótulo fica no
    // papel de label de 14px já declarado (a 42-UI-SPEC eliminou o papel de 12px).
    const rotulo = screen.getByText(COPY_SPEC.eyebrow)
    expect(rotulo.className).toContain('text-sm')
    expect(rotulo.className).toContain('uppercase')
    // A classe do 5º tamanho é montada em runtime: a 42-UI-SPEC eliminou o papel de 12px
    // e o critério de aceitação desta fase é que o literal NÃO EXISTA nesta feature —
    // nem dentro do teste que o proíbe. Aquela classe resolve a 12px (globals.css:79),
    // sem alias para 14px, então adotá-la aqui seria um 5º tamanho no conjunto declarado.
    expect(rotulo.className).not.toContain(['text', 'xs'].join('-'))
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
    expect(linhaVeredito(container, COPY_SPEC.mantida)).toBeNull()
    expect(linhaVeredito(container, COPY_SPEC.revertida)).toBeNull()
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
    // Desde o 48-11 o veredito `revertida` REABRE a candidatura, e a única frase do sistema
    // sobre o que vem depois é a de D-01 — que o código executa (a candidatura volta à
    // decisão final e o RH é alertado se o prazo vencer, 48-13). Nenhuma outra promessa.
    carregada({
      revisao_veredito: 'revertida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    render(<ExplicacaoCandidatoPage />)
    const bloco = screen.getByText(COPY_SPEC.eyebrow).parentElement
    expect(bloco).not.toBeNull()
    const semD01 = (bloco?.textContent ?? '').replace(COPY_SPEC.revertida, '')
    for (const promessa of [
      /entraremos em contato/i,
      /entrará em contato/i,
      /voltará ao processo/i,
      /próximos passos/i,
      /em breve/i,
      /aguarde/i,
      /reabert/i,
      /aprovad/i,
    ]) {
      expect(semD01).not.toMatch(promessa)
    }
  })
})

/**
 * §7.18, caminho (2) — a página passa a servir a rejeição AUTOMÁTICA, com texto próprio
 * e SEM pedido de revisão (veredito do responsável: explicação sim, revisão não).
 *
 * A ausência do CTA não é preferência de layout: `solicitar_revisao_decisao` exige a
 * linha em `decisao_final` que o knockout nunca cria, então um botão ali seria um pedido
 * que o servidor recusa sempre. Um direito oferecido e negado é pior que um direito que
 * a tela nunca prometeu — daí o bloco que diz, com todas as letras, que não há revisão a
 * pedir por aqui, e nomeia o canal humano no lugar.
 */
describe('ExplicacaoCandidatoPage — a rejeição automática (§7.18)', () => {
  function carregadaAutomatica() {
    explicacaoMock.mockReturnValue({
      data: explicacao({
        origem: 'automatica',
        reason: 'Esta vaga define alguns requisitos objetivos de elegibilidade…',
        revisao_solicitada_em: null,
        explicacao_solicitada_em: null,
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
  }

  it('a primeira linha diz que foi automático e que nenhuma pessoa avaliou', () => {
    carregadaAutomatica()
    render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText(/encerrada automaticamente na inscrição/i)).toBeInTheDocument()
    expect(screen.getByText(/sem avaliação de uma pessoa/i)).toBeInTheDocument()
    // E a linha do caminho humano NÃO aparece — ela afirmaria uma avaliação inexistente.
    expect(screen.queryByText(/Após avaliarmos seu processo/i)).not.toBeInTheDocument()
  })

  it('NÃO oferece pedido de revisão — nem o CTA, nem a frase do direito', () => {
    carregadaAutomatica()
    render(<ExplicacaoCandidatoPage />)
    expect(
      screen.queryByRole('button', { name: /revis(ã|a)o/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/pedir que uma pessoa da nossa equipe revise/i),
    ).not.toBeInTheDocument()
  })

  it('mas não silencia o assunto: diz por que não há revisão e dá o canal humano', () => {
    carregadaAutomatica()
    render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText(/não há uma revisão a pedir por aqui/i)).toBeInTheDocument()
    const canal = screen.getByRole('link', { name: /lgpd@beautysmile\.com\.br/i })
    expect(canal).toHaveAttribute('href', 'mailto:lgpd@beautysmile.com.br')
  })

  it('o caminho HUMANO não perdeu o CTA de revisão (não-regressão)', () => {
    carregada()
    render(<ExplicacaoCandidatoPage />)
    expect(
      screen.getByText(/pedir que uma pessoa da nossa equipe revise/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/não há uma revisão a pedir por aqui/i)).not.toBeInTheDocument()
  })
})

/**
 * JORN-22 / D-20 (Phase 48) — a rejeição HUMANA na triagem: explicação + canal, SEM
 * pedido de revisão, espelhando o knockout. Mas com texto PRÓPRIO: os textos do caminho
 * automático afirmam «sem avaliação de uma pessoa», e aqui uma pessoa decidiu. Reusá-los
 * seria mentir sobre quem decidiu — o defeito que a RPC do §7.18 existe para impedir.
 *
 * O canal é a constante importada (D-07): o endereço literal não aparece neste arquivo.
 */
describe('ExplicacaoCandidatoPage — a rejeição humana na triagem (JORN-22 / D-20)', () => {
  const PROIBIDO =
    /score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio|teste psicol/i

  function carregadaHumanaTriagem() {
    explicacaoMock.mockReturnValue({
      data: explicacao({
        origem: 'humana_triagem',
        reason:
          'A sua candidatura foi analisada por uma pessoa da nossa equipe, que decidiu não seguir com ela neste momento.',
        revisao_solicitada_em: null,
        explicacao_solicitada_em: null,
      }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
  }

  it('renderiza o contêiner próprio e a linha de resultado própria', () => {
    carregadaHumanaTriagem()
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(container.querySelector('[data-testid="explicacao-humana-triagem"]')).not.toBeNull()
    expect(
      screen.getByText(
        'Após a análise da sua candidatura por uma pessoa da nossa equipe, decidimos não seguir com ela nesta vaga.',
      ),
    ).toBeInTheDocument()
  })

  it('NUNCA diz que foi automático nem que não houve pessoa', () => {
    carregadaHumanaTriagem()
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(container.textContent).not.toMatch(/sem avalia[çc][ãa]o de uma pessoa/i)
    expect(container.textContent).not.toMatch(/n[ãa]o envolveu avalia[çc][ãa]o/i)
    expect(container.textContent).not.toMatch(/automaticamente/i)
    // Nem a linha do caminho da decisão final («Após avaliarmos seu processo»).
    expect(screen.queryByText(/Após avaliarmos seu processo/i)).not.toBeInTheDocument()
  })

  it('NÃO oferece pedido de revisão — nem o CTA, nem a frase do direito', () => {
    carregadaHumanaTriagem()
    render(<ExplicacaoCandidatoPage />)
    expect(screen.queryByRole('button', { name: /revis(ã|a)o/i })).not.toBeInTheDocument()
    expect(
      screen.queryByText(/pedir que uma pessoa da nossa equipe revise/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/não há uma revisão a pedir por aqui/i)).not.toBeInTheDocument()
  })

  it('dá o bloco sem-revisão próprio e o canal vindo da constante importada', () => {
    carregadaHumanaTriagem()
    render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText('Se você quiser falar sobre esta decisão')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Esta decisão foi tomada por uma pessoa da nossa equipe. Se quiser falar sobre ela, entre em contato pelo canal abaixo.',
      ),
    ).toBeInTheDocument()
    const canal = screen.getByRole('link', { name: CANAL_PRIVACIDADE_EMAIL })
    expect(canal).toHaveAttribute('href', `mailto:${CANAL_PRIVACIDADE_EMAIL}`)
  })

  it('nenhum texto da superfície casa o grep-guard de palavras', () => {
    carregadaHumanaTriagem()
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(container.textContent ?? '').not.toMatch(PROIBIDO)
  })

  it('os caminhos humano e automático não mudaram (não-regressão)', () => {
    carregada()
    const { container, unmount } = render(<ExplicacaoCandidatoPage />)
    expect(container.querySelector('[data-testid="explicacao-humana-triagem"]')).toBeNull()
    expect(screen.getByText(/pedir que uma pessoa da nossa equipe revise/i)).toBeInTheDocument()
    unmount()

    explicacaoMock.mockReturnValue({
      data: explicacao({ origem: 'automatica', revisao_solicitada_em: null }),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    const r2 = render(<ExplicacaoCandidatoPage />)
    expect(r2.container.querySelector('[data-testid="explicacao-humana-triagem"]')).toBeNull()
    expect(screen.getByText(/sem avaliação de uma pessoa/i)).toBeInTheDocument()
  })
})

/**
 * 48-14 (JORN-19 · D-01) — a candidatura REABERTA. O veredito `revertida` reabre a
 * candidatura (48-11) e `decisao` continua `rejeitado` até a nova decisão; a página não
 * pode apresentar essa rejeição como vigente. E-mail e página dizem a mesma coisa
 * (regra da 42-UI-SPEC): a frase de D-01, com a mesma data-limite em SP.
 */
describe('ExplicacaoCandidatoPage — a candidatura reaberta (JORN-19 / D-01)', () => {
  const REABERTA = {
    revisao_veredito: 'revertida',
    revisao_respondida_em: '2026-09-23T14:30:00Z',
    revisao_resultado: JUSTIFICATIVA,
    reaberta_em: '2026-09-23T14:30:00Z',
    // 00:00 de SP do dia SEGUINTE à data-limite (48-11) → a data dita é 03/10/2026.
    prazo_nova_decisao_em: '2026-10-04T03:00:00Z',
  }

  it('diz que foi reaberta e até quando — a mesma frase e a mesma data do e-mail', () => {
    carregada(REABERTA)
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(linhaVeredito(container, COPY_SPEC.revertidaComData('03/10/2026'))).not.toBeNull()
    expect(container.textContent).toContain(
      'Após a revisão, sua candidatura foi reaberta e será decidida novamente até 03/10/2026.',
    )
  })

  it('NÃO apresenta a rejeição revertida como vigente — nem a linha, nem a razão', () => {
    carregada(REABERTA)
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(container.textContent).not.toMatch(/decidimos não seguir/i)
    expect(screen.queryByText('Por que esta decisão')).not.toBeInTheDocument()
    // O cabeçalho continua o mesmo.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sobre a sua candidatura' }),
    ).toBeInTheDocument()
  })

  it('NÃO oferece o pedido de revisão (não há decisão vigente a revisar)', () => {
    carregada(REABERTA)
    render(<ExplicacaoCandidatoPage />)
    expect(
      screen.queryByText(/pedir que uma pessoa da nossa equipe revise/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /revis(ã|a)o/i })).not.toBeInTheDocument()
  })

  it('mantém a data da resposta e a justificativa de quem revisou', () => {
    carregada(REABERTA)
    render(<ExplicacaoCandidatoPage />)
    expect(screen.getByText(COPY_SPEC.eyebrow)).toBeInTheDocument()
    expect(screen.getByText('Respondida em 23/09/2026')).toBeInTheDocument()
    expect(screen.getByText(JUSTIFICATIVA)).toBeInTheDocument()
  })

  it.each([
    ['nulo', null],
    ['ilegível', 'não-é-data'],
  ])('prazo %s → a frase sai SEM data (nunca uma data inventada)', (_n, prazo) => {
    carregada({ ...REABERTA, prazo_nova_decisao_em: prazo })
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(linhaVeredito(container, COPY_SPEC.revertida)).not.toBeNull()
    expect(container.textContent).not.toMatch(/novamente até/)
  })

  it('veredito `mantida` segue inalterado: a rejeição vigente e o bloco de resultado', () => {
    carregada({
      revisao_veredito: 'mantida',
      revisao_respondida_em: '2026-07-28T14:30:00Z',
      revisao_resultado: JUSTIFICATIVA,
    })
    const { container } = render(<ExplicacaoCandidatoPage />)
    expect(linhaVeredito(container, COPY_SPEC.mantida)).not.toBeNull()
    expect(
      screen.getByText(
        'Após avaliarmos seu processo, decidimos não seguir com a sua candidatura nesta vaga.',
      ),
    ).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/reaberta/i)
  })

  it('nenhum vocabulário do acompanhamento interno do RH entra com a data', () => {
    carregada(REABERTA)
    const { container } = render(<ExplicacaoCandidatoPage />)
    for (const padrao of [/dias em espera/i, /atrasad/i, /faixa/i, /\bsla\b/i, /prazo/i, /\d+\s*dias?\b/i]) {
      expect(container.innerHTML).not.toMatch(padrao)
    }
  })
})
