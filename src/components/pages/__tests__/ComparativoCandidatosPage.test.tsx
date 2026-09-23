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
import { describe, it, expect, vi } from 'vitest'

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

import { resolveCandidates } from '../ComparativoCandidatosPage'
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
