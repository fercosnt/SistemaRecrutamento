/**
 * Phase 47 / Plano 47-04 Task 1 — a lista das empresas contratadas, o tipo que
 * obriga o `país` e o validador que reprova ALTO (TRANSP-01 · Art. 18, VII).
 *
 * ── OS DOIS BLOCOS, E POR QUE OS DOIS PRECISAM EXISTIR ───────────────────────
 * **Propriedade** (fixture sintética): cada reprovação é provada construindo a entrada
 * defeituosa aqui dentro. Este bloco continua provando a falha alta DEPOIS de os países
 * serem preenchidos — um teste que só olhasse a lista real viraria vacuidade no dia em
 * que ela ficasse correta, que é justamente o dia em que o portão passa a valer.
 *
 * **Estado real**: a lista tem seis entradas, nenhuma com campo vazio, nenhuma nomeando
 * identificador interno — e o BLOQUEIO DE EMBARQUE declarado: hoje as seis carregam a
 * sentinela de país por medir, e a lista NÃO é publicável. Esse caso nomeia as entradas
 * pendentes uma a uma, de propósito: se alguém preencher um país sem passar pelo
 * checkpoint do operador, a lista de pendências encolhe e este teste fica VERMELHO.
 * É mais estrito que asserir "nenhuma sentinela" — aquilo só acusaria quando as seis
 * fossem preenchidas de uma vez.
 *
 * ⚠ NENHUM LITERAL PROIBIDO É ESCRITO VERBATIM AQUI. Os marcadores de indefinição e o
 * vocabulário banido pela §Invariante 4 da 47-UI-SPEC são montados em tempo de execução
 * por junção de fragmentos, no idioma estabelecido pelo portão de copy da Phase 43: um
 * teste que proíbe uma string e a contém é auto-invalidante — ele seria a própria
 * primeira ocorrência que denuncia.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/subprocessadores`)
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-RESEARCH.md (§C3)
 */
import { describe, it, expect } from 'vitest'

import {
  LISTA_MEDIDA_EM,
  PAIS_POR_MEDIR,
  SUBPROCESSADORES,
  validarEntradaSubprocessador,
  validarSubprocessadores,
  type Subprocessador,
} from '../constants/subprocessadores'
import { MATRIZ_RETENCAO } from '../constants/matrizRetencao.generated'

// ─────────────────────────────────────────────────────────────────────────────
// Fragmentos — ver o aviso do cabeçalho
// ─────────────────────────────────────────────────────────────────────────────

const juntar = (...partes: string[]) => partes.join('')

/** Os quatro marcadores de indefinição banidos pela 47-UI-SPEC §Bans. */
const MARCADORES = [
  juntar('n', 'ão ', 'informado'),
  juntar('a ', 'defi', 'nir'),
  juntar('T', 'B', 'D'),
  juntar('a ', 'confir', 'mar'),
]

/** Vocabulário que implicaria ausência de identificação (§Invariante 4). */
const VOCABULARIO_DE_ANONIMATO = [
  juntar('anonim', 'izad'),
  juntar('pseudonim', 'izad'),
  juntar('sem ', 'identifi', 'cação'),
  juntar('de forma ', 'anôn', 'ima'),
]

/** Identificadores internos proibidos em superfície pública (§Invariante 11). */
const IDENTIFICADORES_INTERNOS = [
  'gpt-4',
  'gpt-4o-mini',
  'claude',
  'sonnet',
  'opus',
  'haiku',
  'us-east',
  'sa-east',
  'eu-west',
  'postgres',
]

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures sintéticas
// ─────────────────────────────────────────────────────────────────────────────

const COMPLETA: Subprocessador = {
  nome: 'Empresa de Fixture',
  recebe: 'O texto que a pessoa escreveu na candidatura.',
  finalidade: 'Existir dentro deste teste e em nenhum outro lugar.',
  pais: 'Brasil',
  baseLegal: 'LGPD, Art. 7º, V — procedimentos preliminares de contrato.',
}

const com = (parcial: Partial<Subprocessador>): Subprocessador => ({ ...COMPLETA, ...parcial })

const CAMPOS: Array<{ chave: keyof Subprocessador; rotulo: string }> = [
  { chave: 'nome', rotulo: 'nome' },
  { chave: 'recebe', rotulo: 'o que recebe' },
  { chave: 'finalidade', rotulo: 'para quê' },
  { chave: 'pais', rotulo: 'país' },
  { chave: 'baseLegal', rotulo: 'base legal' },
]

const NOMES_ESPERADOS = ['Anthropic', 'OpenAI', 'ViaCEP', 'Resend', 'Supabase', 'Vercel']

