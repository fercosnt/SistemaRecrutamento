/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-07 Task 2 — o backstop do risco central da fase (CONSOL-02).
 *
 * O `HistoricoBlock` deixou de exibir o uuid do `ator` e passou a exibir um dos QUATRO
 * rótulos resolvidos no servidor. Um teste só do caminho feliz passaria com a colisão
 * medida na Correção factual 3 presente — por isso os quatro recortes são exercitados
 * **um por vez**, e as asserções NEGATIVAS valem nos quatro:
 *
 *   · nenhum identificador com forma de uuid alcança o DOM;
 *   · nenhuma célula de autoria fica vazia;
 *   · nenhum traço solto (`—` / `–` / `-`) substitui o rótulo;
 *   · nenhuma linha é omitida — omitir apagaria trilha de decisão, que é o que a
 *     RNF-07a protege.
 *
 * Mais dois que carregam peso próprio:
 *   · o nome completo longo renderiza ÍNTEGRO (truncar apagaria a autoria que o
 *     requirement veio entregar);
 *   · a linha de metadado usa o tamanho de RÓTULO, não o menor tamanho da tela —
 *     invisível num teste de texto, e exatamente o que a D-47-U07 compra.
 *
 * ZERO snapshot: um snapshot passaria numa tela que ficou errada sem mudar de estrutura.
 *
 * Este arquivo é também a prova em tempo de COMPILAÇÃO do contrato do 47-07 Task 1: as
 * fixtures abaixo são `HistoricoRow` literais, então só typecheckam se `HistoricoRow`
 * carrega `ator_rotulo` e NÃO exige mais o uuid do `ator`.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§HistoricoBlock — a tabela dos quatro rótulos)
 * @see src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx (o molde de render desta feature)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HistoricoBlock } from '../HistoricoBlock'
import type { HistoricoRow } from '../../services/historicoCandidaturaService'

/** Forma de identificador universal — nenhum pode alcançar o DOM em nenhum recorte. */
const FORMA_DE_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Uma transição com o rótulo já resolvido pelo servidor. */
function linha(ator_rotulo: string, over: Partial<HistoricoRow> = {}): HistoricoRow {
  return {
    etapa_de: 'triagem',
    etapa_para: 'entrevista',
    ator_rotulo,
    criterio_texto: 'Perfil aderente à vaga.',
    criado_em: '2026-07-16T10:00:00Z',
    ...over,
  }
}

/** Os quatro rótulos do contrato, na ordem da tabela da UI-SPEC. */
const OS_QUATRO_ROTULOS = [
  'Mariana Alves de Souza', // 1 · recrutador vivo → nome completo
  'O próprio candidato', // 2 · o ator é o titular daquela candidatura
  'Recrutador removido', // 3 · ator não-nulo que não resolve
  'Sistema', // 4 · transição automática (o caso majoritário hoje)
] as const

/** A `<div>` de metadado de uma linha: `{rótulo} · {data}`. */
function metadadoDe(container: HTMLElement): HTMLElement {
  const item = container.querySelector('li')
  expect(item).not.toBeNull()
  const meta = item!.querySelector('div.mt-1')
  expect(meta).not.toBeNull()
  return meta as HTMLElement
}

