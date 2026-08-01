/**
 * Phase 43 / Plan 43-03 Tasks 2-3 — o passo de autorizações do cadastro.
 *
 * Esta suíte é o gate de QUATRO afirmações que, se falsas, tornam a prova de
 * consentimento gravada em `public.autorizacoes` uma prova de coisa nenhuma:
 *
 * 1. **Nada nasce marcado** (CONSENT-01). Um checkbox pré-marcado faz "a pessoa
 *    marcou" e "a pessoa não desmarcou" produzirem a mesma linha.
 * 2. **A tela mostra BYTE-A-BYTE o texto de que o servidor calcula o hash**
 *    (CONSENT-02). Uma paráfrase na tela produz uma linha cujo
 *    `consent_text_hash` não corresponde a texto nenhum — e a afirmação falsa é
 *    indistinguível da verdadeira.
 * 3. **O canal transacional é INFORMAÇÃO, não controle** (Invariante 3). Um
 *    controle que a pessoa não pode desligar, apresentado como escolha, é a forma
 *    mais pura do dark pattern que este milestone existe para curar.
 * 4. **A análise de vídeo não é pedida em lugar nenhum** (CONSENT-05 / BD-2).
 *
 * ⚠ IGUALDADE, NUNCA `toContain`. As asserções de copy comparam a STRING COMPLETA
 * contra o valor do `consent-text.json`. `includes` prova presença, não identidade
 * — e foi exatamente essa fraqueza que deixou o W-01 passar na P39. Um texto
 * renderizado com uma vírgula a mais CONTÉM o texto do arquivo e mesmo assim
 * hasheia diferente.
 *
 * ⚠ IDENTIFICADORES PROIBIDOS SÃO MONTADOS EM RUNTIME. Um teste que proíbe um
 * literal e o contém é auto-invalidante (idioma da 42-11).
 *
 * ⚠ ASSERÇÕES NEGATIVAS SÃO ESTRUTURAIS, NÃO TEXTUAIS. Olhar só o texto visível
 * não pegaria um `<input disabled>` acrescentado na linha informativa depois.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { useForm, FormProvider } from 'react-hook-form'
import type { ReactNode } from 'react'

import { AutorizacoesStep } from '../AutorizacoesStep'
import { CADASTRO_DEFAULT_VALUES } from '../../CadastroMultiStepForm'
import { POLICY_VERSION, CONSENT_TEXT_VERSION } from '../../../constants'
import corpus from '../../../../../../supabase/functions/_shared/consent-text.json'

// Identificador APOSENTADO, montado em runtime — ver ⚠ no cabeçalho.
const CHAVE_VIDEO = ['autorizacao', 'analise', 'video'].join('_')
const PALAVRA_VIDEO = ['ví', 'deo'].join('')

/**
 * Wrapper com os defaultValues REAIS do formulário. Uma cópia local dos defaults
 * deixaria este teste verde para sempre enquanto o formulário derivasse.
 */
function Wrapper({ children }: { children: ReactNode }) {
  const methods = useForm({ defaultValues: CADASTRO_DEFAULT_VALUES })
  return <FormProvider {...methods}>{children}</FormProvider>
}

function renderStep(largura?: string) {
  const resultado = render(
    <Wrapper>
      <AutorizacoesStep />
    </Wrapper>
  )
  if (largura) {
    resultado.container.style.width = largura
  }
  return resultado
}

// ─────────────────────────────────────────────────────────────────────────────
// (a) Defaults — CONSENT-01
// ─────────────────────────────────────────────────────────────────────────────

