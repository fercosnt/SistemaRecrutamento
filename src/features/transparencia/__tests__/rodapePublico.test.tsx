/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 47 / Plano 47-08 Task 2 — `RodapePublico`: o componente cujo único trabalho é
 * fazer as duas páginas públicas de transparência serem **encontradas**.
 *
 * ── O QUE ESTE ARQUIVO PROTEGE, E POR QUE NÃO É O TEXTO ─────────────────────
 * O risco desta entrega não é a copy: são dois rótulos curtos, travados na constante. O
 * risco é a **altura**. Um `<a>` de texto corrido tem cerca de 20px — menos da metade do
 * piso de 44px deste projeto — e isso é **invisível** num teste que só olhe conteúdo. Por
 * isso o piso de alvo tátil é asserido **estruturalmente**, em CADA link, e é asserido no
 * próprio elemento acionável e não num contêiner ancestral: um ancestral alto com uma
 * âncora baixa dentro dele passa em qualquer asserção de contêiner e continua sendo
 * impossível de acertar com o polegar.
 *
 * ── A SEGUNDA PROPRIEDADE: O QUE O RODAPÉ *NÃO* É ───────────────────────────
 * A 47-UI-SPEC declara uma lista de proibições (marca, endereço, telefone, rede social,
 * direitos autorais, qualquer terceiro link) porque a pressão natural sobre um rodapé é
 * ele crescer. As asserções negativas abaixo existem para que "completar" o rodapé seja
 * um teste vermelho e não uma revisão de gosto.
 *
 * ── POR QUE NENHUM SNAPSHOT ─────────────────────────────────────────────────
 * Um snapshot passaria num rodapé que perdeu o piso de alvo tátil sem mudar de texto.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`RodapePublico`)
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

import { RodapePublico } from '../components/RodapePublico'
import { COPY_TRANSPARENCIA } from '../constants/copyTransparencia'

const COPY = COPY_TRANSPARENCIA.rodape
const RAIZ = resolve(__dirname, '../../../..')
const CAMINHO = join(RAIZ, 'src/features/transparencia/components/RodapePublico.tsx')
const FONTE = readFileSync(CAMINHO, 'utf8')

/**
 * O código **sem** comentário. O docblock deste componente lista nominalmente o que é
 * proibido nele; varrer o arquivo inteiro reprovaria a documentação da própria proibição
 * — o defeito de portão auto-invalidante que este projeto já pagou duas vezes (Phases 43
 * e 44) e que a 47-UI-SPEC registra na §Bans.
 */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((linha) => !/^\s*\/\//.test(linha))
  .join('\n')

function renderizar() {
  return render(
    <MemoryRouter>
      <RodapePublico />
    </MemoryRouter>,
  )
}

const raiz = () => document.querySelector<HTMLElement>('[data-rodape="publico"]')
const links = () => Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-rodape="publico"] a'))

describe('o contrato: dois links, e nada mais', () => {
  it('(1) renderiza EXATAMENTE dois links', () => {
    renderizar()
    expect(raiz()).not.toBeNull()
    expect(links()).toHaveLength(2)
  })

  it('(2) os dois rótulos vêm da constante de copy, na ordem da especificação', () => {
    renderizar()
    expect(links().map((a) => a.textContent?.trim())).toEqual([
      COPY.privacidade,
      COPY.subprocessadores,
    ])
  })

  it('(3) os destinos são as duas páginas públicas de transparência', () => {
    renderizar()
    expect(screen.getByRole('link', { name: COPY.privacidade })).toHaveAttribute(
      'href',
      '/privacidade',
    )
    expect(screen.getByRole('link', { name: COPY.subprocessadores })).toHaveAttribute(
      'href',
      '/subprocessadores',
    )
  })

  it('(4) o ponto de referência de navegação tem nome acessível — e o nome NÃO é um terceiro link', () => {
    renderizar()
    const navegacao = screen.getByRole('navigation', { name: COPY.rotuloNavegacao })
    expect(navegacao).toBe(raiz())
    expect(links()).toHaveLength(2)
  })

  it('(5) nenhuma string literal de copy dentro do JSX — os rótulos só existem na constante', () => {
    expect(CODIGO).toContain('COPY_TRANSPARENCIA')
    for (const rotulo of Object.values(COPY)) {
      expect(CODIGO, `o rótulo «${rotulo}» está escrito dentro do componente`).not.toContain(
        rotulo,
      )
    }
  })
})

