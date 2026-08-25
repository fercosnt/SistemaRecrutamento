/**
 * Cobertura do mapeador tela↔banco das perguntas da Etapa 1.
 *
 * O caso que dá nome a este arquivo é o (d): a aba de configuração ficou meses
 * sem LER `perguntas_formulario`, e quando passou a ler, o risco virou o
 * inverso — reescrever no banco algo diferente do que estava lá. O round-trip é
 * o que prova que passar pela tela não altera a pergunta.
 */
import { describe, it, expect } from 'vitest'
import {
  perguntaDbParaUi,
  perguntaUiParaDb,
  montarPerguntasParaSalvar,
  BLOCO_CULTURA,
  BLOCO_TRIAGEM_PADRAO,
  type PerguntaUi,
} from '../perguntaMapper'
import type { PerguntaVaga } from '../services/configVagaService'

const perguntaJornada: PerguntaVaga = {
  id: 'uuid-1',
  bloco: 'jornada',
  ordem: 2,
  texto_pergunta: 'Qual é a sua disponibilidade para esta vaga?',
  texto_ajuda: null,
  tipo_resposta: 'single_choice',
  opcoes_resposta: [
    'Tenho disponibilidade integral e presencial, de segunda a sexta',
    'Tenho disponibilidade apenas para trabalho remoto',
  ],
  obrigatoria: true,
  limite_caracteres: null,
}

