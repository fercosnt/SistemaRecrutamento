/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 45 / Plano 45-08 Task 2 (TDD RED) — `ReciboExclusao`: um componente, dois
 * tempos, duas colunas DERIVADAS (ERASE-07).
 *
 * ── POR QUE NENHUM `toMatchSnapshot()` APARECE NESTE ARQUIVO ─────────────────
 * A 45-UI-SPEC (E4·error) é explícita: uma asserção de snapshot do texto do recibo
 * *"passaria numa lista honesta hoje e continuaria passando depois de o motor deixar de
 * apagar algo"*. O risco desta superfície não é o texto mudar — é o **motor** mudar e o
 * texto continuar prometendo. Por isso (r2) confronta cada linha renderizada da coluna
 * «sai» com o `passo_motor` do inventário gerado, e falha quando existe linha sem
 * caminho de código correspondente.
 *
 * ── A ASSIMETRIA ENTRE AS DUAS COLUNAS, E POR QUE ELA NÃO É UM DESLIZE ───────
 * Na coluna «sai», uma linha inaplicável é **omitida**: prometer apagar um arquivo que
 * não existe é superestimar o que o motor faz, e o SC#5 proíbe isso nas duas direções
 * (E4·partial). Na coluna «mantém», as **três linhas obrigatórias** aparecem em todos os
 * recortes: omitir uma retenção faria a exclusão parecer MAIOR do que é, que é a mesma
 * superestimação pelo avesso — e a Regra 4 da §Recibo trava isso nominalmente.
 *
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§O recibo em duas colunas)
 * @see src/features/privacidade/constants/reciboExclusao.generated.ts (o artefato de 45-02)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

import { ReciboExclusao } from '../ReciboExclusao'
import { RECIBO_EXCLUSAO, PASSOS_MOTOR } from '../../constants/reciboExclusao.generated'

/** O recorte completo: titular com currículo e com decisão registrada. */
function renderizar(props: Partial<Parameters<typeof ReciboExclusao>[0]> = {}) {
  return render(
    <ReciboExclusao
      tempo="futuro"
      temCurriculo
      temDecisaoRegistrada
      {...props}
    />,
  )
}

const coluna = (qual: 'sai' | 'mantem') =>
  document.querySelector(`[data-coluna="${qual}"]`) as HTMLElement

