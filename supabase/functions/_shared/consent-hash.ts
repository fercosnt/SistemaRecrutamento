/**
 * Hash SHA-256 do texto de consentimento (CONSENT-02).
 *
 * A cadeia inteira da prova de consentimento é:
 *
 *   consent-text.json  →  calcularHashConsentimento()  →  montarRegistroAutorizacoes()
 *                                                      →  INSERT em public.autorizacoes
 *
 * Este módulo é o segundo elo. Ele existe para que a linha gravada em
 * `autorizacoes.consent_text_hash` seja verificável: dado o arquivo de texto e a
 * versão, qualquer pessoa recomputa o hex e confere contra a linha. Sem isso, a
 * coluna afirma "a pessoa leu o texto X" sem que exista maneira de saber qual era
 * o texto X.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ O HASH NUNCA É COMPUTADO SOBRE OS BYTES CRUS DO ARQUIVO
 * ─────────────────────────────────────────────────────────────────────────────
 * `sha256(readFile('consent-text.json'))` seria mais simples e estaria ERRADO:
 * indentação, ordem das chaves de metadados, presença do `_nota` e o `\n` final
 * entrariam na prova. O formatador do repositório muda qualquer um desses sem
 * que uma única palavra lida pelo candidato mude — e cada passada do formatador
 * cunharia um hash novo para um texto idêntico. As linhas antigas passariam a
 * não corresponder a "texto nenhum" exatamente como se a copy tivesse sido
 * reescrita.
 *
 * A entrada canônica é, portanto, SEMÂNTICA e não sintática: apenas os pares
 * (rótulo, descrição) de cada consentimento, na ORDEM DE RENDERIZAÇÃO do arquivo,
 * normalizados, mais a versão.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * O QUE ENTRA E O QUE NÃO ENTRA
 * ─────────────────────────────────────────────────────────────────────────────
 * ENTRA:
 *   · `rotulo` e `descricao` de cada entrada de `consentimentos`, nessa ordem
 *   · a ORDEM entre consentimentos — trocar dois de lugar muda o hex, porque a
 *     ordem em que as escolhas são apresentadas faz parte do que foi lido
 *   · a versão (`CONSENT_TEXT_VERSION`)
 *
 * NÃO ENTRA:
 *   · `informativo_transacional` — não é consentimento (Art. 7º, V; UI-SPEC
 *     Invariante 3). Incluí-lo afirmaria consentimento sobre algo não escolhido
 *   · `id`, `obrigatorio`, `_nota` e qualquer outro metadado — são contrato de
 *     código, não texto lido
 *   · espaço em volta e forma de composição Unicode — `trim()` + `normalize('NFC')`
 *     são aplicados antes, para que um "é" pré-composto (U+00E9) e um decomposto
 *     (U+0065 U+0301) produzam o MESMO hex. Editores e sistemas de arquivos
 *     (macOS usa NFD) trocam entre as duas formas sem aviso; sem a normalização,
 *     um `git checkout` num Mac poderia mudar o hash de um texto idêntico na tela
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEGURANÇA (T-43-01)
 * ─────────────────────────────────────────────────────────────────────────────
 * O hash é calculado EXCLUSIVAMENTE no servidor, a partir do arquivo do servidor.
 * Nenhum campo de hash existe no schema de entrada da EF, e o `.strict()` de
 * `cadastroCandidatoSchema` rejeita qualquer chave nova que tentasse injetá-lo.
 * Um hash controlado pelo titular não prova nada: o atacante escolheria o texto
 * ao qual a linha "corresponde".
 *
 * Zero dependência npm — `crypto.subtle` é API de runtime (Deno e browser).
 *
 * @module supabase/functions/_shared/consent-hash
 */

/**
 * Uma entrada de consentimento tal como vive em `consent-text.json`. O tipo é
 * deliberadamente estrutural (não `import`a o JSON) para que o módulo possa
 * hashear qualquer corpus — inclusive o `v1-historico` — sem acoplamento.
 */
export interface EntradaConsentimento {
  rotulo: string
  descricao: string
}

/**
 * Separador entre a serialização dos pares e a versão. Um espaço simples: a
 * serialização já é JSON (aspas delimitam cada string), então não há como o
 * conteúdo de um rótulo atravessar essa fronteira e forjar outra entrada.
 */
const SEPARADOR_VERSAO = ' '

/**
 * Normalização canônica de uma string do corpus: remove espaço em volta e fixa a
 * forma de composição Unicode em NFC. Ver docblock do módulo para o porquê.
 */
function normalizar(valor: string): string {
  return valor.trim().normalize('NFC')
}

/**
 * Serialização canônica da entrada do hash. PURA e SÍNCRONA — exposta separada da
 * função async para que o teste possa asserir a forma exata da entrada sem
 * depender de `crypto.subtle`, e para que uma divergência de hex seja depurável
 * lendo a string em vez de adivinhando.
 *
 * Forma: `JSON.stringify([[rotulo, descricao], …]) + ' ' + versao`
 *
 * @param consentimentos Entradas na ORDEM DE RENDERIZAÇÃO (a ordem importa)
 * @param versao         `CONSENT_TEXT_VERSION` do corpus
 */
export function serializarEntradaHash(
  consentimentos: readonly EntradaConsentimento[],
  versao: string,
): string {
  const pares = consentimentos.map((c) => [
    normalizar(c.rotulo),
    normalizar(c.descricao),
  ])
  return JSON.stringify(pares) + SEPARADOR_VERSAO + normalizar(versao)
}

/**
 * SHA-256 da entrada canônica, em hex MINÚSCULO (64 caracteres).
 *
 * Determinístico: a mesma entrada devolve o mesmo hex em qualquer ordem de
 * chamada e em qualquer runtime que implemente `crypto.subtle`.
 *
 * @param consentimentos Entradas na ORDEM DE RENDERIZAÇÃO
 * @param versao         `CONSENT_TEXT_VERSION` do corpus
 * @returns hex de 64 caracteres, minúsculo
 */
export async function calcularHashConsentimento(
  consentimentos: readonly EntradaConsentimento[],
  versao: string,
): Promise<string> {
  const entrada = serializarEntradaHash(consentimentos, versao)
  const bytes = new TextEncoder().encode(entrada)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