describe('HistoricoBlock — os quatro rótulos do ator (CONSOL-02 / VISRH-03)', () => {
  it('recorte 1 · recrutador vivo → renderiza o NOME COMPLETO, nunca o primeiro nome', () => {
    render(<HistoricoBlock rows={[linha('Mariana Alves de Souza')]} />)
    expect(screen.getByText('Mariana Alves de Souza')).toBeInTheDocument()
  })

  it('recorte 2 · o ator é o titular → renderiza "O próprio candidato"', () => {
    render(<HistoricoBlock rows={[linha('O próprio candidato')]} />)
    expect(screen.getByText('O próprio candidato')).toBeInTheDocument()
  })

  it('recorte 3 · ator não resolve → renderiza "Recrutador removido" (nunca "Não identificado")', () => {
    const { container } = render(<HistoricoBlock rows={[linha('Recrutador removido')]} />)
    expect(screen.getByText('Recrutador removido')).toBeInTheDocument()
    // "Não identificado" já significa falha de resolução nas Phases 42/43/44 — reusá-lo
    // aqui daria dois significados à mesma palavra na mesma aplicação.
    expect(container.textContent).not.toContain('Não identificado')
  })

  it('recorte 4 · transição automática → renderiza "Sistema"', () => {
    render(<HistoricoBlock rows={[linha('Sistema')]} />)
    expect(screen.getByText('Sistema')).toBeInTheDocument()
  })

  it('NEGATIVAS nos quatro recortes: nenhum uuid, nenhuma célula vazia, nenhum traço solto', () => {
    for (const rotulo of OS_QUATRO_ROTULOS) {
      const { container, unmount } = render(<HistoricoBlock rows={[linha(rotulo)]} />)
      const meta = metadadoDe(container)
      const autoria = meta.querySelector('span')

      expect(container.textContent ?? '').not.toMatch(FORMA_DE_UUID)
      expect(autoria).not.toBeNull()
      expect((autoria!.textContent ?? '').trim()).not.toBe('')
      expect((autoria!.textContent ?? '').trim()).not.toMatch(/^[—–-]$/)
      expect((autoria!.textContent ?? '').trim()).toBe(rotulo)
      unmount()
    }
  })

  it('NEGATIVA · nenhuma linha é omitida — os quatro recortes juntos rendem quatro itens', () => {
    const { container } = render(
      <HistoricoBlock rows={OS_QUATRO_ROTULOS.map((r) => linha(r))} />,
    )
    expect(container.querySelectorAll('li')).toHaveLength(4)
    for (const rotulo of OS_QUATRO_ROTULOS) {
      expect(screen.getByText(rotulo)).toBeInTheDocument()
    }
  })

  it('nome completo longo renderiza ÍNTEGRO — sem truncate, sem line-clamp, sem title', () => {
    const nomeLongo = 'Maria Antônia Guimarães de Albuquerque Vasconcelos do Nascimento Filho'
    const { container } = render(<HistoricoBlock rows={[linha(nomeLongo)]} />)

    expect(screen.getByText(nomeLongo)).toBeInTheDocument()
    const autoria = metadadoDe(container).querySelector('span') as HTMLElement
    expect(autoria.textContent).toBe(nomeLongo)
    expect(autoria.className).not.toMatch(/truncate|line-clamp/)
    expect(autoria.hasAttribute('title')).toBe(false)
  })

  it('a linha de metadado quebra em vez de empurrar a data para fora — flex-wrap, sem largura fixa', () => {
    const { container } = render(<HistoricoBlock rows={[linha('Mariana Alves de Souza')]} />)
    const meta = metadadoDe(container)
    expect(meta.className).toContain('flex-wrap')
    expect(meta.className).not.toMatch(/\bw-\[/)
    expect(meta.style.width).toBe('')
  })

  it('a linha de metadado usa o tamanho de RÓTULO (text-sm), não o menor tamanho da tela (D-47-U07)', () => {
    const { container } = render(<HistoricoBlock rows={[linha('Sistema')]} />)
    const meta = metadadoDe(container)
    expect(meta.className).toContain('text-sm')
    expect(meta.className).not.toContain('text-xs')
  })

  it('o nome é distinguido por PESO e OPACIDADE, e a data fica no tratamento de metadado', () => {
    const { container } = render(<HistoricoBlock rows={[linha('Mariana Alves de Souza')]} />)
    const meta = metadadoDe(container)
    const autoria = meta.querySelector('span') as HTMLElement
    expect(autoria.className).toContain('font-semibold')
    expect(autoria.className).toContain('text-white/80')
    expect(meta.className).toContain('text-white/60')
  })

  it('nenhum dos quatro rótulos é distinguido por cor, ícone ou selo (Invariante 9)', () => {
    for (const rotulo of OS_QUATRO_ROTULOS) {
      const { container, unmount } = render(<HistoricoBlock rows={[linha(rotulo)]} />)
      const autoria = metadadoDe(container).querySelector('span') as HTMLElement
      // Mesmo tratamento tipográfico nos quatro — e "Recrutador removido" NÃO é alerta:
      // ninguém errou.
      expect(autoria.className).not.toMatch(/text-red|text-amber|bg-amber|destructive/)
      expect(autoria.querySelector('svg')).toBeNull()
      unmount()
    }
  })

  it('o resto do componente fica intacto: transição, seta escondida, data e critério', () => {
    const { container } = render(<HistoricoBlock rows={[linha('Sistema')]} />)
    expect(screen.getByText('Perfil aderente à vaga.')).toBeInTheDocument()
    expect(container.querySelector('time')).not.toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('o estado vazio continua byte-idêntico — esta fase não toca o vazio', () => {
    render(<HistoricoBlock rows={[]} />)
    expect(screen.getByText('Sem movimentações registradas')).toBeInTheDocument()
  })
})
