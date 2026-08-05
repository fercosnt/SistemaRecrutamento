/**
 * Phase 43 / Plano 43-02 Task 3 — os PORTÕES DE COPY da LGPD, com os DOIS escopos.
 *
 * A 43-UI-SPEC bane duas famílias de expressão, e elas têm **escopos diferentes**.
 * Tratá-las como uma só quebra o teste — não por descuido de implementação, mas porque
 * um escopo repo-wide reprovaria copy que a própria spec MANDA escrever. A tabela
 * "⚠ ESCOPO DO GREP" (43-UI-SPEC:316-334) é a autoridade:
 *
 * | Família | Escopo | Esperado |
 * |---|---|---|
 * | juridiquês do Art. 20 (Invariante 8) | `src/` INTEIRO — candidato E RH, copy E comentário | 0 |
 * | futuro-de-máquina sobre exclusão | APENAS a allowlist de superfície do candidato | 0 |
 *
 * ⚠ POR QUE A ALLOWLIST É OBRIGATÓRIA E NÃO É ESTILO: a página `/admin/retencao` que
 * esta mesma fase especifica usa `automaticamente` DUAS VEZES, verbatim e por exigência
 * — no banner de escopo e no corpo do diálogo de confirmação — porque ali a palavra é
 * *honesta*: ela afirma que NADA apaga automaticamente, que é exatamente a verdade que
 * a fase existe para tornar dizível. Um escopo repo-wide reprovaria a copy correta, e
 * **um teste que reprova o comportamento correto é pior que teste nenhum: ele treina
 * quem executa a desligá-lo.**
 *
 * ⚠ NENHUM LITERAL PROIBIDO É ESCRITO VERBATIM NESTE ARQUIVO. Todos são montados em
 * runtime por `join` de fragmentos: um teste que proíbe uma string e a contém é
 * auto-invalidante — ele seria a própria primeira ocorrência que denuncia. Idioma
 * estabelecido no 42-11 e reforçado pela deviação 3 do 43-01 (um gate que grepava o
 * arquivo inteiro reprovava o COMENTÁRIO que explicava a proibição).
 *
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md
 *      (§Copywriting Contract → "⚠ ESCOPO DO GREP"; Invariante 8, linha 102-105)
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const RAIZ = resolve(__dirname, '../..')
const SRC = join(RAIZ, 'src')

// ─────────────────────────────────────────────────────────────────────────────
// Varredura
// ─────────────────────────────────────────────────────────────────────────────

const EXTENSOES = ['.ts', '.tsx']
const IGNORADOS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage'])

/**
 * Lista recursivamente os arquivos de código sob `alvo`.
 *
 * ⚠ AUSÊNCIA NÃO É ERRO — é ZERO OCORRÊNCIA. `src/features/privacidade/` só nasce no
 * plano 43-08 (wave 5), e este portão roda desde a wave 1. Um `readdirSync` sobre
 * caminho inexistente lançaria ENOENT e o teste falharia por uma razão que não tem
 * NADA a ver com copy — trocando "a superfície está limpa" por "a suíte quebrou".
 * Um diretório ausente significa que não há copy ali para violar coisa alguma.
 */
function varrer(alvo: string): string[] {
  if (!existsSync(alvo)) return []
  if (statSync(alvo).isFile()) return [alvo]

  const encontrados: string[] = []
  for (const entrada of readdirSync(alvo, { withFileTypes: true })) {
    if (IGNORADOS.has(entrada.name)) continue
    const caminho = join(alvo, entrada.name)
    if (entrada.isDirectory()) encontrados.push(...varrer(caminho))
    else if (EXTENSOES.some((e) => entrada.name.endsWith(e))) encontrados.push(caminho)
  }
  return encontrados
}

/**
 * Dobra acento e caixa preservando os ÍNDICES 1:1 com o texto original.
 *
 * A dobra é feita caractere a caractere de propósito: `String.normalize('NFD')` sobre a
 * string inteira DESLOCA os índices (decompõe 'á' em 2 code points), e o deslocamento
 * faria o relatório apontar a linha errada — um portão que acusa o lugar errado é quase
 * tão ruim quanto um que não acusa.
 */