describe('(a) os consentimentos nascem DESMARCADOS (CONSENT-01)', () => {
  it.each(corpus.consentimentos.map((c) => c.id))(
    '`%s` não está marcado ao abrir o passo',
    (id) => {
      renderStep()
      const controle = document.getElementById(id)
      expect(controle).not.toBeNull()
      // Asserção sobre o ESTADO do controle, não sobre a presença do elemento:
      // um checkbox presente e marcado passaria numa asserção de presença.
      expect(controle).toHaveAttribute('aria-checked', 'false')
    }
  )

  it('há exatamente três controles de consentimento na tela', () => {
    renderStep()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (b) Identidade com a fonte do hash — CONSENT-02
// ─────────────────────────────────────────────────────────────────────────────

describe('(b) a tela renderiza BYTE-A-BYTE o texto de que o servidor calcula o hash (CONSENT-02)', () => {
  it.each(corpus.consentimentos.map((c) => [c.id, c.rotulo, c.descricao]))(
    '`%s`: rótulo e descrição são IGUAIS aos do consent-text.json',
    (id, rotulo, descricao) => {
      renderStep()
      // Igualdade por string completa — nunca `toContain` (ver ⚠ no cabeçalho).
      expect(screen.getByTestId(`consent-label-${id}`).textContent).toBe(rotulo)
      expect(screen.getByTestId(`consent-desc-${id}`).textContent).toBe(descricao)
    }
  )

  it('a linha informativa também vem do arquivo, não de literal no componente', () => {
    renderStep()
    const info = corpus.informativo_transacional
    expect(screen.getByTestId('transacional-rotulo').textContent).toBe(info.rotulo)
    expect(screen.getByTestId('transacional-estado').textContent).toBe(info.estado)
    expect(screen.getByTestId('transacional-descricao').textContent).toBe(
      info.descricao
    )
    expect(screen.getByTestId('transacional-base-legal').textContent).toBe(
      info.base_legal
    )
    expect(screen.getByTestId('transacional-fronteira').textContent).toBe(
      info.fronteira
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (c) A análise de vídeo não existe — CONSENT-05 / BD-2
// ─────────────────────────────────────────────────────────────────────────────

describe('(c) a permissão de análise de vídeo desapareceu do passo (CONSENT-05)', () => {
  it('nenhum elemento carrega o id ou o name da autorização de vídeo', () => {
    const { container } = renderStep()
    expect(document.getElementById(CHAVE_VIDEO)).toBeNull()
    expect(container.querySelector(`[name="${CHAVE_VIDEO}"]`)).toBeNull()
    expect(container.querySelector(`[name*="${CHAVE_VIDEO}"]`)).toBeNull()
  })

  it('a palavra não aparece em texto nenhum do passo', () => {
    renderStep()
    // Portal-safe: lê de document.body, não de container.textContent — conteúdo
    // em portal deixa o container vazio e a asserção passaria sem olhar nada
    // (3 falsos verdes medidos na 42-10).
    expect(document.body.textContent?.toLowerCase()).not.toContain(PALAVRA_VIDEO)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (d) O transacional não é controle — Invariante 3
// ─────────────────────────────────────────────────────────────────────────────

describe('(d) o canal transacional é informação, não opção (Invariante 3)', () => {
  it('a região informativa não contém controle algum', () => {
    renderStep()
    const regiao = screen.getByTestId('transacional-informativo')
    const proibidos = [
      '[role="checkbox"]',
      '[role="switch"]',
      '[aria-checked]',
      '[aria-disabled]',
      'input',
      'button',
    ]
    for (const seletor of proibidos) {
      expect(regiao.querySelectorAll(seletor)).toHaveLength(0)
    }
  })

  it('a região informativa está FORA do fieldset de escolhas', () => {
    const { container } = renderStep()
    const fieldset = container.querySelector('fieldset')
    expect(fieldset).not.toBeNull()
    const regiao = screen.getByTestId('transacional-informativo')
    expect(fieldset?.contains(regiao)).toBe(false)
  })

  it('o fieldset envolve apenas os DOIS consentimentos opcionais', () => {
    const { container } = renderStep()
    const fieldset = container.querySelector('fieldset')
    expect(within(fieldset as HTMLElement).getAllByRole('checkbox')).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (e) As duas versões
// ─────────────────────────────────────────────────────────────────────────────

describe('(e) a pessoa lê QUAL versão de QUAL coisa está aceitando', () => {
  it('o rodapé nomeia a versão da política E a do texto de autorizações', () => {
    renderStep()
    const legenda = screen.getByTestId('legenda-versoes').textContent ?? ''
    expect(legenda).toContain(POLICY_VERSION)
    expect(legenda).toContain(CONSENT_TEXT_VERSION)
    // Cada versão tem de vir NOMEADA — um "Versão X" solto ao lado de duas
    // versões diferentes é ambíguo, que é o defeito que esta linha corrige.
    expect(legenda).toContain('Política de Privacidade')
    expect(legenda.toLowerCase()).toContain('autorizações')
  })

  it('o aviso final nomeia a qual versão ele se refere', () => {
    renderStep()
    const aviso = screen.getByTestId('aviso-versao-politica').textContent ?? ''
    expect(aviso).toContain('Política de Privacidade')
    expect(aviso).toContain(POLICY_VERSION)
    expect(aviso).not.toContain(CONSENT_TEXT_VERSION)
  })

  it('as duas versões são constantes DIFERENTES — reusar cunharia versão falsa', () => {
    expect(POLICY_VERSION).not.toBe(CONSENT_TEXT_VERSION)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// (f) Backstop E1 — texto longo a 320px
// ─────────────────────────────────────────────────────────────────────────────

describe('(f) backstop E1 — a descrição não é truncada a 320px', () => {
  // ⚠ ESCOPO HONESTO DESTE BACKSTOP: happy-dom NÃO calcula layout, então nenhum
  // teste aqui prova que o texto QUEBRA bem a 320px. O que ele prova é o que é
  // provável sem layout: que nenhuma classe de truncamento está aplicada e que o
  // texto COMPLETO está no DOM. Truncar aqui truncaria a entrada do hash — a
  // pessoa consentiria com um texto e o servidor hashearia outro. A verificação
  // visual de quebra real fica para o UAT (43-07).
  const CLASSES_DE_TRUNCAMENTO = [
    'truncate',
    'text-ellipsis',
    'overflow-hidden',
    'line-clamp-',
    'whitespace-nowrap',
  ]

  it.each(corpus.consentimentos.map((c) => [c.id, c.descricao]))(
    '`%s`: sem truncamento no elemento nem em ancestral dentro do cartão',
    (id, descricao) => {
      renderStep('320px')
      const el = screen.getByTestId(`consent-desc-${id}`)
      expect(el.textContent).toBe(descricao)

      let no: HTMLElement | null = el
      while (no && no !== document.body) {
        const classes = no.className ?? ''
        for (const proibida of CLASSES_DE_TRUNCAMENTO) {
          expect(String(classes)).not.toContain(proibida)
        }
        no = no.parentElement
      }
    }
  )
})
