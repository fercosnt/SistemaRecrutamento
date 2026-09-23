/// <reference types="@testing-library/jest-dom" />
/**
 * ComparativoCandidatosPage — o rótulo de cada posição do ranking (JORN-25 / T-49-13-01).
 *
 * Phase 49 / plano 49-13. Arquivo NOVO; o plano 49-22 o estende com a seleção sem
 * encerrada, o teto vindo da constante e o «Avançar» real.
 *
 * ─── O DEFEITO QUE ESTE ARQUIVO TRAVA ────────────────────────────────────────────────
 *
 * `resolveCandidates` lia o número do rótulo anonimizado e indexava a seleção
 * (`C2` → `selection[1]`). Isso só está certo se a Edge Function anonimizar na MESMA ordem
 * em que o painel entregou a seleção — e ela não faz isso: ordena por score com desempate
 * por `candidatura_id` (49-08). Num empate, o mesmo pedido podia trocar `C1` e `C2` entre
 * execuções, e o RH leria os pontos fortes de uma pessoa sob o nome de outra, sem nada na
 * tela indicando a troca.
 *
 * ⚠ O caso decisivo é **seleção em ordem DIFERENTE do ranking**. Um teste em que as duas
 * ordens coincidem passa com a implementação antiga e com a nova — ele não vigia nada.
 *
 * @see src/components/pages/ComparativoCandidatosPage.tsx
 * @see supabase/functions/comparativo-candidatos/index.ts (o laço que monta `posicoes`)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// O módulo da página importa o `triagemService`, que importa o client anon (que valida
// variáveis de ambiente no import). Mockado para que o teste da função PURA não dependa de
// `.env` — idioma de `triagemService.test.ts`.
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
  },
}))

// ── Phase 49 / plano 49-22 ────────────────────────────────────────────────────────────
// O «Avançar» da página é o defeito que o 49-05 mediu e deixou pinado: ele gravava SEMPRE
// `PROXIMA_ETAPA_APOS_TRIAGEM` ('avaliacao_assincrona'), qualquer que fosse a etapa do
// candidato — jogando quem estava em `entrevista_presencial` TRÊS etapas atrás. Para provar
// o conserto é preciso ver o ARGUMENTO que chega ao escritor de etapa, então o teste renderiza
// a página com o `ComparativoScreen` substituído por um stub (ele tem suíte própria; o que se
// mede aqui é a FIAÇÃO da página).
const { updateEtapaMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  updateEtapaMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}))

vi.mock('@/features/triagem/services/triagemService', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, updateCandidaturaEtapa: updateEtapaMock }
})

// O RHLayout arrasta a sidebar + o authStore; a página é o objeto do teste, não o shell.
vi.mock('../../RHLayout', () => ({
  RHLayout: ({ children }: { children?: unknown }) => children as never,
}))

// Stub do ComparativoScreen: um botão «Avançar» por candidato ELEGÍVEL (o gate que este
// plano introduz), de modo que a ausência do botão seja observável sem Radix.
vi.mock('@/features/triagem/components/ComparativoScreen', () => ({
  ComparativoScreen: ({
    candidates,
    onAvancar,
    podeAvancar,
  }: {
    candidates: { candidaturaId: string; nome?: string }[]
    onAvancar?: (id: string) => void
    podeAvancar?: (id: string) => boolean
  }) => (
    <div data-testid="comparativo-screen-stub">
      {candidates.map((c) =>
        !podeAvancar || podeAvancar(c.candidaturaId) ? (
          <button
            key={c.candidaturaId}
            type="button"
            data-testid={`avancar-${c.candidaturaId}`}
            onClick={() => onAvancar?.(c.candidaturaId)}
          >
            Avançar {c.nome}
          </button>
        ) : null,
      )}
    </div>
  ),
}))

const { useComparativoMock } = vi.hoisted(() => ({ useComparativoMock: vi.fn() }))
vi.mock('@/features/triagem/hooks/useComparativo', () => ({
  useComparativo: useComparativoMock,
}))

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'
import {
  COMPARATIVO_MAX_CANDIDATOS,
  COMPARATIVO_MIN_CANDIDATOS,
} from '../../../../supabase/functions/_shared/comparativo-config'

import { ComparativoCandidatosPage, resolveCandidates } from '../ComparativoCandidatosPage'
import type { RankedCandidate } from '@/features/triagem/pdf/exportComparativo'

/** Ranked mínimo — só os campos que o rótulo usa importam aqui. */
function ranked(candidate_id: string, rank: number, composite_score = 80): RankedCandidate {
  return {
    candidate_id,
    nome: '',
    rank,
    composite_score,
    relative_strengths: [],
    relative_weaknesses: [],
    rationale: '',
  }
}

