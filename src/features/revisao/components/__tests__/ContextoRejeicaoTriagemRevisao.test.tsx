/// <reference types="@testing-library/jest-dom" />
/**
 * Plano 52-13 Task 2 (JORN-62 · D-38) — os estados de `ContextoRejeicaoTriagemRevisao`.
 *
 * O contexto da triagem tem os mesmos estados honestos do contexto do knockout: carregando →
 * frase; erro → frase + «Tentar novamente» que busca de novo; vazio (qualquer forma que não seja
 * `disponivel`) → os dois pares com «Não registrado». O serviço é mockado: esta suíte é sobre a
 * tela, não sobre a rede.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

const { lerContextoTriagemMock } = vi.hoisted(() => ({ lerContextoTriagemMock: vi.fn() }))

vi.mock('../../services/revisaoService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/revisaoService')>()),
  lerContextoRejeicaoTriagem: lerContextoTriagemMock,
}))

import {
  ContextoRejeicaoTriagemRevisao,
  COPY_CONTEXTO_TRIAGEM,
} from '../ContextoRejeicaoTriagemRevisao'
import { MOTIVO_OPTIONS } from '@/features/triagem/components/RejeitarCandidaturaDialog'
import { RevisaoError } from '../../services/revisaoService'

const PEDIDO = '99999999-9999-4999-8999-999999999999'

function renderContexto() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const r = render(
    <QueryClientProvider client={client}>
      <div className="grid sm:grid-cols-2">
        <ContextoRejeicaoTriagemRevisao pedidoId={PEDIDO} />
      </div>
    </QueryClientProvider>,
  )
  return { ...r, client }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('COPY_CONTEXTO_TRIAGEM — as frases da UI-SPEC', () => {
  it('rótulos e ausência verbatim', () => {
    expect(COPY_CONTEXTO_TRIAGEM.motivo).toBe('Motivo da rejeição')
    expect(COPY_CONTEXTO_TRIAGEM.justificativa).toBe('Justificativa registrada')
    expect(COPY_CONTEXTO_TRIAGEM.ausente).toBe('Não registrado')
    expect(COPY_CONTEXTO_TRIAGEM.tentarNovamente).toBe('Tentar novamente')
  })
})

describe('ContextoRejeicaoTriagemRevisao — estados', () => {
  it('carregando → a frase de carregamento, sem os pares', () => {
    lerContextoTriagemMock.mockReturnValue(new Promise(() => {}))
    renderContexto()
    expect(screen.getByRole('status')).toHaveTextContent(COPY_CONTEXTO_TRIAGEM.carregando)
    expect(screen.queryByText(COPY_CONTEXTO_TRIAGEM.motivo)).not.toBeInTheDocument()
  })

  it('erro → frase de falha + «Tentar novamente», que chama a leitura de novo', async () => {
    lerContextoTriagemMock.mockRejectedValueOnce(new RevisaoError('x', 'DESCONHECIDO'))
    lerContextoTriagemMock.mockResolvedValueOnce({
      situacao: 'disponivel',
      motivo: 'nao_compareceu',
      justificativa: 'Faltou à entrevista marcada.',
    })
    renderContexto()
    expect(await screen.findByText(COPY_CONTEXTO_TRIAGEM.erro)).toBeInTheDocument()
    // A mensagem crua do erro nunca aparece.
    expect(screen.queryByText('x')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: COPY_CONTEXTO_TRIAGEM.tentarNovamente }))
    expect(await screen.findByText('Faltou à entrevista marcada.')).toBeInTheDocument()
    expect(screen.getByText('Não compareceu')).toBeInTheDocument()
    expect(lerContextoTriagemMock).toHaveBeenCalledTimes(2)
    expect(lerContextoTriagemMock).toHaveBeenCalledWith(PEDIDO)
  })

  it('vazio (`indisponivel`) → os dois pares com «Não registrado»', async () => {
    lerContextoTriagemMock.mockResolvedValue({
      situacao: 'indisponivel',
      motivo: null,
      justificativa: null,
    })
    renderContexto()
    const bloco = await screen.findByTestId('revisao-contexto-triagem')
    expect(await within(bloco).findByText(COPY_CONTEXTO_TRIAGEM.motivo)).toBeInTheDocument()
    expect(within(bloco).getByText(COPY_CONTEXTO_TRIAGEM.justificativa)).toBeInTheDocument()
    expect(within(bloco).getAllByText(COPY_CONTEXTO_TRIAGEM.ausente)).toHaveLength(2)
  })

  it('`disponivel` com os dois campos nulos → também «Não registrado» nos dois', async () => {
    lerContextoTriagemMock.mockResolvedValue({
      situacao: 'disponivel',
      motivo: null,
      justificativa: null,
    })
    renderContexto()
    const bloco = await screen.findByTestId('revisao-contexto-triagem')
    expect(await within(bloco).findAllByText(COPY_CONTEXTO_TRIAGEM.ausente)).toHaveLength(2)
  })
})

describe('ContextoRejeicaoTriagemRevisao — conteúdo', () => {
  it('o rótulo do motivo é o do MOTIVO_OPTIONS do diálogo de rejeição, para todo código', async () => {
    for (const opcao of MOTIVO_OPTIONS) {
      lerContextoTriagemMock.mockResolvedValue({
        situacao: 'disponivel',
        motivo: opcao.value,
        justificativa: 'J',
      })
      const { unmount } = renderContexto()
      expect(await screen.findByText(opcao.label)).toBeInTheDocument()
      expect(screen.queryByText(opcao.value)).not.toBeInTheDocument()
      unmount()
    }
  })

  // 52-29 Task 4 (pedido do operador, 2026-10-12): a ressalva do teste 15 do UAT da 52 — «código
  // desconhecido aparece cru» só era garantido pela leitura de `rotularMotivoRejeicao`. O caso de
  // cima percorre apenas códigos CONHECIDOS. Este prova o fallback: o código exato, sem rótulo
  // inventado, sem «Não registrado», sem reformatação (nem `_` → espaço, nem mudança de caixa).
  it('código de motivo fora do MOTIVO_OPTIONS aparece cru, sem reformatação (ressalva do teste 15 do UAT da 52)', async () => {
    // `string`, não o literal: o código é justamente um valor FORA do tipo `MotivoRejeicaoRh`.
    const CODIGO: string = 'motivo_fora_do_mapa_X9'
    // Afirmado antes: se o mapa crescer e passar a ter este código, o caso não passa por acaso.
    expect(MOTIVO_OPTIONS.some((o) => o.value === CODIGO), 'o codigo nao pode estar no MOTIVO_OPTIONS').toBe(false)
    lerContextoTriagemMock.mockResolvedValue({
      situacao: 'disponivel',
      motivo: CODIGO,
      justificativa: 'J',
    })
    renderContexto()
    const rotulo = await screen.findByText(COPY_CONTEXTO_TRIAGEM.motivo)
    const par = rotulo.parentElement as HTMLElement
    const valor = Array.from(par.children).find((el) => el !== rotulo)
    expect(valor?.textContent, 'o par «Motivo da rejeição» mostra o codigo exato').toBe(CODIGO)
    expect(within(par).queryByText(COPY_CONTEXTO_TRIAGEM.ausente) === null, 'sem «Não registrado» no par do motivo').toBe(true)
    expect(
      MOTIVO_OPTIONS.filter((o) => within(par).queryByText(o.label) !== null).map((o) => o.label).join(' | '),
      'nenhum rotulo do MOTIVO_OPTIONS no par do motivo',
    ).toBe('')
    expect(
      ['motivo fora do mapa X9', 'Motivo_fora_do_mapa_X9', 'MOTIVO_FORA_DO_MAPA_X9']
        .filter((forma) => screen.queryByText(forma) !== null)
        .join(' | '),
      'nenhuma forma reformatada do codigo',
    ).toBe('')
  })

  it('cada par ocupa a linha inteira da grade (`sm:col-span-2`)', async () => {
    lerContextoTriagemMock.mockResolvedValue({
      situacao: 'disponivel',
      motivo: 'outro',
      justificativa: 'J',
    })
    renderContexto()
    const rotulo = await screen.findByText(COPY_CONTEXTO_TRIAGEM.motivo)
    expect(rotulo.parentElement).toHaveClass('sm:col-span-2')
    expect(screen.getByText(COPY_CONTEXTO_TRIAGEM.justificativa).parentElement).toHaveClass(
      'sm:col-span-2',
    )
  })

  // T-52-37: a justificativa é NÓ DE TEXTO, nunca HTML.
  it('marcação HTML na justificativa aparece LITERAL', async () => {
    const malicioso = '<img src=x onerror="alert(1)"><b>negrito</b>'
    lerContextoTriagemMock.mockResolvedValue({
      situacao: 'disponivel',
      motivo: 'outro',
      justificativa: malicioso,
    })
    renderContexto()
    expect(await screen.findByText(malicioso)).toBeInTheDocument()
    expect(document.querySelector('img[src="x"]')).toBeNull()
    expect(document.querySelector('b')).toBeNull()
  })

  // T-52-36: sem cache depois de fechar (gcTime 0).
  it('ao desmontar, a leitura não fica no cache do TanStack Query', async () => {
    lerContextoTriagemMock.mockResolvedValue({
      situacao: 'disponivel',
      motivo: 'outro',
      justificativa: 'texto sensível',
    })
    const { client, unmount } = renderContexto()
    await screen.findByText('texto sensível')
    unmount()
    await new Promise((r) => setTimeout(r, 0))
    const restantes = client
      .getQueryCache()
      .getAll()
      .filter((q) => JSON.stringify(q.queryKey).includes('contexto-triagem'))
    expect(restantes).toHaveLength(0)
  })
})