const linhas = (qual: 'sai' | 'mantem') =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-recibo-linha="${qual}"]`))

const idsRenderizados = (qual: 'sai' | 'mantem') =>
  linhas(qual).map((no) => no.getAttribute('data-item-id') ?? '')

/** Os três itens que a Regra 4 da §Recibo declara OBRIGATÓRIOS na coluna «mantém». */
const OBRIGATORIOS = RECIBO_EXCLUSAO.colunas_mantem
  .filter((item) => item.obrigatorio)
  .map((item) => item.item_id)

afterEach(() => {
  vi.doUnmock('../../constants/reciboExclusao.generated')
  vi.resetModules()
})

describe('ReciboExclusao — um componente, dois tempos', () => {
  it('(r1) o mesmo item diz coisas diferentes em futuro e em passado', () => {
    const alvo = RECIBO_EXCLUSAO.colunas_sai.find((i) => i.item_id === 'dados_de_cadastro')
    expect(alvo).toBeTruthy()
    // META-TEST: se os dois tempos fossem iguais no artefato, o teste abaixo seria vazio.
    expect(alvo?.texto_futuro).not.toBe(alvo?.texto_passado)

    const futuro = renderizar({ tempo: 'futuro' })
    expect(screen.getByText(alvo!.texto_futuro)).toBeInTheDocument()
    expect(screen.queryByText(alvo!.texto_passado)).toBeNull()
    // O cabeçalho também vira: a coluna «sai» tem cabeçalho próprio por tempo.
    expect(screen.getByText(RECIBO_EXCLUSAO.cabecalhos.sai.futuro)).toBeInTheDocument()
    futuro.unmount()

    renderizar({ tempo: 'passado' })
    expect(screen.getByText(alvo!.texto_passado)).toBeInTheDocument()
    expect(screen.queryByText(alvo!.texto_futuro)).toBeNull()
    expect(screen.getByText(RECIBO_EXCLUSAO.cabecalhos.sai.passado)).toBeInTheDocument()
  })

  it('(r2) BACKSTOP E4·error: toda linha de «sai» tem um passo do motor por trás', () => {
    renderizar()

    const ids = idsRenderizados('sai')
    expect(ids.length).toBeGreaterThan(0)

    for (const id of ids) {
      const item = RECIBO_EXCLUSAO.colunas_sai.find((i) => i.item_id === id)
      expect(item, `linha renderizada "${id}" não existe no inventário derivado`).toBeTruthy()
      // ⚠ O CORAÇÃO DA INVARIANTE 4: uma linha só pode dizer "apagado" se existir
      // caminho de código que a apague. Sem `passo_motor` no vocabulário fechado do
      // gerador, a linha é uma promessa que nenhum código cumpre.
      expect(
        (PASSOS_MOTOR as readonly string[]).includes(item!.passo_motor),
        `linha "${id}" declara o passo "${item!.passo_motor}", que não está em PASSOS_MOTOR`,
      ).toBe(true)
      expect((item!.passo_motor_onde ?? '').length).toBeGreaterThan(0)
    }
  })

  it('(r3) BACKSTOP E4·partial: os dois recortes perigosos OMITEM a linha inaplicável', () => {
    // Recorte 1 — titular SEM currículo. Prometer apagar um arquivo que não existe é
    // superestimar na direção oposta, e é igualmente proibido pelo SC#5.
    const semCurriculo = renderizar({ temCurriculo: false })
    expect(idsRenderizados('sai')).not.toContain('arquivo_do_curriculo')
    exigirLinhasComTexto()
    semCurriculo.unmount()

    // Recorte 2 — titular SEM decisão registrada: não há justificativa a desligar.
    renderizar({ temDecisaoRegistrada: false })
    expect(idsRenderizados('sai')).not.toContain('ligacao_com_a_justificativa')
    expect(idsRenderizados('mantem')).not.toContain('registro_da_decisao')
    exigirLinhasComTexto()

    // E o que é `sempre` continua nos dois recortes — a omissão é cirúrgica, não uma
    // coluna encolhendo por acidente.
    expect(idsRenderizados('sai')).toContain('dados_de_cadastro')
  })

  it('(r4) as TRÊS linhas obrigatórias de «mantém» aparecem em TODOS os recortes', () => {
    // ⚠ AQUI A REGRA É O INVERSO DA (r3), E DE PROPÓSITO. Omitir uma retenção faria a
    // exclusão parecer maior do que é — "a superestimação que o SC#5 proíbe", nas
    // palavras da Regra 4. Por isso `obrigatorio: true` vence o filtro de
    // aplicabilidade na coluna «mantém», inclusive no recorte sem decisão registrada.
    expect(OBRIGATORIOS).toHaveLength(3)

    const recortes = [
      { temCurriculo: true, temDecisaoRegistrada: true },
      { temCurriculo: false, temDecisaoRegistrada: true },
      { temCurriculo: true, temDecisaoRegistrada: false },
      { temCurriculo: false, temDecisaoRegistrada: false },
    ]

    for (const recorte of recortes) {
      const { unmount } = renderizar(recorte)
      for (const id of OBRIGATORIOS) {
        expect(
          idsRenderizados('mantem'),
          `linha obrigatória "${id}" sumiu no recorte ${JSON.stringify(recorte)}`,
        ).toContain(id)
      }
      unmount()
    }
  })

  it('(r5) cada linha de «mantém» traz a citação legal NO MESMO nó da lista', () => {
    renderizar()

    for (const no of linhas('mantem')) {
      const id = no.getAttribute('data-item-id')
      const item = RECIBO_EXCLUSAO.colunas_mantem.find((i) => i.item_id === id)
      expect(item).toBeTruthy()
      // Nunca em nota de rodapé, nunca em tooltip: uma justificativa legal escondida
      // atrás de hover é uma justificativa que a maioria nunca lê.
      expect(within(no).getByText(item!.base_legal)).toBeInTheDocument()
      expect(no.getAttribute('title')).toBeNull()
      // 14px/600 — e o 5º tamanho (12px) não é criado por esta fase nem na citação.
      const citacao = within(no).getByText(item!.base_legal)
      expect(citacao.className).toContain('text-sm')
      expect(citacao.className).toContain('font-semibold')
    }
  })
})

describe('ReciboExclusao — o layout é uma relação semântica, não uma tabela', () => {
  it('(r6) as duas colunas têm tratamento visual IDÊNTICO', () => {
    renderizar()
    // Pintar «sai» de vermelho e «mantém» de verde transformaria um relato factual num
    // julgamento — como se preservar a prova de não-discriminação do Art. 7º, VI fosse
    // uma concessão ou uma falha. A distinção é por cabeçalho e conteúdo.
    expect(coluna('sai').className).toBe(coluna('mantem').className)
    expect(coluna('sai').className).toContain('border-white/15')
    expect(coluna('sai').className).toContain('bg-white/5')
    expect(coluna('sai').className).not.toContain('destructive')
    expect(coluna('mantem').className).not.toContain('green')
  })

  it('(r7) cabeçalhos REAIS nos dois grupos — em coluna única é o que preserva o pareamento', () => {
    renderizar()

    const titulos = screen.getAllByRole('heading').map((no) => no.textContent ?? '')
    expect(titulos).toContain(RECIBO_EXCLUSAO.cabecalhos.sai.futuro)
    expect(titulos).toContain(RECIBO_EXCLUSAO.cabecalhos.mantem.futuro)

    // A ordem em coluna única é «sai» → «mantém» (ordem de DOM), e a grade só entra a
    // partir de `sm:` — nunca uma `<table>` de 320px, nunca scroll horizontal.
    const grade = document.querySelector('[data-recibo]') as HTMLElement
    expect(grade.className).toContain('sm:grid-cols-2')
    expect(grade.className).toContain('gap-4')
    expect(grade.querySelectorAll('table').length).toBe(0)
    const colunas = Array.from(grade.querySelectorAll('[data-coluna]')).map((no) =>
      no.getAttribute('data-coluna'),
    )
    expect(colunas).toEqual(['sai', 'mantem'])
  })

  it('(r8) NEGATIVAS de fonte: item e citação renderizam íntegros, sem corte', () => {
    const fonte = semComentarios(lerFonte('../ReciboExclusao.tsx'))
    const proibidos = [
      ['<', 'table'].join(''),
      ['trunc', 'ate'].join(''),
      ['line', 'clamp'].join('-'),
      ['overflow', 'x'].join('-'),
      ['text', 'xs'].join('-'),
    ]
    for (const proibido of proibidos) {
      expect(fonte.includes(proibido), `token proibido "${proibido}" no componente`).toBe(false)
      expect(`x${proibido}y`).toContain(proibido) // META-TEST
    }

    // E a prova no DOM, não só na fonte: truncar a base legal de uma retenção é apagar
    // a justificativa que a torna legítima.
    renderizar()
    for (const no of [...linhas('sai'), ...linhas('mantem')]) {
      expect(no.className).not.toContain('truncate')
      expect(no.className).not.toContain('line-clamp')
    }
  })
})

describe('ReciboExclusao — derivação vazia é FALHA, nunca estado vazio', () => {
  it('(r9) sem itens aplicáveis o componente devolve null e AVISA o pai', async () => {
    // Um recibo vazio ao lado de um botão que apaga seria a pior tela desta fase
    // (E4·empty). O artefato real torna isso impossível — 16 dos 20 itens são
    // `sempre` —, então o cenário é montado por injeção: é a única forma honesta de
    // provar o ramo sem enfraquecer o componente com uma prop de fonte de dados.
    vi.resetModules()
    vi.doMock('../../constants/reciboExclusao.generated', () => ({
      PASSOS_MOTOR: [],
      RECIBO_EXCLUSAO: {
        ...RECIBO_EXCLUSAO,
        colunas_sai: [],
        colunas_mantem: [],
      },
    }))

    const { ReciboExclusao: Vazio } = await import('../ReciboExclusao')
    const onFalhaDerivacao = vi.fn()
    const { container } = render(
      <Vazio
        tempo="futuro"
        temCurriculo
        temDecisaoRegistrada
        onFalhaDerivacao={onFalhaDerivacao}
      />,
    )

    expect(container.textContent).toBe('')
    expect(onFalhaDerivacao).toHaveBeenCalledTimes(1)
  })
})

/** Lê um arquivo-fonte relativo a ESTE teste (sonda de escopo declarado). */
function lerFonte(relativo: string): string {
  return readFileSync(fileURLToPath(new URL(relativo, import.meta.url)), 'utf8')
}

/** Remove linhas de comentário antes da sonda — ver o (w11) do `ExcluirDadosBloco`. */
function semComentarios(fonte: string): string {
  return fonte
    .split('\n')
    .filter((linha) => !/^\s*(\/\/|\/\*|\*)/.test(linha))
    .join('\n')
}

/** Nenhuma linha renderizada pode existir vazia — omitir é diferente de esvaziar. */
function exigirLinhasComTexto() {
  const todas = [...linhas('sai'), ...linhas('mantem')]
  expect(todas.length).toBeGreaterThan(0)
  for (const no of todas) {
    expect(
      (no.textContent ?? '').trim().length,
      `linha "${no.getAttribute('data-item-id')}" renderizada sem texto`,
    ).toBeGreaterThan(0)
  }
}