describe('resolveCandidates — rótulo pela CHAVE que a EF devolve (JORN-25)', () => {
  it('seleção em ordem DIFERENTE do ranking: C1 → o candidato que a EF ranqueou 1º, não o 1º da seleção', () => {
    // A seleção chegou [Ana, Bruno]; a EF ranqueou Bruno em C1 e Ana em C2.
    const selection = [
      { id: 'cand-ana', nome: 'Ana' },
      { id: 'cand-bruno', nome: 'Bruno' },
    ]
    const posicoes = { C1: 'cand-bruno', C2: 'cand-ana' }

    const out = resolveCandidates([ranked('C1', 1), ranked('C2', 2)], posicoes, selection)

    expect(out[0].nome).toBe('Bruno')
    expect(out[0].candidaturaId).toBe('cand-bruno')
    expect(out[1].nome).toBe('Ana')
    expect(out[1].candidaturaId).toBe('cand-ana')
  })

  it('a implementação por POSIÇÃO daria o nome do vizinho — e é isso que deixou de acontecer', () => {
    // Prova explícita do defeito: por posição, C1 → selection[0] = Ana (errado).
    const selection = [
      { id: 'cand-ana', nome: 'Ana' },
      { id: 'cand-bruno', nome: 'Bruno' },
    ]
    const out = resolveCandidates([ranked('C1', 1)], { C1: 'cand-bruno' }, selection)
    expect(out[0].nome).not.toBe('Ana')
    expect(out[0].nome).toBe('Bruno')
  })

  it('a ordem do array de `ranked` é preservada (a tela reordena por rank; o rótulo não depende disso)', () => {
    const selection = [
      { id: 'a', nome: 'Alfa' },
      { id: 'b', nome: 'Beta' },
      { id: 'c', nome: 'Gama' },
    ]
    const posicoes = { C1: 'c', C2: 'a', C3: 'b' }
    const out = resolveCandidates(
      [ranked('C3', 3), ranked('C1', 1), ranked('C2', 2)],
      posicoes,
      selection,
    )
    expect(out.map((c) => c.nome)).toEqual(['Beta', 'Gama', 'Alfa'])
    expect(out.map((c) => c.candidaturaId)).toEqual(['b', 'c', 'a'])
  })
})

