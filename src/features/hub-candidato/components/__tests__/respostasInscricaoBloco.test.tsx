/// <reference types="@testing-library/jest-dom" />
/**
 * ⛔ 52-24 / JORN-55 (G-51-OP1, D-19, D-20; UI-SPEC E4, Invariantes 3, 5 e 6) — «Respostas da
 * inscrição» no hub do RH.
 *
 * O contrato medido aqui:
 *  - as perguntas agrupadas como o formulário agrupou (`groupByBloco` + `rotuloDoBloco`, a MESMA
 *    cópia do formulário), um `h3` por grupo com pergunta, `<ol>` na ordem em que a EF entregou;
 *  - a eliminatória ganha o selo neutro «Eliminatória» e a resposta aparece como as outras —
 *    nenhum veredito (passou/reprovou/corte), nenhuma opção não escolhida (RNF-07a, D-19);
 *  - resposta por tipo; «Sem resposta»; a nota de pergunta removida; o código cru de uma opção
 *    que não resolve (nunca célula vazia);
 *  - texto do candidato é nó de texto: `<script>` aparece literal, `javascript:` não vira link,
 *    `https://x.com/a.` vira link sem o ponto final, em aba nova, com `rel="noopener noreferrer"`.
 *
 * O módulo é carregado por `import()` com especificador em variável: no RED ele ainda não existe,
 * e a falha tem de ser de ASSERÇÃO (componente ausente), não de carga do arquivo.
 */
import React from 'react'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { RespostaInscricaoRh } from '@/features/hub-candidato/services/cadastroCandidatoRhService'

type Props = { inscricao: RespostaInscricaoRh[] }
type Mod = {
  RespostasInscricaoBloco?: React.ComponentType<Props>
  COPY_RESPOSTAS_INSCRICAO?: Record<string, unknown>
}

async function carregar(): Promise<Mod | null> {
  const especificador = '../RespostasInscricaoBloco'
  return ((await import(/* @vite-ignore */ especificador).catch(() => null)) as Mod | null)
}

async function montar(inscricao: RespostaInscricaoRh[]): Promise<HTMLElement> {
  const mod = await carregar()
  expect(mod?.RespostasInscricaoBloco, 'RespostasInscricaoBloco não existe').toBeTypeOf('function')
  const C = mod!.RespostasInscricaoBloco!
  render(<C inscricao={inscricao} />)
  return screen.getByTestId('hub-respostas-inscricao')
}

let seq = 0
function p(parcial: Partial<RespostaInscricaoRh>): RespostaInscricaoRh {
  seq += 1
  return {
    pergunta_id: `perg-${seq}`,
    bloco: 'curriculo',
    ordem: seq,
    texto_pergunta: `Pergunta ${seq}`,
    tipo_resposta: 'texto_curto',
    eliminatoria: false,
    removida: false,
    resposta: { texto: `Resposta ${seq}` },
    ...parcial,
  }
}

/** O `<li>` (ficha) da pergunta com esse texto. */
function ficha(bloco: HTMLElement, pergunta: string): HTMLElement {
  const alvo = within(bloco).getByText(pergunta)
  const li = alvo.closest('li')
  expect(li, `ficha de «${pergunta}» sem <li>`).not.toBeNull()
  return li as HTMLElement
}

const VEREDITO = /passou|reprova|aprovad|corte|elimina(do|da|ção)|desclassific/i