function dobrar(texto: string): string {
  let saida = ''
  for (const ch of texto) {
    const semAcento = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    saida += (semAcento.length > 0 ? semAcento[0] : ch).toLowerCase()
  }
  return saida
}

/** Converte índice de caractere em número de linha (1-based), para o relatório. */
function linhaDoIndice(texto: string, indice: number): number {
  let linha = 1
  for (let i = 0; i < indice && i < texto.length; i++) if (texto[i] === '\n') linha++
  return linha
}

interface Ocorrencia {
  arquivo: string
  linha: number
  trecho: string
}

function relatar(ocorrencias: Ocorrencia[]): string {
  return ocorrencias
    .map((o) => `  ${o.arquivo.replace(`${RAIZ}/`, '')}:${o.linha} → "${o.trecho.trim()}"`)
    .join('\n')
}

/** Procura um padrão já DOBRADO em todos os arquivos de `alvos`. */
function procurar(alvos: string[], padrao: RegExp): Ocorrencia[] {
  const achados: Ocorrencia[] = []
  for (const arquivo of alvos.flatMap(varrer)) {
    const texto = readFileSync(arquivo, 'utf8')
    const dobrado = dobrar(texto)
    for (const m of dobrado.matchAll(new RegExp(padrao.source, `${padrao.flags}g`))) {
      const idx = m.index ?? 0
      achados.push({
        arquivo,
        linha: linhaDoIndice(texto, idx),
        // Trecho do texto ORIGINAL (com acento), para o relatório ser legível.
        trecho: texto.slice(Math.max(0, idx - 40), idx + 60).replace(/\n/g, ' '),
      })
    }
  }
  return achados
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCOPO 1 — o juridiquês do Art. 20, banido em `src/` INTEIRO
// ─────────────────────────────────────────────────────────────────────────────

/** Montado em runtime — ver o aviso do cabeçalho. */
const JURIDIQUES = new RegExp(['pessoa', '\\s+', 'natural'].join(''), 'i')

describe('Escopo 1 — o juridiquês do Art. 20 não sobrevive em `src/` (Invariante 8 / BD-3)', () => {
  it('zero ocorrências em TODO `src/` — copy renderizada E comentário', () => {
    const ocorrencias = procurar([SRC], JURIDIQUES)
    expect(
      ocorrencias.length,
      `A Invariante 8 da 43-UI-SPEC bane o juridiquês do Art. 20 em TODA superfície de ` +
        `\`src/\` — de candidato e de RH, em copy e em comentário (um docblock que descreve ` +
        `o componente com a expressão morta deixa o comentário mentindo sobre o componente).\n` +
        `A BD-3 reescreveu os 3 sítios vivos; estas ocorrências são novas:\n${relatar(ocorrencias)}`,
    ).toBe(0)
  })

  it('o escopo 1 é mesmo `src/` inteiro — inclui a superfície do RH, não só a do candidato', () => {
    // A ban repo-wide é o que arrasta `RegistrarDecisaoForm` (tela do RH) para dentro da
    // BD-3. Se alguém um dia estreitar este escopo para as features do candidato, o sítio
    // do RH volta a poder regredir em silêncio — esta asserção é o que impede.
    const varridos = varrer(SRC).map((f) => f.replace(`${RAIZ}/`, ''))
    expect(varridos).toContain('src/features/decisao/components/RegistrarDecisaoForm.tsx')
    expect(varridos).toContain('src/features/explicacao/components/SolicitarRevisaoCTA.tsx')
    expect(varridos).toContain('src/router/routes.tsx')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ESCOPO 2 — futuro-de-máquina sobre exclusão, APENAS na superfície do candidato
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Allowlist explícita da 43-UI-SPEC (tabela "⚠ ESCOPO DO GREP", linha 324).
 * `privacidade/` ainda não existe (nasce no 43-08) — e `varrer` devolve [] para ela.
 */
const ALLOWLIST_CANDIDATO = [
  join(SRC, 'features/cadastro'),
  join(SRC, 'features/privacidade'),
  join(SRC, 'features/explicacao'),
  join(RAIZ, 'supabase/functions/_shared/email-templates.ts'),
]

/**
 * Léxico de EXCLUSÃO — o que torna uma frase "futuro-de-máquina sobre exclusão".
 * Radicais, para pegar flexão (excluído/excluída/excluídos, apagado/apagados…).
 */
const LEXICO_EXCLUSAO = ['exclu', 'apag', 'delet', 'elimin', 'descart'].join('|')

/**
 * Futuro-de-máquina EXPLÍCITO. Superset das strings soltas da spec — pega a flexão de
 * número que a lista literal deixaria passar: o plural não é a mesma string que o
 * singular, e mentiria exatamente igual.
 *
 * ⚠ SÃO QUATRO CONSTRUÇÕES, não uma (code review WR-11). O padrão original cobria só o
 * futuro simples de "ser" + particípio, e o docblock já se dizia "superset" — era
 * narrower than its own claim. As três que faltavam (perífrase com "ir", infinitivo
 * pessoal, e o futuro do próprio verbo sem auxiliar) são as que um copywriter produz com
 * a mesma facilidade, e a regra de coocorrência do advérbio não as socorre: ela só
 * dispara quando o advérbio está presente, e nenhuma delas precisa dele. Uma promessa
 * sem advérbio e sem "será" atravessava os DOIS portões.
 *
 * ⚠ As formas condenadas estão descritas, não transcritas: escrevê-las verbatim aqui faria
 * este arquivo ser a primeira violação do portão que ele mesmo instala (foi o que o teste
 * de auto-consistência lá embaixo acusou na primeira execução — o portão funciona).
 */
const FUTURO_DE_EXCLUSAO = new RegExp(
  [
    // futuro simples de "ser" (sing./pl.) + verbo de exclusão no particípio
    `\\bser[ao]o?\\s+(${LEXICO_EXCLUSAO})`,
    // perífrase de futuro ("ir" no presente + "ser") + particípio — a forma que um
    // copywriter escreve primeiro, e a que o padrão anterior deixava passar inteira
    `\\bv[ao]o\\s+ser\\s+(${LEXICO_EXCLUSAO})`,
    // infinitivo pessoal de "ser" + particípio ("até … pelo sistema")
    `\\bserem\\s+(${LEXICO_EXCLUSAO})`,
    // futuro do PRÓPRIO verbo de exclusão, sem auxiliar: 1ª pl., 3ª pl. e 3ª sing.
    `\\b(${LEXICO_EXCLUSAO})\\w*(remos|rao|ra)\\b`,
    // o par substantivo-exclusão ⨝ adjetivo-automático
    ['exclusao', '\\s+', 'automatic'].join(''),
  ].join('|'),
  'i',
)

/** A palavra sozinha — usada SOMENTE dentro da regra de coocorrência abaixo. */
const ADVERBIO_MAQUINA = new RegExp(['automatica', 'mente'].join(''), 'i')

/** Janela de proximidade (em caracteres) para a coocorrência advérbio ⨝ exclusão. */
const JANELA = 140

/**
 * Ocorrências do advérbio de automatismo que estão DENTRO de um contexto de exclusão.
 *
 * ⚠ POR QUE A COOCORRÊNCIA, E NÃO A PALAVRA SOLTA — medido em 2026-08-01, antes de
 * escrever este portão: a allowlist já contém **6 usos verdadeiros** do advérbio, nenhum
 * sobre exclusão (`LoadingProgress.tsx:9` barra de progresso; `useViaCEP.ts:37` busca de
 * CEP; `useFormToast.ts:24,122,185` toast; `useDuplicateCheck.ts:54`). Um deles é copy
 * RENDERIZADA ao candidato: "CEP encontrado! Endereço preenchido automaticamente".
 *
 * Banir a palavra solta reprovaria essas 6 — código pré-existente, correto e honesto — e
 * seria a MESMA armadilha que a UI-SPEC já documentou um nível acima, só que uma camada
 * mais fundo. O que a fase proíbe é PROMETER EXCLUSÃO QUE NÃO ACONTECE: nesta fase nada
 * é apagado (zero-destrutiva por desenho), e a purga só nasce na Phase 46. É o par
 * advérbio ⨝ exclusão que carrega a mentira, não o advérbio.
 *
 * A janela é medida sobre o texto e não sobre a linha porque o Prettier quebra copy longa
 * em várias linhas — uma regra por-linha perderia exatamente a frase mais provável.
 */
function coocorrenciasDeExclusaoAutomatica(alvos: string[]): Ocorrencia[] {
  const achados: Ocorrencia[] = []
  const lexico = new RegExp(LEXICO_EXCLUSAO, 'i')

  for (const arquivo of alvos.flatMap(varrer)) {
    const texto = readFileSync(arquivo, 'utf8')
    const dobrado = dobrar(texto)
    for (const m of dobrado.matchAll(new RegExp(ADVERBIO_MAQUINA.source, 'gi'))) {
      const idx = m.index ?? 0
      const janela = dobrado.slice(
        Math.max(0, idx - JANELA),
        Math.min(dobrado.length, idx + JANELA),
      )
      if (lexico.test(janela)) {
        achados.push({
          arquivo,
          linha: linhaDoIndice(texto, idx),
          trecho: texto.slice(Math.max(0, idx - 60), idx + 60).replace(/\n/g, ' '),
        })
      }
    }
  }
  return achados
}

/**
 * Os dois artefatos que, juntos, constituem o MOTOR de exclusão — o código que executa a
 * promessa. Nomes fixados pelo plano da Phase 45 (45-10 escreve a EF; 45-07 escreve o RPC).
 *
 * ⚠ Precisa dos DOIS. A EF sozinha é o orquestrador dos três sistemas e não anonimiza nada;
 * o RPC sozinho é a metade Postgres sem quem chame Storage e Auth. Uma promessa respaldada
 * por metade do motor continua sendo uma promessa que não se cumpre.
 */
const EF_EXCLUSAO = join(RAIZ, 'supabase/functions/executar-direito-titular/index.ts')
const RPC_TOMBSTONE = ['anonimizar', '_candidato'].join('')

function motorDeExclusaoExiste(): boolean {
  if (!existsSync(EF_EXCLUSAO)) return false
  const migracoes = join(RAIZ, 'supabase/migrations')
  if (!existsSync(migracoes)) return false
  return readdirSync(migracoes)
    .filter((f) => f.endsWith('.sql'))
    .some((f) => readFileSync(join(migracoes, f), 'utf8').includes(RPC_TOMBSTONE))
}

describe('Escopo 2 — futuro-de-máquina sobre exclusão, só na superfície do candidato', () => {
  /**
   * ⚠ REESCRITO em 2026-08-05, na Wave 1 da Phase 45. A pergunta mudou, o rigor não.
   *
   * A versão original afirmava, como premissa fixa, *"nesta fase nada é apagado e a purga só
   * nasce na Phase 46"*. Isso era verdade quando foi escrito e **deixou de ser** quando a
   * Phase 45 começou a construir o motor. O recibo do 45-02 traz frases em futuro sobre
   * exclusão porque a UI-SPEC as EXIGE: o recibo é entregue em dois tempos — futuro na tela
   * durante a janela de arrependimento de 15 dias, passado por e-mail na execução. Uma janela
   * de arrependimento só vale se a pessoa souber do que se arrepender.
   *
   * O que o CONSOL-04 de fato exige não é "nunca prometa": é **"toda promessa de exclusão tem
   * código que a executa"**. Então este portão passa a medir isso, e só isso. Promessa com
   * motor: permitida. Promessa sem motor: órfã, reprova — que é a mesma reprovação de antes,
   * agora pela razão certa em vez de por uma data hard-coded.
   *
   * ⚠ Enquanto 45-07 e 45-10 não pousarem, este teste FICA VERMELHO por desenho, e isso é o
   * comportamento correto: hoje a promessa é literalmente órfã. Ele fica verde sozinho quando
   * o motor existir — sem edição neste arquivo. Não isentar o artefato gerado para "voltar ao
   * verde": seria trocar a única guarda que cobre o arquivo que fala de exclusão ao titular
   * por uma exceção datada, e exceções datadas sobrevivem à data.
   */
  it('nenhuma promessa de exclusão futura sem código que a execute (CONSOL-04)', () => {
    const ocorrencias = procurar(ALLOWLIST_CANDIDATO, FUTURO_DE_EXCLUSAO)
    if (ocorrencias.length === 0) return // nada prometido — nada a respaldar

    expect(
      motorDeExclusaoExiste(),
      `A superfície do candidato PROMETE exclusão em ${ocorrencias.length} ponto(s), e o ` +
        `motor que cumpre a promessa não existe no repositório.\n\n` +
        `Faltando: ${existsSync(EF_EXCLUSAO) ? '' : `a EF \`${EF_EXCLUSAO}\` (45-10)`}` +
        `${existsSync(EF_EXCLUSAO) ? '' : ' e '}` +
        `o RPC de tombstone em \`supabase/migrations/\` (45-07).\n\n` +
        `Uma promessa sem motor é órfã — exatamente a classe de coisa que o CONSOL-04 ` +
        `existe para eliminar. As duas saídas honestas são construir o motor ou retirar a ` +
        `promessa; isentar o arquivo NÃO é uma delas.\n${relatar(ocorrencias)}`,
    ).toBe(true)
  })

  /**
   * ⚠ O ramo VERDE do portão acima precisa ser exercitado, senão ele é um `false` constante
   * disfarçado de guarda — o espelho exato da lição W-1 da Phase 43, onde asserções
   * inalcançáveis contavam como verdes. Aqui o risco é o inverso e igualmente cego: uma
   * função que devolve `false` porque nunca olha para lugar nenhum reprova pelo motivo
   * errado e continuaria reprovando **depois** de o motor existir.
   *
   * Este teste prova que `motorDeExclusaoExiste()` DISCRIMINA — que ela é uma medição do
   * disco, não uma constante. E pina POR QUE ela é falsa hoje: quando o 45-10 criar a EF,
   * esta linha vira vermelha e obriga alguém a olhar para o portão de novo, em vez de deixá-lo
   * silenciosamente permissivo.
   */
  it('o portão do CONSOL-04 mede o disco de verdade — e hoje é falso pela EF ausente', () => {
    expect(motorDeExclusaoExiste()).toBe(false)
    expect(
      existsSync(EF_EXCLUSAO),
      `Se esta asserção falhou, a EF do motor NASCEU (45-10) — vá ao portão do CONSOL-04 ` +
        `acima e confirme que ele ficou verde sozinho. Se ficou, apague esta linha. Se não ` +
        `ficou, o RPC de tombstone (45-07) ainda falta.`,
    ).toBe(false)

    // A outra metade: a função encontra o RPC quando ele existe. Provado contra o próprio
    // diretório de migrations com um token que SABIDAMENTE está lá — se esta busca não achasse
    // nada, `motorDeExclusaoExiste` seria `false` por varredura quebrada, não por motor ausente.
    const migracoes = join(RAIZ, 'supabase/migrations')
    const arquivos = readdirSync(migracoes).filter((f) => f.endsWith('.sql'))
    expect(arquivos.length).toBeGreaterThan(0)
    expect(
      arquivos.some((f) =>
        readFileSync(join(migracoes, f), 'utf8').includes('CREATE OR REPLACE FUNCTION'),
      ),
      'A varredura de migrations não achou nem `CREATE OR REPLACE FUNCTION` — ela está quebrada, ' +
        'e o portão do CONSOL-04 estaria reprovando por leitura falha em vez de motor ausente.',
    ).toBe(true)
  })

  it('nenhuma coocorrência de automatismo com exclusão dentro da allowlist', () => {
    const ocorrencias = coocorrenciasDeExclusaoAutomatica(ALLOWLIST_CANDIDATO)
    expect(
      ocorrencias.length,
      `O par "automatismo ⨝ exclusão" na superfície do candidato afirma que uma máquina ` +
        `apaga sozinha — e nesta fase nenhuma apaga.\n${relatar(ocorrencias)}`,
    ).toBe(0)
  })

  it('a allowlist é a da UI-SPEC, e `privacidade/` (que só nasce no 43-08) não quebra a varredura', () => {
    expect(ALLOWLIST_CANDIDATO).toHaveLength(4)
    const privacidade = join(SRC, 'features/privacidade')
    // O contrato que importa: ausente OU presente, a varredura devolve uma lista — nunca
    // lança. Quando o 43-08 criar o diretório, ele entra no portão sem edição nenhuma aqui.
    expect(() => varrer(privacidade)).not.toThrow()
    expect(Array.isArray(varrer(privacidade))).toBe(true)
    if (!existsSync(privacidade)) expect(varrer(privacidade)).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// O CASO POSITIVO — a prova de que o escopo 2 é ESTREITO
// ─────────────────────────────────────────────────────────────────────────────

describe('O escopo 2 é estreito — e isto é provado, não afirmado', () => {
  it('o advérbio de automatismo EXISTE em `src/` fora da allowlist, e isso NÃO reprova', () => {
    const todos = procurar([SRC], ADVERBIO_MAQUINA)
    const dentroDaAllowlist = new Set(ALLOWLIST_CANDIDATO.flatMap(varrer))
    const fora = todos.filter((o) => !dentroDaAllowlist.has(o.arquivo))

    // Se esta asserção falhar, o caso positivo virou vácuo: não há mais nenhum arquivo
    // fora da allowlist com a palavra, e o teste deixou de provar a estreiteza. Nesse
    // caso o correto é reintroduzir um caso real, não relaxar a asserção.
    expect(
      fora.length,
      'Nenhuma ocorrência fora da allowlist — o caso positivo perdeu o poder de provar ' +
        'que o escopo 2 é estreito.',
    ).toBeGreaterThan(0)

    // E o ponto inteiro: a suíte segue VERDE mesmo com essas ocorrências existindo.
  })

  it('`src/features/admin/` está FORA da allowlist — a `/admin/retencao` do 43-09 depende disso', () => {
    const admin = join(SRC, 'features/admin')
    expect(ALLOWLIST_CANDIDATO).not.toContain(admin)
    expect(ALLOWLIST_CANDIDATO.some((p) => admin.startsWith(p))).toBe(false)

    // A UI-SPEC exige que `/admin/retencao` use o advérbio DUAS VEZES, verbatim — no
    // banner de escopo e no diálogo de confirmação — para afirmar que NADA apaga
    // automaticamente. Se alguém alargar o escopo 2 para `src/` inteiro, o portão passará
    // a reprovar a copy que a spec MANDA escrever, e quem executar vai desligar o portão.
  })

  it('o advérbio sozinho não é o alvo: a regra é a coocorrência com exclusão', () => {
    // Prova direta da semântica, sem depender de nenhum arquivo do repositório.
    const adverbio = ['automatica', 'mente'].join('')
    const honesta = `CEP encontrado! Endereço preenchido ${adverbio}`
    const mentirosa = `Seus dados serão ${['exclu', 'ídos'].join('')} ${adverbio} após 24 meses.`

    const janelaTem = (frase: string) =>
      new RegExp(LEXICO_EXCLUSAO, 'i').test(dobrar(frase)) &&
      ADVERBIO_MAQUINA.test(dobrar(frase))

    expect(janelaTem(honesta)).toBe(false) // copy verdadeira sobre outro assunto → passa
    expect(janelaTem(mentirosa)).toBe(true) // promessa de máquina que apaga sozinha → reprova
  })

  it('a flexão plural também é pega — a lista literal da spec sozinha a deixaria passar', () => {
    const singular = `Seu dado será ${['exclu', 'ído'].join('')} em 24 meses.`
    const plural = `Seus dados serão ${['exclu', 'ídos'].join('')} em 24 meses.`
    expect(FUTURO_DE_EXCLUSAO.test(dobrar(singular))).toBe(true)
    expect(FUTURO_DE_EXCLUSAO.test(dobrar(plural))).toBe(true)
  })

  it('as OUTRAS construções de futuro também são pegas — não só o par "será + particípio"', () => {
    // O portão cobria UMA construção e o docblock dizia "superset" (code review WR-11).
    // Estas são as formas que um copywriter produz com a mesma facilidade — e que
    // mentiriam exatamente igual, porque nesta fase nada é apagado. A regra de
    // coocorrência com o advérbio não as pega: ela só dispara quando o advérbio está
    // presente, e nenhuma destas precisa dele.
    const perifrase = `Seus dados ${['vão ser ', 'apag'].join('')}ados em 24 meses.`
    const infinitivo = `Guardamos até ${['serem ', 'elimin'].join('')}ados.`
    const futuroNos = `Nós ${['exclu', 'iremos'].join('')} seus dados em 24 meses.`
    const futuroEles = `Os arquivos ${['apag', 'arão'].join('')} sozinhos.`
    const futuroEle = `O sistema ${['elimin', 'ará'].join('')} o currículo.`
    const passiva = `Até ${['serem ', 'descart'].join('')}ados pelo sistema.`

    for (const frase of [
      perifrase,
      infinitivo,
      futuroNos,
      futuroEles,
      futuroEle,
      passiva,
    ]) {
      expect(FUTURO_DE_EXCLUSAO.test(dobrar(frase)), `passou batido: "${frase}"`).toBe(
        true,
      )
    }
  })

  it('e o alargamento não é indiscriminado: prosa honesta sobre exclusão continua passando', () => {
    // A metade que impede o portão de virar ruído. Nenhuma destas PROMETE exclusão
    // futura; reprová-las treinaria quem executa a desligar o portão.
    const honestas = [
      'Hoje nenhuma rotina deste sistema apaga dados de candidato.',
      `Você pode pedir a ${['exclu', 'são'].join('')} dos seus dados a qualquer momento.`,
      `Nenhum dado de candidato é ${['apag', 'ado'].join('')} por esta alteração.`,
      `O botão ${['elimin', 'ar'].join('')} não existe nesta tela.`,
    ]
    for (const frase of honestas) {
      expect(
        FUTURO_DE_EXCLUSAO.test(dobrar(frase)),
        `falso positivo — copy honesta reprovada: "${frase}"`,
      ).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// O portão que guarda o portão
// ─────────────────────────────────────────────────────────────────────────────

describe('Auto-consistência — este arquivo não pode ser sua própria primeira violação', () => {
  it('nenhum literal proibido existe verbatim neste arquivo de teste', () => {
    const esteArquivo = readFileSync(__filename, 'utf8')
    const dobrado = dobrar(esteArquivo)

    // O juridiquês do escopo 1: montado em runtime, nunca escrito.
    expect(dobrado).not.toMatch(JURIDIQUES)

    // As expressões de futuro-de-exclusão do escopo 2 só aparecem montadas por `join`,
    // então também não existem verbatim.
    expect(dobrado).not.toMatch(FUTURO_DE_EXCLUSAO)
  })

  it('o próprio arquivo passaria pelo escopo 1 se estivesse sob varredura — e ele está', () => {
    // Este arquivo VIVE em `src/`, logo é varrido pelo escopo 1. A asserção acima é o que
    // impede o paradoxo de o portão reprovar a si mesmo.
    expect(varrer(SRC)).toContain(__filename)
  })
})
