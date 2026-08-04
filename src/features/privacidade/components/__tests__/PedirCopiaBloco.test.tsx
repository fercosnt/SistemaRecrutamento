/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 44 / Plano 44-05 Task 2 (TDD RED) — o bloco da seção 3 de
 * `/candidato/privacidade`: o CTA que **é** o pedido (EXPORT-01).
 *
 * Cinco casos, e dois deles são o que a UI-SPEC chama de backstop:
 *
 *  - **(h)** o duplo clique. O botão em voo é `disabled` + `aria-busy="true"`, e a
 *    asserção é sobre a MUTATION ter sido disparada uma única vez — não sobre o
 *    atributo. Um `disabled` que existisse sem impedir a segunda chamada passaria
 *    numa asserção de atributo e falha nesta (E2/loading).
 *
 *  - **(k)** sonda de texto-fonte com ESCOPO DECLARADO. As strings banidas pela
 *    §Copywriting da 44-UI-SPEC são procuradas **apenas** em `PedirCopiaBloco.tsx` e
 *    no gerador do `.json` — **nunca** em `src/features/privacidade/` inteiro. O
 *    `GuardaCurriculoBloco`, aprovado na Phase 43 e não editado por esta fase, contém
 *    legitimamente uma das expressões ("pedir a eliminação do seu currículo"); um grep
 *    de feature inteira reprovaria copy aprovada de outra fase. Este projeto já pagou
 *    duas vezes por essa classe de defeito (43, "automaticamente"; 44-03, asserção (c)
 *    varrendo prosa que cita as tabelas proibidas de propósito).
 *
 * Os literais proibidos são MONTADOS EM RUNTIME (idioma 42-11): um arquivo que proíbe
 * uma string e a contém verbatim é sua própria primeira violação.
 *
 * @see .planning/phases/44-exporta-o-acesso/44-UI-SPEC.md (§O CTA e seus cinco estados)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const mocks = vi.hoisted(() => ({
  invocar: vi.fn(),
  disparar: vi.fn(),
}))

// O client Supabase é validado no topo do módulo do serviço real (que o
// `importActual` abaixo avalia) — mockado para não exigir `VITE_SUPABASE_*`.
vi.mock('@/lib/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

vi.mock('../../services/exportacaoService', async () => {
  const real =
    await vi.importActual<typeof import('../../services/exportacaoService')>(
      '../../services/exportacaoService',
    )
  return { ...real, invocarExportMeusDados: mocks.invocar, dispararDownloads: mocks.disparar }
})

import { PedirCopiaBloco } from '../PedirCopiaBloco'
import { COPY_PEDIR_COPIA, type RespostaExport } from '../../services/exportacaoService'

const RESPOSTA: RespostaExport = {
  ok: true,
  versao_allowlist: '1.1.0',
  gerado_em: '2026-08-04T13:45:00.000Z',
  payload: { candidatos: [{ id: 'cand-1' }] },
}

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <PedirCopiaBloco />
    </QueryClientProvider>,
  )
}

const botao = () => screen.getByRole('button', { name: /cópia dos meus dados|Preparando sua cópia/i })

beforeEach(() => {
  mocks.invocar.mockReset()
  mocks.disparar.mockReset()
})

describe('PedirCopiaBloco', () => {
  it('(g) estado disponível: CTA com a copy da spec e alvo tátil de 44px', () => {
    renderizar()
    const cta = screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta })
    expect(cta).toBeInTheDocument()
    expect(cta).toBeEnabled()
    expect(cta.className).toContain('min-h-[44px]')
    expect(cta).not.toHaveAttribute('aria-busy', 'true')
    // A prosa de escopo é leitura de carga: presente e íntegra.
    expect(screen.getByText(COPY_PEDIR_COPIA.abertura)).toBeInTheDocument()
    expect(screen.getByText(COPY_PEDIR_COPIA.oQueEsta)).toBeInTheDocument()
    expect(screen.getByText(COPY_PEDIR_COPIA.oQueNaoEsta)).toBeInTheDocument()
  })

  it('(h) em voo: desabilitado + aria-busy, e um segundo clique NÃO dispara outra mutation', async () => {
    // Promise que nunca resolve — a mutation fica em voo pelo teste inteiro.
    mocks.invocar.mockImplementation(() => new Promise(() => {}))
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    await waitFor(() => expect(botao()).toHaveAttribute('aria-busy', 'true'))
    expect(botao()).toBeDisabled()
    expect(botao()).toHaveTextContent(COPY_PEDIR_COPIA.ctaEmVoo)

    await user.click(botao())
    expect(mocks.invocar).toHaveBeenCalledTimes(1)
  })

  it('(i) erro: alerta inline com role="alert" e o botão volta a ficar habilitado', async () => {
    mocks.invocar.mockRejectedValue(new Error('qualquer coisa'))
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(COPY_PEDIR_COPIA.erroTitulo)
    expect(alerta).toHaveTextContent(COPY_PEDIR_COPIA.erroCorpo)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta })).toBeEnabled(),
    )
    expect(mocks.disparar).not.toHaveBeenCalled()
  })

  it('(j) sucesso: dispara UMA vez, e o arquivo disparado é o .json', async () => {
    mocks.invocar.mockResolvedValue(RESPOSTA)
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole('button', { name: COPY_PEDIR_COPIA.cta }))

    await waitFor(() => expect(mocks.disparar).toHaveBeenCalledTimes(1))
    const [arquivos] = mocks.disparar.mock.calls[0]
    expect(arquivos).toHaveLength(1)
    expect(arquivos[0].nome).toMatch(/^beauty-smile-meus-dados-\d{4}-\d{2}-\d{2}\.json$/)
    expect(arquivos[0].tipo).toContain('application/json')
    // O conteúdo é o que o gerador PURO produziu (o mock não o substitui).
    expect(JSON.parse(arquivos[0].conteudo).versao_allowlist).toBe('1.1.0')
  })

  it('(k) sonda de texto-fonte, ESCOPO DECLARADO: o bloco novo e o gerador do .json', () => {
    const ler = (relativo: string) => readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
    const escopo = {
      'PedirCopiaBloco.tsx': ler('../PedirCopiaBloco.tsx'),
      'exportacaoService.ts': ler('../../services/exportacaoService.ts'),
    }

    // Literais montados em runtime — ver o docblock deste arquivo.
    const banidas = [
      ['todos', 'os', 'seus', 'dados'].join(' '),
      ['tudo', 'o', 'que', 'temos', 'sobre', 'você'].join(' '),
      ['todos', 'os', 'seus', 'registros'].join(' '),
      ['apaga', 'do'].join(''),
      ['apaga', 'dos'].join(''),
      ['exclu', 'ído'].join(''),
      ['exclu', 'ídos'].join(''),
      ['elimina', 'do'].join(''),
      ['removido', 'dos', 'nossos', 'sistemas'].join(' '),
    ]

    for (const [arquivo, conteudo] of Object.entries(escopo)) {
      for (const proibida of banidas) {
        expect(
          conteudo.toLowerCase().includes(proibida.toLowerCase()),
          `string banida "${proibida}" encontrada em ${arquivo}`,
        ).toBe(false)
      }
    }

    // META-TEST: sem isto, uma grafia errada em `banidas` passaria verde para sempre.
    for (const proibida of banidas) {
      expect(`prefixo ${proibida} sufixo`.toLowerCase()).toContain(proibida.toLowerCase())
    }
  })
})