describe('resolveCandidates — degradação: rótulo cru, NUNCA o vizinho (Discretion do JORN-25)', () => {
  it('rótulo sem entrada em `posicoes` mostra o próprio `candidate_id`', () => {
    const selection = [
      { id: 'a', nome: 'Alfa' },
      { id: 'b', nome: 'Beta' },
    ]
    const out = resolveCandidates([ranked('C1', 1), ranked('C9', 2)], { C1: 'a' }, selection)
    expect(out[0].nome).toBe('Alfa')
    // C9 não está em `posicoes` → rótulo cru. Um nome plausível aqui seria pior que um
    // rótulo visivelmente incompleto: ninguém conferiria.
    expect(out[1].nome).toBe('C9')
    expect(out[1].candidaturaId).toBe('C9')
  })

  it('`posicoes` vazio (EF anterior ao 49-08) ⇒ TODOS os rótulos crus, nenhum nome da seleção', () => {
    const selection = [
      { id: 'a', nome: 'Alfa' },
      { id: 'b', nome: 'Beta' },
    ]
    const out = resolveCandidates([ranked('C1', 1), ranked('C2', 2)], {}, selection)
    expect(out.map((c) => c.nome)).toEqual(['C1', 'C2'])
    expect(out.map((c) => c.nome)).not.toContain('Alfa')
  })

  it('`posicoes` undefined é tratado como vazio (sem lançar)', () => {
    const out = resolveCandidates([ranked('C1', 1)], undefined, [{ id: 'a', nome: 'Alfa' }])
    expect(out[0].nome).toBe('C1')
  })

  it('id presente em `posicoes` mas ausente da seleção ⇒ nome cru, e o candidaturaId REAL é preservado', () => {
    // A ação inline precisa do id real mesmo quando o nome não é conhecido: perder o id
    // transformaria «não sei o nome» em «não sei quem mover».
    const out = resolveCandidates([ranked('C1', 1)], { C1: 'cand-fora-da-selecao' }, [
      { id: 'outro', nome: 'Outro' },
    ])
    expect(out[0].nome).toBe('C1')
    expect(out[0].candidaturaId).toBe('cand-fora-da-selecao')
  })

  it('empate de score com seleção invertida — o caso em que o defeito antigo era invisível', () => {
    // Mesmo score nos dois: a EF desempata por candidatura_id ('a' < 'b'), então C1='a'.
    const selection = [
      { id: 'b', nome: 'Bruna' },
      { id: 'a', nome: 'Aline' },
    ]
    const out = resolveCandidates(
      [ranked('C1', 1, 70), ranked('C2', 2, 70)],
      { C1: 'a', C2: 'b' },
      selection,
    )
    expect(out[0].nome).toBe('Aline')
    expect(out[1].nome).toBe('Bruna')
  })
})

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * Phase 49 / plano 49-22 — D-36: o «Avançar» leva cada um à SUA próxima etapa.
 *
 * O defeito medido pelo 49-05 (varredura C1 #4) não divergia: estava errado SEMPRE.
 * `updateCandidaturaEtapa(id, PROXIMA_ETAPA_APOS_TRIAGEM)` grava `avaliacao_assincrona`
 * mesmo para quem está em `entrevista_presencial` — três etapas ATRÁS. A trava do banco
 * (49-06) é a última camada; aqui a tela deixa de OFERECER o movimento errado.
 * ═══════════════════════════════════════════════════════════════════════════
 */
function renderPagina(
  candidatos: { id: string; nome: string; etapa_atual?: string; status?: string }[],
  rankedList: RankedCandidate[] = candidatos.map((_c, i) => ranked(`C${i + 1}`, i + 1)),
  posicoes: Record<string, string> = Object.fromEntries(
    candidatos.map((c, i) => [`C${i + 1}`, c.id]),
  ),
) {
  useComparativoMock.mockReturnValue({
    mutate: vi.fn(),
    data: { ranking: { ranked_candidates: rankedList }, posicoes },
    isPending: false,
    isError: false,
    error: null,
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/rh/vagas/vaga-1/comparativo',
            state: { ids: candidatos.map((c) => c.id), candidatos },
          },
        ]}
      >
        <ComparativoCandidatosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ComparativoCandidatosPage — «Avançar» para a próxima etapa REAL (D-36)', () => {
  beforeEach(() => {
    updateEtapaMock.mockReset()
    updateEtapaMock.mockResolvedValue(undefined)
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
    useComparativoMock.mockReset()
  })

  it('candidato em `triagem` ⇒ avança para `avaliacao_assincrona`', async () => {
    renderPagina([
      { id: 'c-tri', nome: 'Tri', etapa_atual: 'triagem', status: 'em_analise' },
      { id: 'c-b', nome: 'Beta', etapa_atual: 'triagem', status: 'em_analise' },
    ])
    screen.getByTestId('avancar-c-tri').click()
    await waitFor(() => expect(updateEtapaMock).toHaveBeenCalledTimes(1))
    expect(updateEtapaMock).toHaveBeenCalledWith('c-tri', 'avaliacao_assincrona')
  })

  it('candidato em `entrevista_online` ⇒ avança para `entrevista_presencial`, NÃO para a etapa fixa antiga', async () => {
    renderPagina([
      { id: 'c-ent', nome: 'Ent', etapa_atual: 'entrevista_online', status: 'em_analise' },
      { id: 'c-b', nome: 'Beta', etapa_atual: 'triagem', status: 'em_analise' },
    ])
    screen.getByTestId('avancar-c-ent').click()
    await waitFor(() => expect(updateEtapaMock).toHaveBeenCalledTimes(1))
    // A prova NEGATIVA importa: a implementação antiga daria `avaliacao_assincrona` aqui.
    expect(updateEtapaMock).not.toHaveBeenCalledWith('c-ent', 'avaliacao_assincrona')
    expect(updateEtapaMock).toHaveBeenCalledWith('c-ent', 'entrevista_presencial')
  })

  it('candidato em `decisao_final` NÃO recebe o botão «Avançar» (não há próxima etapa de trabalho)', () => {
    renderPagina([
      { id: 'c-dec', nome: 'Dec', etapa_atual: 'decisao_final', status: 'em_analise' },
      { id: 'c-b', nome: 'Beta', etapa_atual: 'triagem', status: 'em_analise' },
    ])
    expect(screen.queryByTestId('avancar-c-dec')).not.toBeInTheDocument()
    expect(screen.getByTestId('avancar-c-b')).toBeInTheDocument()
  })

  it('candidatura ENCERRADA não recebe o botão (2ª camada — a EF já recusa)', () => {
    renderPagina([
      { id: 'c-ko', nome: 'KO', etapa_atual: 'triagem', status: 'rejeitado' },
      { id: 'c-b', nome: 'Beta', etapa_atual: 'triagem', status: 'em_analise' },
    ])
    expect(screen.queryByTestId('avancar-c-ko')).not.toBeInTheDocument()
  })

  it('sem `etapa_atual` no estado da rota o botão CONTINUA (não se infere «não pode» da ausência) e o handler diz a verdade em vez de gravar', async () => {
    renderPagina([
      { id: 'c-sem', nome: 'Sem' },
      { id: 'c-b', nome: 'Beta' },
    ])
    const btn = screen.getByTestId('avancar-c-sem')
    expect(btn).toBeInTheDocument()
    btn.click()
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled())
    expect(updateEtapaMock).not.toHaveBeenCalled()
  })

  it('o estado de seleção inválida usa o MÍNIMO da constante, não um literal', () => {
    renderPagina([{ id: 'so-um', nome: 'Único', etapa_atual: 'triagem', status: 'em_analise' }])
    expect(screen.queryByTestId('comparativo-screen-stub')).not.toBeInTheDocument()
    expect(document.body.textContent).toContain(
      `ao menos ${COMPARATIVO_MIN_CANDIDATOS} candidatos`,
    )
  })

  it('acima do teto da constante a EF não é invocada (o teto é o da EF, não um paralelo)', () => {
    const muitos = Array.from({ length: COMPARATIVO_MAX_CANDIDATOS + 1 }, (_, i) => ({
      id: `c-${i}`,
      nome: `C${i}`,
      etapa_atual: 'triagem',
      status: 'em_analise',
    }))
    const mutate = vi.fn()
    useComparativoMock.mockReturnValue({
      mutate,
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/rh/vagas/vaga-1/comparativo',
              state: { ids: muitos.map((c) => c.id), candidatos: muitos },
            },
          ]}
        >
          <ComparativoCandidatosPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(mutate).not.toHaveBeenCalled()
  })
})