const textoDe = (entrada: Subprocessador) =>
  [entrada.nome, entrada.recebe, entrada.finalidade, entrada.pais, entrada.baseLegal].join(' ')

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — PROPRIEDADE (fixture sintética): a falha alta é do CÓDIGO
// ═════════════════════════════════════════════════════════════════════════════

describe('propriedade — o validador reprova ALTO, nomeando a empresa e o campo', () => {
  it('(1) devolve a lista quando todas as entradas estão completas', () => {
    const lista = [COMPLETA, com({ nome: 'Outra Empresa' })]
    expect(validarSubprocessadores(lista)).toEqual(lista)
  })

  it('(2) lança quando a lista está vazia — lista vazia é falha de geração, nunca estado de tela', () => {
    expect(() => validarSubprocessadores([])).toThrow(/vazia/i)
  })

  it.each(CAMPOS)('(3) lança quando o campo «$rotulo» é vazio — e nomeia empresa e campo', ({ chave, rotulo }) => {
    const defeituosa = com({ [chave]: '' } as Partial<Subprocessador>)
    let mensagem = ''
    try {
      validarSubprocessadores([defeituosa])
    } catch (erro) {
      mensagem = (erro as Error).message
    }
    expect(mensagem).not.toBe('')
    expect(mensagem.toLowerCase()).toContain(rotulo)
    // A empresa é nomeada — exceto quando é justamente o nome que falta, e aí a
    // posição na lista é o único identificador honesto.
    expect(mensagem).toContain(chave === 'nome' ? '#1' : COMPLETA.nome)
  })

  it.each(CAMPOS)('(4) lança quando o campo «$rotulo» é só espaço em branco', ({ chave, rotulo }) => {
    const defeituosa = com({ [chave]: '   \n  ' } as Partial<Subprocessador>)
    expect(() => validarSubprocessadores([defeituosa])).toThrow(new RegExp(rotulo, 'i'))
  })

  it('(5) lança quando o país é a sentinela de pendência — nomeando a empresa e o campo', () => {
    const defeituosa = com({ nome: 'Empresa Sem País', pais: PAIS_POR_MEDIR })
    let mensagem = ''
    try {
      validarSubprocessadores([defeituosa])
    } catch (erro) {
      mensagem = (erro as Error).message
    }
    expect(mensagem).toContain('Empresa Sem País')
    expect(mensagem.toLowerCase()).toContain('país')
  })

  it('(6) lança quando a sentinela aparece em QUALQUER campo, não só no país', () => {
    expect(() => validarSubprocessadores([com({ baseLegal: PAIS_POR_MEDIR })])).toThrow()
  })

  it.each(MARCADORES)('(7) lança quando algum campo carrega um marcador de indefinição', (marcador) => {
    const defeituosa = com({ nome: 'Empresa Com Marcador', pais: marcador })
    let mensagem = ''
    try {
      validarSubprocessadores([defeituosa])
    } catch (erro) {
      mensagem = (erro as Error).message
    }
    expect(mensagem).toContain('Empresa Com Marcador')
    expect(mensagem.toLowerCase()).toContain('país')
  })

  it('(8) o marcador é pego em qualquer campo e em qualquer caixa', () => {
    for (const marcador of MARCADORES) {
      expect(() => validarSubprocessadores([com({ finalidade: `Uso ${marcador.toUpperCase()} aqui.` })])).toThrow()
    }
  })

  it('(9) `validarEntradaSubprocessador` reprova a entrada isolada — é o que a ficha chama', () => {
    expect(() => validarEntradaSubprocessador(com({ pais: PAIS_POR_MEDIR }))).toThrow()
    expect(validarEntradaSubprocessador(COMPLETA)).toEqual(COMPLETA)
  })

  it('(10) reprovar é diferente de FILTRAR — a lista defeituosa não volta encurtada', () => {
    // Filtrar entregaria uma página mais curta e plausível: a declaração pública de que
    // compartilhamos com menos empresas do que compartilhamos.
    const lista = [COMPLETA, com({ nome: 'Defeituosa', pais: PAIS_POR_MEDIR })]
    expect(() => validarSubprocessadores(lista)).toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — ESTADO REAL da lista publicada
// ═════════════════════════════════════════════════════════════════════════════

describe('estado real — as seis entradas medidas no código vivo', () => {
  it('(11) são exatamente seis, e são as seis medidas — não as quatro do parêntese do ROADMAP', () => {
    expect(SUBPROCESSADORES.map((e) => e.nome)).toEqual(NOMES_ESPERADOS)
  })

  it('(12) nenhuma entrada tem campo vazio ou só espaço', () => {
    for (const entrada of SUBPROCESSADORES) {
      for (const { chave, rotulo } of CAMPOS) {
        expect(entrada[chave].trim(), `${entrada.nome} → ${rotulo}`).not.toBe('')
      }
    }
  })

  it('(13) nenhuma entrada nomeia modelo de IA, plano contratado ou região técnica', () => {
    for (const entrada of SUBPROCESSADORES) {
      const texto = textoDe(entrada).toLowerCase()
      for (const identificador of IDENTIFICADORES_INTERNOS) {
        expect(texto, `${entrada.nome} nomeia «${identificador}»`).not.toContain(identificador)
      }
    }
  })

  it('(14) nenhuma entrada carrega marcador de indefinição', () => {
    for (const entrada of SUBPROCESSADORES) {
      const texto = textoDe(entrada).toLowerCase()
      for (const marcador of MARCADORES) {
        expect(texto).not.toContain(marcador.toLowerCase())
      }
    }
  })

  it('(15) as entradas de IA enumeram só o que o mascarador remove — e dizem que o nome escapa', () => {
    const entradasDeIa = SUBPROCESSADORES.filter((e) => e.nome === 'Anthropic' || e.nome === 'OpenAI')
    expect(entradasDeIa).toHaveLength(2)

    // As sete classes de padrão que `_shared/pii-masker.ts` de fato remove.
    const CLASSES = ['CPF', 'CNPJ', 'RG', 'e-mail', 'telefone', 'data de nascimento', 'endereço']
    for (const entrada of entradasDeIa) {
      for (const classe of CLASSES) {
        expect(entrada.recebe, `${entrada.nome} não enumera «${classe}»`).toContain(classe)
      }
      // O mascaramento é por expressão regular e NÃO há padrão de nome próprio: a copy
      // tem de dizer isso, senão ela afirma mais do que o código faz.
      expect(entrada.recebe.toLowerCase()).toContain('nome')
      for (const termo of VOCABULARIO_DE_ANONIMATO) {
        expect(entrada.recebe.toLowerCase()).not.toContain(termo.toLowerCase())
      }
    }
  })

  it('(16) cada base legal é uma citação JÁ existente no artefato gerado da matriz — nunca autorada aqui', () => {
    const citacoesDoArtefato = MATRIZ_RETENCAO.etapas.map((e) => e.base_legal)
    for (const entrada of SUBPROCESSADORES) {
      expect(citacoesDoArtefato, `${entrada.nome} usa base legal fora do artefato`).toContain(entrada.baseLegal)
    }
  })

  it('(17) a data de medição da lista é uma data válida no formato ISO', () => {
    expect(LISTA_MEDIDA_EM).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(new Date(`${LISTA_MEDIDA_EM}T00:00:00`).getTime())).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 3 — O BLOQUEIO DE EMBARQUE (Task 3 · checkpoint do operador)
// ═════════════════════════════════════════════════════════════════════════════

describe('bloqueio de embarque — o país não é medível deste ambiente', () => {
  /**
   * ⚠ ESTE CASO É O PORTÃO, E ELE MUDA QUANDO A TASK 3 FOR SATISFEITA.
   *
   * Hoje as seis entradas carregam a sentinela porque nenhuma região é obtenível deste
   * ambiente (47-RESEARCH §C3.2: sem token da API de gerenciamento, CLI fora do PATH,
   * domínio atrás de rede de distribuição, `vercel.json` sem `regions`, nenhum pin de
   * região para os outros três).
   *
   * A lista de pendências é DECLARADA nome a nome de propósito. Se alguém preencher um
   * país sem passar pelo checkpoint do operador, esta asserção fica vermelha e nomeia a
   * entrada — que é exatamente a proibição desta fase: um país presumido numa declaração
   * de transferência internacional produz um documento público falso.
   *
   * Ao receber os seis países medidos, este caso vira `expect(pendentes).toEqual([])` +
   * `expect(() => validarSubprocessadores(SUBPROCESSADORES)).not.toThrow()`. O Bloco 1
   * continua provando a falha alta por fixture sintética — o portão não deixa de existir
   * quando o dado chega.
   */
  it('(18) as seis entradas estão pendentes de país medido, e a lista NÃO é publicável', () => {
    const pendentes = SUBPROCESSADORES.filter((e) => e.pais === PAIS_POR_MEDIR).map((e) => e.nome)
    expect(pendentes).toEqual(NOMES_ESPERADOS)
    expect(() => validarSubprocessadores(SUBPROCESSADORES)).toThrow(/país/i)
  })

  it('(19) a sentinela é um valor que nunca poderia ser lido como um país', () => {
    expect(PAIS_POR_MEDIR).toMatch(/^__.+__$/)
    // Ela não é nenhum dos marcadores banidos: um marcador de indefinição publicado é
    // uma omissão publicada; a sentinela existe para NÃO chegar à página.
    for (const marcador of MARCADORES) {
      expect(PAIS_POR_MEDIR.toLowerCase()).not.toContain(marcador.toLowerCase())
    }
  })
})
