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
 *  3. **`modelo_ia = null` ⇒ «Modelo não registrado», nunca silêncio (D-30).** Ausência de
 *     selo é indistinguível de proveniência confirmada. A frase é INTEIRA (52-05 / D-23) e
 *     o parêntese de data só aparece quando a data é ≤ 22/09/2026 (D-52-U17).
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

describe('ProvenienciaIABadge — proveniência desconhecida (D-30, frase inteira — 52-05 / D-23)', () => {
  // 52-05: estas asserções pinavam um FRAGMENTO minúsculo («modelo não registrado») com
  // `toContain` — e passavam com o defeito na tela, porque a frase errada («Gerado pelo
  // modelo» + o fragmento) também contém o fragmento. Agora pinam a frase INTEIRA.
  it('modelo_ia null ⇒ «Modelo não registrado», e o selo APARECE (nunca silêncio)', () => {
    render(<ProvenienciaIABadge provedorIa="anthropic" modeloIa={null} />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toBeInTheDocument()
    expect(selo.textContent).toBe(PROVENIENCIA_IA_COPY.semModelo)
    expect(selo.textContent).not.toMatch(/modelo\s+modelo/i)
  })

  it('provedor E modelo nulos ⇒ ainda renderiza, dizendo que o modelo não foi registrado', () => {
    render(<ProvenienciaIABadge provedorIa={null} modeloIa={null} />)
    const selo = screen.getByTestId('proveniencia-ia-badge')
    expect(selo).toBeInTheDocument()
    expect(selo.textContent).toBe(PROVENIENCIA_IA_COPY.semModelo)
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
    expect(t.startsWith(PROVENIENCIA_IA_COPY.contingenciaSemModelo)).toBe(true)
    expect(t).toContain('demorou')
    expect(t).not.toMatch(/modelo\s+modelo/i)
  })
})

describe('ProvenienciaIABadge — a data da análise só quando é verdadeira (52-05 / D-52-U17)', () => {
  it('a cópia nova tem as três frases inteiras, com os textos exatos da UI-SPEC', () => {
    expect(PROVENIENCIA_IA_COPY.semModelo).toBe('Modelo não registrado')
    expect(PROVENIENCIA_IA_COPY.semModeloAntigo).toBe(
      'Modelo não registrado (análise anterior a 22/09/2026)',
    )
    expect(PROVENIENCIA_IA_COPY.contingenciaSemModelo).toBe(
      'Gerado pelo modelo de contingência (modelo não registrado)',
    )
    // A chave do fragmento que ocupava `{modelo}` saiu: ela só servia à substituição que
    // produzia o «modelo» duplicado.
    expect(Object.values(PROVENIENCIA_IA_COPY)).not.toContain('modelo não registrado')
  })

  it('modelo nulo com análise de 22/09/2026 às 23:30 (São Paulo) ⇒ parêntese de data (dia inclusive)', () => {
    expect(
      textoProveniencia({
        provedorIa: 'anthropic',
        modeloIa: null,
        geradoEm: '2026-09-22T23:30:00-03:00',
      }),
    ).toBe('Modelo não registrado (análise anterior a 22/09/2026)')
  })

  it('modelo nulo com análise de 23/09/2026 às 00:10 (São Paulo) ⇒ SEM parêntese', () => {
    expect(
      textoProveniencia({
        provedorIa: 'anthropic',
        modeloIa: null,
        geradoEm: '2026-09-23T00:10:00-03:00',
      }),
    ).toBe('Modelo não registrado')
  })

  it('o dia é o de São Paulo, não o de UTC: 23/09 02:30Z é 22/09 23:30 em SP ⇒ parêntese', () => {
    expect(
      textoProveniencia({ provedorIa: null, modeloIa: null, geradoEm: '2026-09-23T02:30:00Z' }),
    ).toBe(PROVENIENCIA_IA_COPY.semModeloAntigo)
  })

  it('sem data, ou data ilegível ⇒ só «Modelo não registrado» (nunca uma razão inventada)', () => {
    for (const geradoEm of [null, undefined, '', 'não é data']) {
      expect(textoProveniencia({ provedorIa: null, modeloIa: null, geradoEm })).toBe(
        PROVENIENCIA_IA_COPY.semModelo,
      )
    }
  })

  it('modelo vazio conta como não registrado (não imprime «Gerado pelo modelo » sem nome)', () => {
    expect(textoProveniencia({ provedorIa: 'anthropic', modeloIa: '' })).toBe(
      PROVENIENCIA_IA_COPY.semModelo,
    )
  })

  it('o selo aceita `geradoEm` e diz a frase com data', () => {
    render(
      <ProvenienciaIABadge
        provedorIa="anthropic"
        modeloIa={null}
        geradoEm="2026-09-10T12:00:00Z"
        variant="compact"
      />,
    )
    expect(screen.getByTestId('proveniencia-ia-badge').textContent).toBe(
      PROVENIENCIA_IA_COPY.semModeloAntigo,
    )
  })

  it('com modelo registrado a frase NÃO muda, com ou sem data', () => {
    for (const geradoEm of [null, '2026-09-10T12:00:00Z', '2026-10-01T12:00:00Z']) {
      expect(
        textoProveniencia({ provedorIa: 'anthropic', modeloIa: 'claude-sonnet-4-6', geradoEm }),
      ).toBe('Gerado pelo modelo claude-sonnet-4-6')
    }
  })

  it('contingência sem modelo NÃO ganha o parêntese de data — a frase da contingência é outra', () => {
    expect(
      textoProveniencia({
        provedorIa: 'openai',
        modeloIa: null,
        geradoEm: '2026-09-10T12:00:00Z',
        comCausa: false,
      }),
    ).toBe(PROVENIENCIA_IA_COPY.contingenciaSemModelo)
  })

  it('TODA combinação provedor × modelo × data × causa: nunca «modelo» duas vezes, nunca vazio, e a data só quando ≤ 22/09/2026', () => {
    const provedores = [null, 'anthropic', 'openai'] as const
    const modelos = [null, 'x'] as const
    const datas = [
      { geradoEm: null, antiga: false },
      { geradoEm: '2026-09-22T23:59:00-03:00', antiga: true },
      { geradoEm: '2026-09-23T00:01:00-03:00', antiga: false },
    ] as const
    let combinacoes = 0
    for (const provedorIa of provedores) {
      for (const modeloIa of modelos) {
        for (const { geradoEm, antiga } of datas) {
          for (const comCausa of [true, false]) {
            const t = textoProveniencia({
              provedorIa,
              modeloIa,
              geradoEm,
              comCausa,
              fallbackCause: 'anthropic_timeout',
            })
            combinacoes += 1
            const ctx = JSON.stringify({ provedorIa, modeloIa, geradoEm, comCausa, t })
            expect(t, ctx).not.toMatch(/modelo\s+modelo/i)
            expect(t.length, ctx).toBeGreaterThan(0)
            // D-52-U17: a razão datada só aparece para modelo nulo, fora da contingência,
            // com data ≤ 22/09/2026 — em qualquer outro caso seria uma afirmação falsa.
            const deveTerData = modeloIa === null && provedorIa !== 'openai' && antiga
            expect(t.includes('anterior a 22/09/2026'), ctx).toBe(deveTerData)
          }
        }
      }
    }
    expect(combinacoes).toBe(provedores.length * modelos.length * datas.length * 2)
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
    // 52-05 (D-23): esta asserção pinava o PRÓPRIO defeito. A frase de modelo nulo é inteira.
    expect(textoProveniencia({ provedorIa: null, modeloIa: null })).toBe('Modelo não registrado')
    // A garantia estrutural: nenhuma combinação produz vazio (vazio apagaria o selo).
    for (const p of ['openai', 'anthropic', null, undefined]) {
      for (const m of ['x', null, undefined]) {
        expect(textoProveniencia({ provedorIa: p, modeloIa: m }).length).toBeGreaterThan(0)
      }
    }
  })
})