describe('o modo de falha mais provável da fase: a altura, não o texto', () => {
  it('(6) CADA link carrega o piso de alvo tátil de 44px, no próprio elemento acionável', () => {
    renderizar()
    const acionaveis = links()
    expect(acionaveis).toHaveLength(2)
    for (const link of acionaveis) {
      expect(link.className, `link "${link.textContent}" sem piso de alvo tátil`).toContain(
        'min-h-[44px]',
      )
      // O piso só serve se a caixa realmente ocupar a altura: uma âncora `inline` ignora
      // `min-height` em CSS, e a asserção de classe sozinha passaria mesmo assim.
      expect(link.className).toMatch(/\b(flex|inline-flex|grid)\b/)
    }
  })

  it('(7) o piso está no código-fonte em duas ocorrências — uma por link', () => {
    const pisos = CODIGO.match(/min-h-\[44px\]/g) ?? []
    expect(pisos.length).toBeGreaterThanOrEqual(2)
  })
})

describe('a lista de proibições — um rodapé de alcançabilidade, não institucional', () => {
  const PROIBIDOS = [
    'copyright',
    '©',
    'instagram',
    'facebook',
    'linkedin',
    'whatsapp',
    'newsletter',
  ]

  it('(8) nenhum item proibido aparece no DOM renderizado', () => {
    const { container } = renderizar()
    const texto = (container.textContent ?? '').toLowerCase()
    for (const proibido of PROIBIDOS) {
      expect(texto, `o rodapé renderizou «${proibido}»`).not.toContain(proibido)
    }
  })

  it('(9) sem marca, sem canal de contato, sem controle acionável além dos dois links', () => {
    renderizar()
    const no = raiz() as HTMLElement
    expect(no.querySelector('img')).toBeNull()
    expect(no.querySelector('svg')).toBeNull()
    expect(no.querySelector('button')).toBeNull()
    expect(no.querySelector('form')).toBeNull()
    expect(no.querySelector('input')).toBeNull()
    expect(no.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(no.querySelector('a[href^="tel:"]')).toBeNull()
    expect(no.querySelector('a[target="_blank"]')).toBeNull()
  })

  it('(10) nenhum item proibido aparece no código-fonte fora de comentário', () => {
    for (const proibido of [...PROIBIDOS, '<img']) {
      expect(CODIGO.toLowerCase(), `o componente traz «${proibido}»`).not.toContain(proibido)
    }
  })
})

describe('a forma: separado, empilhado no telefone, e nunca comendo a dobra', () => {
  it('(11) é separado do conteúdo por linha divisória, com o respiro da escala', () => {
    renderizar()
    const classes = (raiz() as HTMLElement).className
    expect(classes).toContain('border-t')
    expect(classes).toContain('pt-6')
  })

  it('(12) empilha abaixo do ponto de quebra e fica lado a lado acima dele', () => {
    renderizar()
    const classes = (raiz() as HTMLElement).className
    expect(classes).toContain('flex-col')
    expect(classes).toContain('sm:flex-row')
    expect(classes).toContain('gap-4')
  })

  it('(13) NUNCA fixo, grudado nem sobreposto — um rodapé grudado comeria dobra a 320px', () => {
    renderizar()
    const classes = (raiz() as HTMLElement).className
    for (const posicionamento of ['fixed', 'sticky', 'absolute']) {
      expect(classes, `o rodapé usa «${posicionamento}»`).not.toContain(posicionamento)
    }
    expect(CODIGO).not.toMatch(/\bfixed\b|\bsticky\b/)
  })
})

describe('zero estado, zero consulta, zero render assíncrono', () => {
  it('(14) nada de esqueleto, de espera ou de anúncio de desfecho no DOM', () => {
    renderizar()
    const no = raiz() as HTMLElement
    expect(no.querySelector('.animate-pulse')).toBeNull()
    expect(no.querySelector('[aria-busy="true"]')).toBeNull()
    expect(no.querySelector('[role="status"]')).toBeNull()
    expect(no.querySelector('[role="alert"]')).toBeNull()
  })

  it('(15) o componente não tem estado e não consulta nada', () => {
    expect(CODIGO).not.toMatch(/useState|useEffect|useQuery|supabase\./)
  })
})

describe('o docblock registra o que ele é e o que ele NÃO é', () => {
  it('(16) declara que é um rodapé de alcançabilidade, não institucional', () => {
    expect(FONTE).toMatch(/alcançabilidade/i)
    expect(FONTE).toMatch(/institucional/i)
  })

  it('(17) lista nominalmente as proibições, para a próxima pessoa que quiser "completar" o rodapé', () => {
    for (const item of ['marca', 'endereço', 'telefone', 'rede social', 'direitos autorais']) {
      expect(FONTE.toLowerCase(), `o docblock não registra a proibição de «${item}»`).toContain(
        item,
      )
    }
  })
})
