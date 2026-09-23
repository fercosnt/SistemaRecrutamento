/// <reference types="@testing-library/jest-dom" />
/**
 * ProvenienciaIABadge — D-27b / JORN-28 (Phase 49, plano 49-13).
 *
 * O que este arquivo trava, e por quê:
 *
 *  1. **Fallback é dito, não deduzido.** Um ranking que saiu do modelo de contingência tem
 *     de anunciar isso NA TELA, com o modelo real e a causa legível. Em 2026-09-20 um
 *     comparativo saiu do `gpt-4o-mini` sem nenhuma marca, e o RH decidiu sobre pessoas
 *     achando que lia o modelo configurado.
 *  2. **`provedor_ia='anthropic'` NÃO leva aviso de contingência.** Avisar sempre é o mesmo
 *     que não avisar: o selo perde a capacidade de distinguir.
 *  3. **`modelo_ia = null` ⇒ «modelo não registrado», nunca silêncio (D-30).** Ausência de
 *     selo é indistinguível de proveniência confirmada.
 *  4. **A causa legível vem de `CAUSA_FALLBACK_ROTULO`** (`_shared/ai-error-codes.ts`), não
 *     de uma segunda tabela nesta camada — duas tabelas divergiriam em silêncio.
 *
 * @see src/features/triagem/components/ProvenienciaIABadge.tsx
 * @see .planning/phases/49-consertos-da-jornada-bloco-2/49-13-PLAN.md (Task 1 <behavior>)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import {
  ProvenienciaIABadge,
  PROVENIENCIA_IA_COPY,
  ehResultadoDeContingencia,
  textoProveniencia,
} from '../ProvenienciaIABadge'

describe('ProvenienciaIABadge — resultado de contingência (D-27b)', () => {
  it('provedor openai + modelo real + causa `anthropic_max_tokens` ⇒ diz contingência, o modelo e «não coube»', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="openai"
        modeloIa="gpt-4o-mini-2024"
        fallbackCause="anthropic_max_tokens"
      />,
    )
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toBeInTheDocument()
    expect(selo).toHaveAttribute('data-contingencia', 'true')
    // As três afirmações que o RH precisa: que foi contingência, QUAL modelo, e por quê.
    expect(selo.textContent).toContain('modelo de contingência')
    expect(selo.textContent).toContain('gpt-4o-mini-2024')
    // «não coube» é o rótulo de `anthropic_max_tokens` em CAUSA_FALLBACK_ROTULO — a causa
    // legível vem do `_shared`, não de uma tabela paralela nesta camada.
    expect(selo.textContent).toContain('não coube')
  })

  it('causa `anthropic_timeout` ⇒ «demorou» (a causa muda o texto; não é um aviso genérico)', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="openai"
        modeloIa="gpt-4o-mini"
        fallbackCause="anthropic_timeout"
      />,
    )
    expect(screen.getByTestId('proveniencia-ia-badge').textContent).toContain('demorou')
  })

  it('causa desconhecida degrada para o próprio código — nunca para silêncio nem para uma causa inventada', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="openai"
        modeloIa="gpt-4o-mini"
        fallbackCause="causa_que_nao_existe_ainda"
      />,
    )
    const t = screen.getByTestId('proveniencia-ia-badge').textContent ?? ''
    expect(t).toContain('modelo de contingência')
    expect(t).toContain('causa_que_nao_existe_ainda')
  })
})

describe('ProvenienciaIABadge — resultado do modelo configurado', () => {
  it('provedor anthropic ⇒ NÃO renderiza aviso de contingência, e ainda diz qual modelo respondeu', () => {
    render(<ProvenienciaIABadge provedorIa="anthropic" modeloIa="claude-sonnet-4-6" />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toHaveAttribute('data-contingencia', 'false')
    expect(selo.textContent).not.toContain('contingência')
    expect(selo.textContent).toContain('claude-sonnet-4-6')
  })

  it('provedor anthropic com `fallback_cause` presente NÃO anexa a causa — descreveria uma falha que não houve', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="anthropic"
        modeloIa="claude-sonnet-4-6"
        fallbackCause="anthropic_max_tokens"
      />,
    )
    const t = screen.getByTestId('proveniencia-ia-badge').textContent ?? ''
    expect(t).not.toContain('não coube')
    expect(t).not.toContain('contingência')
  })
})

describe('ProvenienciaIABadge — proveniência desconhecida (D-30)', () => {
  it('modelo_ia null ⇒ «modelo não registrado», e o selo APARECE (nunca silêncio)', () => {
    render(<ProvenienciaIABadge provedorIa="anthropic" modeloIa={null} />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toBeInTheDocument()
    expect(selo.textContent).toContain(PROVENIENCIA_IA_COPY.modeloDesconhecido)
  })

  it('provedor E modelo nulos ⇒ ainda renderiza, dizendo que o modelo não foi registrado', () => {
    render(<ProvenienciaIABadge provedorIa={null} modeloIa={null} />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toBeInTheDocument()
    expect(selo.textContent).toContain(PROVENIENCIA_IA_COPY.modeloDesconhecido)
    expect(selo).toHaveAttribute('data-contingencia', 'false')
  })

  it('contingência com modelo NULL diz as duas coisas — que foi contingência e que o modelo não foi registrado', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="openai"
        modeloIa={null}
        fallbackCause="anthropic_timeout"
      />,
    )
    const t = screen.getByTestId('proveniencia-ia-badge').textContent ?? ''
    expect(t).toContain('modelo de contingência')
    expect(t).toContain(PROVENIENCIA_IA_COPY.modeloDesconhecido)
  })
})

describe('ProvenienciaIABadge — variante compact e os helpers exportados', () => {
  it('compact mostra o modelo sem a causa (cabe inline), e continua dizendo contingência', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="openai"
        modeloIa="gpt-4o-mini"
        fallbackCause="anthropic_max_tokens"
        variant="compact"
      />,
    )
    const t = screen.getByTestId('proveniencia-ia-badge').textContent ?? ''
    expect(t).toContain('modelo de contingência')
    expect(t).toContain('gpt-4o-mini')
    expect(t).not.toContain('não coube')
  })

  it('`ehResultadoDeContingencia` é a REGRA num lugar só: openai sim, anthropic/null não', () => {
    // Se a P1 trocar o primário do callAi, é esta asserção que reprova primeiro — e o
    // conserto é no componente, não em cada tela.
    expect(ehResultadoDeContingencia('openai')).toBe(true)
    expect(ehResultadoDeContingencia('anthropic')).toBe(false)
    expect(ehResultadoDeContingencia(null)).toBe(false)
    expect(ehResultadoDeContingencia(undefined)).toBe(false)
  })

  it('`textoProveniencia` é a MESMA cópia que o PDF imprime (nunca string vazia)', () => {
    expect(
      textoProveniencia({
        provedorIa: 'openai',
        modeloIa: 'gpt-4o-mini',
        fallbackCause: 'anthropic_max_tokens',
      }),
    ).toBe('Gerado pelo modelo de contingência gpt-4o-mini (motivo: não coube)')
    expect(textoProveniencia({ provedorIa: 'anthropic', modeloIa: 'claude-sonnet-4-6' })).toBe(
      'Gerado pelo modelo claude-sonnet-4-6',
    )
    expect(textoProveniencia({ provedorIa: null, modeloIa: null })).toBe(
      'Gerado pelo modelo modelo não registrado',
    )
    // A garantia estrutural: nenhuma combinação produz vazio (vazio apagaria o selo).
    for (const p of ['openai', 'anthropic', null, undefined]) {
      for (const m of ['x', null, undefined]) {
        expect(textoProveniencia({ provedorIa: p, modeloIa: m }).length).toBeGreaterThan(0)
      }
    }
  })
})