describe('RespostasInscricaoBloco — grupos e ordem do formulário (52-24 / D-19)', () => {
  it('populado: h3 = rótulo do bloco, na ordem de chegada; dentro do grupo, a ordem que a EF entregou', async () => {
    const bloco = await montar([
      p({ bloco: 'curriculo', ordem: 3, texto_pergunta: 'Onde trabalhou por último?' }),
      p({ bloco: 'curriculo', ordem: 1, texto_pergunta: 'Quanto tempo de experiência?' }),
      p({ bloco: 'jornada', ordem: 2, texto_pergunta: 'Pode trabalhar aos sábados?' }),
      p({ bloco: '  ', ordem: 4, texto_pergunta: 'Algo mais a dizer?' }),
    ])
    expect(Array.from(bloco.querySelectorAll('h3')).map((h) => h.textContent)).toEqual([
      'Sobre sua experiência',
      'Disponibilidade',
      'Geral',
    ])
    const listas = bloco.querySelectorAll('ol')
    expect(listas).toHaveLength(3)
    expect(Array.from(listas[0].querySelectorAll(':scope > li')).map((li) => li.textContent)).toEqual([
      expect.stringContaining('Onde trabalhou por último?'),
      expect.stringContaining('Quanto tempo de experiência?'),
    ])
    const li = ficha(bloco, 'Pode trabalhar aos sábados?')
    expect(li.className).toContain('rounded-lg')
    expect(li.className).toContain('border-white/15')
    expect(li.className).toContain('bg-white/5')
    expect(li.className).toContain('p-4')
  })

  it('bloco desconhecido cai no próprio nome (a mesma regra do formulário)', async () => {
    const bloco = await montar([p({ bloco: 'portfolio_extra', texto_pergunta: 'Link do portfólio' })])
    expect(Array.from(bloco.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['portfolio_extra'])
  })

  it('vazio: a frase de vazio, sem causa; sem h3 nem lista', async () => {
    const bloco = await montar([])
    expect(bloco).toHaveTextContent('Nenhuma resposta de formulário registrada para esta candidatura.')
    expect(bloco).toHaveTextContent('Se a vaga tiver perguntas, elas aparecem aqui na ordem do formulário.')
    expect(bloco.querySelector('h3')).toBeNull()
    expect(bloco.querySelector('ol')).toBeNull()
  })
})

describe('RespostasInscricaoBloco — eliminatória sem veredito (52-24 / D-19, RNF-07a)', () => {
  it('selo «Eliminatória» só na eliminatória; a resposta aparece como as outras; nenhum veredito', async () => {
    const bloco = await montar([
      p({
        texto_pergunta: 'Possui registro no CRO?',
        tipo_resposta: 'single_choice',
        eliminatoria: true,
        resposta: { opcoes: ['Não'] },
      }),
      p({ texto_pergunta: 'Conte uma experiência', resposta: { texto: 'Atendi 40 pacientes por dia.' } }),
    ])
    expect(within(bloco).getAllByText('Eliminatória')).toHaveLength(1)
    const li = ficha(bloco, 'Possui registro no CRO?')
    expect(within(li).getByText('Eliminatória')).toBeInTheDocument()
    expect(li).toHaveTextContent('Não')
    expect(within(ficha(bloco, 'Conte uma experiência')).queryByText('Eliminatória')).toBeNull()
    // Nenhuma palavra de veredito, de corte ou de eliminação — em lugar nenhum da seção.
    expect(bloco.textContent ?? '').not.toMatch(VEREDITO)
    // Só a opção escolhida: a outra alternativa da pergunta não chega nem aparece.
    expect(bloco.textContent ?? '').not.toMatch(/\bSim\b/)
  })
})

describe('RespostasInscricaoBloco — resposta por tipo e casos parciais (52-24 / E4)', () => {
  it('single_choice → o texto da escolhida; multiple_choice → <ul> com as escolhidas', async () => {
    const bloco = await montar([
      p({ texto_pergunta: 'Turno', tipo_resposta: 'single_choice', resposta: { opcoes: ['Manhã'] } }),
      p({
        texto_pergunta: 'Ferramentas',
        tipo_resposta: 'multiple_choice',
        resposta: { opcoes: ['Excel', 'Clinicorp'] },
      }),
    ])
    const turno = ficha(bloco, 'Turno')
    expect(turno).toHaveTextContent('Manhã')
    expect(turno.querySelector('ul')).toBeNull()
    const ul = ficha(bloco, 'Ferramentas').querySelector('ul')
    expect(ul, 'multiple_choice sem <ul>').not.toBeNull()
    expect(Array.from(ul!.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['Excel', 'Clinicorp'])
  })

  it('multiple_choice com «outros» → as escolhidas E o texto livre', async () => {
    const bloco = await montar([
      p({
        texto_pergunta: 'Como soube',
        tipo_resposta: 'multiple_choice',
        resposta: { opcoes: ['Instagram'], texto: 'Pelo meu primo' },
      }),
    ])
    const li = ficha(bloco, 'Como soube')
    expect(li).toHaveTextContent('Instagram')
    expect(li).toHaveTextContent('Pelo meu primo')
  })

  it('numerico → toLocaleString pt-BR', async () => {
    const bloco = await montar([
      p({ texto_pergunta: 'Pretensão salarial', tipo_resposta: 'numerico', resposta: { numero: 2500.5 } }),
    ])
    expect(ficha(bloco, 'Pretensão salarial')).toHaveTextContent((2500.5).toLocaleString('pt-BR'))
    expect(ficha(bloco, 'Pretensão salarial')).toHaveTextContent('2.500,5')
  })

  it('sem resposta → «Sem resposta»; removida com resposta → a nota e a resposta; opção que não resolve → o código cru', async () => {
    const bloco = await montar([
      p({ texto_pergunta: 'Pergunta não respondida', resposta: null }),
      p({ texto_pergunta: 'Pergunta antiga', removida: true, resposta: { texto: 'Respondi antes' } }),
      p({
        texto_pergunta: 'Escolha antiga',
        tipo_resposta: 'single_choice',
        resposta: { opcoes: ['opcao_7f3a'] },
      }),
    ])
    expect(ficha(bloco, 'Pergunta não respondida')).toHaveTextContent('Sem resposta')
    const removida = ficha(bloco, 'Pergunta antiga')
    expect(removida).toHaveTextContent('Pergunta removida do formulário depois da inscrição.')
    expect(removida).toHaveTextContent('Respondi antes')
    expect(within(bloco).getAllByText('Pergunta removida do formulário depois da inscrição.')).toHaveLength(1)
    expect(ficha(bloco, 'Escolha antiga')).toHaveTextContent('opcao_7f3a')
  })
})

describe('RespostasInscricaoBloco — texto do candidato e links (52-24 / D-20, T-52-27..29)', () => {
  it('<script> aparece como texto literal, sem elemento novo', async () => {
    const container = await montar([
      p({ texto_pergunta: 'Livre', resposta: { texto: '<script>alert(1)</script><img src=x onerror=alert(1)>' } }),
    ])
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(ficha(container, 'Livre')).toHaveTextContent('<script>alert(1)</script><img src=x onerror=alert(1)>')
  })

  it('javascript:alert(1) fica texto, sem href', async () => {
    const bloco = await montar([p({ texto_pergunta: 'Portfólio', resposta: { texto: 'javascript:alert(1)' } })])
    const li = ficha(bloco, 'Portfólio')
    expect(li).toHaveTextContent('javascript:alert(1)')
    expect(li.querySelector('a')).toBeNull()
    expect(li.querySelector('[href]')).toBeNull()
  })

  it('https://x.com/a. → link sem o ponto, em aba nova, rel noopener noreferrer, aria-label', async () => {
    const bloco = await montar([
      p({ texto_pergunta: 'Portfólio', resposta: { texto: 'Meu trabalho: https://x.com/a.\nObrigada!' } }),
    ])
    const li = ficha(bloco, 'Portfólio')
    const links = within(li).getAllByRole('link')
    expect(links).toHaveLength(1)
    const a = links[0]
    expect(a).toHaveAttribute('href', 'https://x.com/a')
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    expect(a).toHaveAttribute('aria-label', 'https://x.com/a (abre em nova aba)')
    expect(a.className).toContain('break-all')
    expect(li).toHaveTextContent('Meu trabalho: https://x.com/a.')
    // O texto da resposta preserva a quebra de linha do candidato.
    expect(a.closest('p')?.className ?? '').toContain('whitespace-pre-line')
  })

  it('nenhum dangerouslySetInnerHTML nos arquivos do bloco e dos links', () => {
    for (const rel of [
      '../RespostasInscricaoBloco.tsx',
      '../TextoComLinks.tsx',
      '../../lib/linkify.ts',
    ]) {
      const caminho = resolve(__dirname, rel)
      expect(existsSync(caminho), `${rel} não existe`).toBe(true)
      expect(readFileSync(caminho, 'utf8'), rel).not.toMatch(/dangerouslySetInnerHTML|innerHTML/)
    }
  })
})
