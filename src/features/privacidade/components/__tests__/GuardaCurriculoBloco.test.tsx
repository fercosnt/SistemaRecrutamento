/// <reference types="@testing-library/jest-dom" />
/**
 * Phase 43 / Plano 43-08 Task 3, caso (d) — os TRÊS casos do bloco de guarda do
 * currículo (RETEN-03), e a asserção que os atravessa: **nenhum deles promete exclusão**.
 *
 * `autorizacao_retencao_curriculo` foi coletada desde o M1 e nunca lida por ninguém.
 * Este bloco é o primeiro consumidor real dela, e é por isso que a asserção negativa
 * importa mais que as três positivas: a tentação de escrever "seus dados somem em 24
 * meses" é máxima justamente onde a copy fica bonita — e nada apaga dado de candidato
 * neste sistema hoje. O motor de exclusão é a Phase 45; a purga, a Phase 46.
 *
 * ⚠ As expressões proibidas são montadas em runtime. Este arquivo vive em
 * `src/features/privacidade/`, que está na allowlist do portão de copy do 43-02 — um
 * arquivo que escrevesse as formas condenadas por extenso seria a primeira ocorrência
 * que o portão acusaria, e a documentação da proibição derrubaria a própria proibição.
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§Seção 2 · guarda do currículo, linhas 499-507; §Copywriting Contract)
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import {
  GuardaCurriculoBloco,
  COPY_GUARDA_CURRICULO,
} from '../GuardaCurriculoBloco'

/** 12h UTC: dd/mm/aaaa é o mesmo dia em qualquer fuso do planeta (±11h). */
const ISO_AUTORIZACAO = '2026-03-12T12:00:00.000Z'
const DATA_AUTORIZACAO = '12/03/2026'
/** 12/03/2026 + 24 meses — o teto que a pessoa leu e aceitou no cadastro. */
const PRAZO_PREVISTO = '12/03/2028'

/**
 * Futuro-de-máquina sobre exclusão, montado em runtime. Superset das strings soltas da
 * §Copywriting Contract: inclui a flexão de PLURAL, que a lista literal da spec deixaria
 * passar e que mentiria exatamente igual.
 */
const FUTURO_DE_MAQUINA = [
  ['automatica', 'mente'].join(''),
  ['será ', 'exclu', 'ído'].join(''),
  ['serão ', 'exclu', 'ídos'].join(''),
  ['serão ', 'apag', 'ados'].join(''),
  ['exclusão ', 'automátic', 'a'].join(''),
  ['dados ', 'somem'].join(''),
]

function semPromessaDeMaquina(texto: string) {
  const corpo = texto.toLowerCase()
  for (const frase of FUTURO_DE_MAQUINA) {
    expect(
      corpo,
      `promessa de máquina que apaga sozinha: "${frase}". Nesta fase nada apaga dado ` +
        `de candidato — o motor de exclusão é a Phase 45 e a purga é a Phase 46.`,
    ).not.toContain(frase.toLowerCase())
  }
}

describe('(d) Os três casos do bloco de guarda do currículo', () => {
  it('autorizado COM currículo: base da guarda datada + prazo previsto + canal humano', () => {
    render(
      <GuardaCurriculoBloco
        autorizado
        temCurriculo
        autorizadoEm={ISO_AUTORIZACAO}
      />,
    )

    expect(
      screen.getByText(COPY_GUARDA_CURRICULO.autorizadoTitulo),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY_GUARDA_CURRICULO.autorizadoCorpo)).toBeInTheDocument()
    expect(
      screen.getByText(
        COPY_GUARDA_CURRICULO.autorizadoBase(DATA_AUTORIZACAO, PRAZO_PREVISTO),
      ),
    ).toBeInTheDocument()
    // A revogação existe e é por canal humano nomeado — o canal de privacidade.
    expect(screen.getByText(COPY_GUARDA_CURRICULO.notaRevogacao)).toBeInTheDocument()

    semPromessaDeMaquina(document.body.textContent ?? '')
  })

  it('NÃO autorizado COM currículo: guarda pelo tempo do processo + canal humano', () => {
    render(
      <GuardaCurriculoBloco
        autorizado={false}
        temCurriculo
        autorizadoEm={ISO_AUTORIZACAO}
      />,
    )

    expect(
      screen.getByText(COPY_GUARDA_CURRICULO.naoAutorizadoTitulo),
    ).toBeInTheDocument()
    expect(
      screen.getByText(COPY_GUARDA_CURRICULO.naoAutorizadoCorpo),
    ).toBeInTheDocument()
    expect(screen.getByText(COPY_GUARDA_CURRICULO.notaRevogacao)).toBeInTheDocument()
    // Sem autorização não há prazo de 2 anos a citar — e inventar um seria pior que
    // nenhum.
    expect(document.body.textContent ?? '').not.toContain(PRAZO_PREVISTO)

    semPromessaDeMaquina(document.body.textContent ?? '')
  })

  it('SEM currículo: estado vazio próprio, sem canal e sem prazo', () => {
    render(
      <GuardaCurriculoBloco
        autorizado
        temCurriculo={false}
        autorizadoEm={ISO_AUTORIZACAO}
      />,
    )

    expect(
      screen.getByText(COPY_GUARDA_CURRICULO.semCurriculoTitulo),
    ).toBeInTheDocument()
    expect(
      screen.getByText(COPY_GUARDA_CURRICULO.semCurriculoCorpo),
    ).toBeInTheDocument()
    // Oferecer o canal aqui convidaria a pedir a retirada de um arquivo que não existe.
    expect(
      screen.queryByText(COPY_GUARDA_CURRICULO.notaRevogacao),
    ).not.toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toContain(PRAZO_PREVISTO)

    semPromessaDeMaquina(document.body.textContent ?? '')
  })

  it('o bloco é LEITURA: nenhum controle em nenhum dos três casos', () => {
    for (const props of [
      { autorizado: true, temCurriculo: true },
      { autorizado: false, temCurriculo: true },
      { autorizado: true, temCurriculo: false },
    ]) {
      const { container, unmount } = render(
        <GuardaCurriculoBloco {...props} autorizadoEm={ISO_AUTORIZACAO} />,
      )
      // A ausência de switch aqui é DELIBERADA e está registrada no docblock do
      // componente: não existe motor de exclusão, e um switch desligaria uma flag sem
      // que nada mais acontecesse — promessa órfã sobre o dado mais sensível da fase.
      expect(
        container.querySelectorAll(
          'button, input, [role="switch"], [role="checkbox"], [aria-checked]',
        ),
      ).toHaveLength(0)
      unmount()
    }
  })

  it('sem data de autorização, a linha de base+prazo é OMITIDA em vez de inventada', () => {
    render(<GuardaCurriculoBloco autorizado temCurriculo autorizadoEm={null} />)

    expect(
      screen.getByText(COPY_GUARDA_CURRICULO.autorizadoTitulo),
    ).toBeInTheDocument()
    expect(document.body.textContent ?? '').not.toContain('Prazo previsto')
  })
})