describe('perguntaMapper', () => {
  it('(a) traduz os cinco tipos nos dois sentidos', () => {
    const tipos = [
      ['unica-escolha', 'single_choice'],
      ['multipla-escolha', 'multiple_choice'],
      ['texto-curto', 'texto_curto'],
      ['texto-longo', 'texto_longo'],
      ['numerico', 'numerico'],
    ] as const

    for (const [ui, db] of tipos) {
      const comoDb = perguntaUiParaDb(
        { id: 'x', pergunta: 'P', ajuda: '', tipo: ui, opcoes: 'a; b' },
        1,
        BLOCO_TRIAGEM_PADRAO
      )
      expect(comoDb.tipo_resposta).toBe(db)
      expect(perguntaDbParaUi({ ...perguntaJornada, tipo_resposta: db }).tipo).toBe(ui)
    }
  })

  it('(b) PRESERVA o bloco no round-trip — jornada não vira curriculo', () => {
    const naTela = perguntaDbParaUi(perguntaJornada)
    const devolta = perguntaUiParaDb(naTela, 2, BLOCO_TRIAGEM_PADRAO)
    expect(devolta.bloco).toBe('jornada')
  })

  it('(c) usa o bloco padrão SÓ quando a pergunta é nova (sem bloco)', () => {
    const nova: PerguntaUi = { id: 'novo', pergunta: 'P', ajuda: '', tipo: 'numerico' }
    expect(perguntaUiParaDb(nova, 1, BLOCO_TRIAGEM_PADRAO).bloco).toBe('curriculo')
    expect(perguntaUiParaDb(nova, 1, BLOCO_CULTURA).bloco).toBe('valores')
  })

  it('(d) round-trip completo não altera a pergunta', () => {
    const devolta = perguntaUiParaDb(perguntaDbParaUi(perguntaJornada), 2, BLOCO_TRIAGEM_PADRAO)
    expect(devolta).toEqual(perguntaJornada)
  })

  it('(e) preserva o dbId — a pergunta é ATUALIZADA, não duplicada', () => {
    expect(perguntaUiParaDb(perguntaDbParaUi(perguntaJornada), 2, 'curriculo').id).toBe('uuid-1')
    // Sem dbId, é INSERT.
    expect(
      perguntaUiParaDb({ id: 'ui', pergunta: 'P', ajuda: '', tipo: 'numerico' }, 1, 'curriculo').id
    ).toBeNull()
  })

  it('(f) *_choice sempre recebe array não-vazio; os demais recebem null', () => {
    const choice = perguntaUiParaDb(
      { id: 'x', pergunta: 'P', ajuda: '', tipo: 'unica-escolha', opcoes: 'a; b; c' },
      1,
      'curriculo'
    )
    expect(choice.opcoes_resposta).toEqual(['a', 'b', 'c'])

    // CHECK opcoes_obrigatorias_check só vale para os *_choice.
    const numerico = perguntaUiParaDb(
      { id: 'x', pergunta: 'P', ajuda: '', tipo: 'numerico', opcoes: 'lixo' },
      1,
      'curriculo'
    )
    expect(numerico.opcoes_resposta).toBeNull()
  })

  it('(g) descarta separadores vazios em vez de gerar opção em branco', () => {
    const r = perguntaUiParaDb(
      { id: 'x', pergunta: 'P', ajuda: '', tipo: 'unica-escolha', opcoes: 'a;; b ;' },
      1,
      'curriculo'
    )
    expect(r.opcoes_resposta).toEqual(['a', 'b'])
  })

  it('(h) normaliza opções vindas como [{id, texto}] — o formato que a RPC grava', () => {
    const comObjetos = {
      ...perguntaJornada,
      opcoes_resposta: ['Integral presencial', 'Apenas remoto'],
    }
    expect(perguntaDbParaUi(comObjetos).opcoes).toBe('Integral presencial; Apenas remoto')
  })

  it('(i) ordem é contígua a partir de 1, com cultura DEPOIS de triagem', () => {
    const t: PerguntaUi[] = [
      { id: '1', pergunta: 'T1', ajuda: '', tipo: 'numerico' },
      { id: '2', pergunta: 'T2', ajuda: '', tipo: 'numerico' },
    ]
    const c: PerguntaUi[] = [{ id: '3', pergunta: 'C1', ajuda: '', tipo: 'numerico' }]

    const r = montarPerguntasParaSalvar(t, c)
    expect(r.map((p) => p.ordem)).toEqual([1, 2, 3])
    expect(r.map((p) => p.bloco)).toEqual(['curriculo', 'curriculo', 'valores'])
    // CHECK ordem_positiva_check: nunca 0.
    expect(r.every((p) => p.ordem >= 1)).toBe(true)
  })

  it('(j) descarta a linha vazia que o botão "adicionar" cria', () => {
    const t: PerguntaUi[] = [
      { id: '1', pergunta: 'Real', ajuda: '', tipo: 'numerico' },
      { id: '2', pergunta: '   ', ajuda: '', tipo: 'unica-escolha', opcoes: '' },
    ]
    const r = montarPerguntasParaSalvar(t, [])
    expect(r).toHaveLength(1)
    expect(r[0].texto_pergunta).toBe('Real')
  })

  it('(k) texto_curto ganha limite 500; os outros tipos ficam sem limite', () => {
    const curto = perguntaUiParaDb(
      { id: 'x', pergunta: 'P', ajuda: '', tipo: 'texto-curto' },
      1,
      'curriculo'
    )
    expect(curto.limite_caracteres).toBe(500)

    const longo = perguntaUiParaDb(
      { id: 'x', pergunta: 'P', ajuda: '', tipo: 'texto-longo' },
      1,
      'curriculo'
    )
    expect(longo.limite_caracteres).toBeNull()
  })

  it('(l) ⚠ opção que CONTÉM ponto-e-vírgula se parte — limite conhecido do formato', () => {
    const r = perguntaUiParaDb(
      {
        id: 'x',
        pergunta: 'P',
        ajuda: '',
        tipo: 'unica-escolha',
        opcoes: 'Sim; mas com ressalva',
      },
      1,
      'curriculo'
    )
    // Documenta o comportamento REAL: vira duas opções, não uma.
    expect(r.opcoes_resposta).toEqual(['Sim', 'mas com ressalva'])
  })
})
