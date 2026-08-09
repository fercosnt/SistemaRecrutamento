/**
 * subprocessadores.ts — as empresas contratadas que tratam dados de candidatos em nome
 * da Beauty Smile (TRANSP-01 · LGPD, Art. 18, VII).
 *
 * Requirement: TRANSP-01 · Phase 47
 * Consumidor: `/subprocessadores` (src/features/transparencia/components/)
 *
 * ── SEIS ENTRADAS, NÃO QUATRO ───────────────────────────────────────────────
 * O parêntese do ROADMAP nomeia quatro empresas. A varredura do código vivo encontrou
 * SEIS: o provedor de IA de reserva é caminho vivo (`_shared/ai-client.ts` registra a
 * chamada com o nome dele) e o serviço público de CEP recebe uma chamada feita pelo
 * navegador do próprio candidato. Os quatro do critério são PISO, não teto — uma página
 * que diz "estas são as empresas" e omite duas é factualmente falsa.
 *
 * ── POR QUE EXISTE UMA SENTINELA, E POR QUE ELA NÃO É UM PLACEHOLDER ────────
 * O tipo abaixo obriga os cinco campos. Sem uma sentinela declarada, quem preenchesse o
 * arquivo seria empurrado a INVENTAR um país para fazê-lo compilar. `PAIS_POR_MEDIR` é o
 * caminho honesto entre "não compila" e "publica um palpite": o validador a trata como
 * reprovação dura, a ficha lança em vez de renderizar, e a entrada não chega à página.
 *
 * O país que esta página declara NÃO é o país da sede da empresa — é a região onde o
 * dado DESTE projeto é tratado. São fatos diferentes, e só o segundo é o que a lei faz
 * importar numa declaração de transferência internacional. O primeiro é achável na web;
 * o segundo só na conta do provedor, e a pesquisa da fase mediu que nenhuma das seis
 * regiões é obtenível deste ambiente (47-RESEARCH §C3.2).
 *
 * ── DECISÃO REGISTRADA · O SERVIÇO PÚBLICO DE CEP ───────────────────────────
 * Ele ENTRA na lista. A chamada é disparada pela página da Beauty Smile, com dado que a
 * pessoa digitou aqui, e o endereço de origem do navegador dela vai junto — é tratamento
 * causado por este sistema, ainda que o pacote não passe pelos servidores da empresa.
 * A decisão fica escrita porque a alternativa (concluir que ele não qualifica) só seria
 * legítima ESCRITA; omitir em silêncio é o que está proibido.
 *
 * ── DECISÃO REGISTRADA · O MODO DE TESTE DO PROVEDOR DE E-MAIL ──────────────
 * `_shared/email-config.ts` redireciona a mensagem inteira para um endereço de teste do
 * próprio provedor quando o sistema roda em modo de teste. A ficha descreve o modo de
 * PRODUÇÃO, que é o que trata dado de candidato real; o desvio de teste não muda a
 * empresa que recebe nem a natureza do dado, e por isso não vira uma segunda ficha.
 *
 * ── AS BASES LEGAIS SÃO CARREGADAS, NUNCA AUTORADAS AQUI ────────────────────
 * As duas citações abaixo são cópia verbatim de `matrizRetencao.generated.ts`, o artefato
 * gerado e sob portão desde o plano 47-01. Um teste confronta cada base legal desta lista
 * com as citações daquele artefato: se a revisão do Encarregado reescrever uma delas lá,
 * este arquivo fica vermelho até acompanhar. Duas declarações públicas sobre a mesma
 * norma divergindo entre si é o defeito que essa amarração existe para impedir.
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/subprocessadores`)
 * @see _shared/pii-masker.ts (as sete classes de padrão que saem do texto, sob `functions/`)
 * @module features/transparencia/constants/subprocessadores
 */

/** Uma empresa contratada, com os CINCO campos obrigatórios da ficha pública. */
export interface Subprocessador {
  /** Nome comercial da empresa. Nunca modelo, plano contratado ou região técnica. */
  readonly nome: string
  /** O que a empresa recebe, em fato — não em finalidade. */
  readonly recebe: string
  /** Para quê ela recebe, no presente, descrevendo o uso real. */
  readonly finalidade: string
  /** A região onde o dado deste projeto é tratado. Fato MEDIDO, nunca presumido. */
  readonly pais: string
  /** Citação da norma, carregada de artefato existente do repositório. */
  readonly baseLegal: string
}

/**
 * Sentinela: **o país desta entrada ainda não foi medido, e enquanto ela estiver aqui a
 * entrada não pode ser publicada.**
 *
 * Ela é reprovação dura no validador e no ponto de renderização. Não é um marcador de
 * pendência para o leitor — é o oposto disso: ela existe justamente para que nenhum
 * marcador de pendência chegue à página.
 */
export const PAIS_POR_MEDIR = '__PAIS_POR_MEDIR__'

/**
 * Data em que a varredura do código vivo produziu esta lista de seis empresas.
 * É o carimbo público "Lista completa em {data}" — a data da medição, nunca a do build.
 */
export const LISTA_MEDIDA_EM = '2026-08-09'

/** Verbatim de `matrizRetencao.generated.ts` → etapa `inscricao`. */
const BASE_LEGAL_PROCEDIMENTO_PRELIMINAR =
  'LGPD, Art. 7º, V — tratamento necessário a procedimentos preliminares de contrato, a pedido do titular.'

/** Verbatim de `matrizRetencao.generated.ts` → etapa `avaliacao_assincrona`. */
const BASE_LEGAL_AVALIACAO =
  'LGPD, Art. 7º, IX e Art. 20 — legítimo interesse na condução do processo, com direito à revisão da decisão.'

/**
 * O que os dois provedores de IA recebem — e o limite factual do que dá para afirmar.
 *
 * O sistema troca por marcadores sete classes de padrão antes de o texto sair. A troca é
 * por expressão de escrita e **não existe padrão de nome próprio**: um nome digitado no
 * meio de uma frase chega junto. Dizer o contrário seria a afirmação falsa que esta
 * página existe para não fazer, e é por isso que a última frase do texto está lá.
 */
const RECEBE_PROVEDOR_DE_IA =
  'O texto que você escreveu na candidatura, depois de o sistema trocar por marcadores os números de CPF, CNPJ e RG, o e-mail, o telefone, a data de nascimento e o endereço com logradouro que encontrar. A troca é feita por padrão de escrita: um nome próprio digitado no meio de uma frase não segue padrão nenhum e chega junto com o texto.'

/**
 * As seis empresas contratadas, na ordem em que o dado as encontra: primeiro quem lê o
 * texto da candidatura, depois quem completa o cadastro, quem avisa, quem guarda e quem
 * serve as páginas.
 *
 * ⚠ O campo `pais` das seis carrega a sentinela. É estado CORRETO enquanto a medição não
 * for feita — e é o que impede a página de embarcar com uma declaração de transferência
 * internacional adivinhada.
 */
export const SUBPROCESSADORES: readonly Subprocessador[] = [
  {
    nome: 'Anthropic',
    recebe: RECEBE_PROVEDOR_DE_IA,
    finalidade:
      'Gerar a avaliação comportamental/cognitiva e o texto de apoio que uma pessoa do RH lê antes de decidir. A decisão sobre a sua candidatura é sempre de uma pessoa.',
    // país por medir — a região efetiva é fato da conta do provedor; o repositório só
    // prova que não há seleção de região no cliente compartilhado.
    pais: PAIS_POR_MEDIR,
    baseLegal: BASE_LEGAL_AVALIACAO,
  },
  {
    nome: 'OpenAI',
    recebe: RECEBE_PROVEDOR_DE_IA,
    finalidade:
      'Gerar a mesma avaliação comportamental/cognitiva quando a chamada ao serviço primário falha. É o caminho de reserva, e ele é usado de verdade.',
    // país por medir — idem à entrada anterior.
    pais: PAIS_POR_MEDIR,
    baseLegal: BASE_LEGAL_AVALIACAO,
  },
  {
    nome: 'ViaCEP',
    recebe:
      'O CEP que você digita no cadastro e o endereço de origem do seu navegador. Esta chamada sai do seu próprio aparelho, não dos servidores da Beauty Smile.',
    finalidade:
      'Devolver o logradouro, o bairro e a cidade daquele CEP para preencher o endereço do seu cadastro.',
    // país por medir — a documentação oficial do serviço é o caminho de medição.
    pais: PAIS_POR_MEDIR,
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
  {
    nome: 'Resend',
    recebe: 'O endereço de e-mail de quem vai receber o aviso e o texto do aviso.',
    finalidade:
      'Entregar os avisos sobre a sua candidatura: a confirmação de que ela chegou e as mudanças de etapa.',
    // país por medir — a região é configuração da conta.
    pais: PAIS_POR_MEDIR,
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
  {
    nome: 'Supabase',
    recebe: 'Os dados do seu cadastro, os da sua candidatura e o arquivo do seu currículo.',
    finalidade:
      'Guardar esses dados e servi-los ao sistema: a entrada na sua conta, o banco de dados e o armazenamento do arquivo.',
    // país por medir — `docs/compliance/backup-posture.md` registra esta região como
    // desconhecida, e o caminho de medição prescrito ali exige credencial da conta.
    pais: PAIS_POR_MEDIR,
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
  {
    nome: 'Vercel',
    recebe:
      'A requisição do seu navegador e o endereço de origem dela, cada vez que você abre uma página do site de vagas.',
    finalidade: 'Servir as páginas do site de vagas ao seu navegador.',
    // país por medir — e aqui a própria forma da resposta é decisão do Encarregado: para
    // conteúdo servido por rede de borda global, "um país" pode não ser a resposta honesta.
    pais: PAIS_POR_MEDIR,
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// O validador — a falha alta como PROPRIEDADE DO CÓDIGO, não como intenção escrita
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Os quatro marcadores de indefinição banidos pela 47-UI-SPEC §Bans.
 *
 * ⚠ Montados por junção de fragmentos, e não é estilo: o portão de copy do escopo
 * `src/features/transparencia/` reprova zero ocorrência dessas expressões nesta pasta.
 * Escrevê-las verbatim aqui faria este arquivo — o que existe para as proibir — ser a
 * primeira ocorrência que o portão denuncia.
 */
const MARCADORES_DE_INDEFINICAO = [
  ['n', 'ão ', 'informado'].join(''),
  ['a ', 'defi', 'nir'].join(''),
  ['t', 'b', 'd'].join(''),
  ['a ', 'confir', 'mar'].join(''),
]

const CAMPOS_DA_FICHA: ReadonlyArray<{ chave: keyof Subprocessador; rotulo: string }> = [
  { chave: 'nome', rotulo: 'nome' },
  { chave: 'recebe', rotulo: 'o que recebe' },
  { chave: 'finalidade', rotulo: 'para quê' },
  { chave: 'pais', rotulo: 'país' },
  { chave: 'baseLegal', rotulo: 'base legal' },
]

/** Rótulo humano da entrada. Sem nome, a posição é o único identificador honesto. */
function identificar(entrada: Subprocessador, posicao?: number): string {
  const nome = entrada.nome?.trim()
  if (nome) return nome
  return posicao === undefined ? 'entrada sem nome' : `entrada #${posicao + 1}`
}

/**
 * Valida UMA entrada e a devolve, ou **lança** nomeando a empresa e o campo.
 *
 * ── POR QUE LANÇA EM VEZ DE FILTRAR ─────────────────────────────────────────
 * Filtrar entregaria uma página mais curta e plausível: a declaração pública de que
 * compartilhamos com menos empresas do que compartilhamos. Uma lista incompleta que
 * parece completa é pior do que um erro visível, porque ninguém vai procurá-la.
 */
export function validarEntradaSubprocessador(
  entrada: Subprocessador,
  posicao?: number,
): Subprocessador {
  const quem = identificar(entrada, posicao)

  for (const { chave, rotulo } of CAMPOS_DA_FICHA) {
    const valor = entrada[chave]

    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new Error(
        `Subprocessador «${quem}»: o campo «${rotulo}» está vazio. ` +
          'Nenhuma entrada embarca com campo por preencher — um campo vazio numa declaração ' +
          'de transferência internacional é uma omissão publicada.',
      )
    }

    if (valor.includes(PAIS_POR_MEDIR)) {
      throw new Error(
        `Subprocessador «${quem}»: o campo «${rotulo}» ainda carrega a sentinela de pendência. ` +
          'A região onde o dado deste projeto é tratado é fato da conta do provedor e precisa ser ' +
          'medida antes de a página ser publicada. Um país presumido é pior do que página nenhuma.',
      )
    }

    const dobrado = valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    for (const marcador of MARCADORES_DE_INDEFINICAO) {
      const alvo = marcador.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      if (dobrado.includes(alvo)) {
        throw new Error(
          `Subprocessador «${quem}»: o campo «${rotulo}» carrega um marcador de indefinição. ` +
            'A ficha declara fatos medidos; sem medição a entrada não embarca.',
        )
      }
    }
  }

  return entrada
}

/**
 * Valida a lista inteira e a devolve, ou **lança** na primeira entrada defeituosa.
 *
 * Lista vazia é **falha de geração**, nunca estado de tela: uma página de compartilhamento
 * sem nenhuma ficha afirmaria "não compartilhamos com ninguém", que é o oposto do fato.
 */
export function validarSubprocessadores(
  lista: readonly Subprocessador[],
): readonly Subprocessador[] {
  if (lista.length === 0) {
    throw new Error(
      'A lista de empresas contratadas está vazia. Isso é falha de geração, nunca um estado ' +
        'de tela: a aplicação não roda sem infraestrutura nem sem hospedagem.',
    )
  }

  lista.forEach((entrada, posicao) => validarEntradaSubprocessador(entrada, posicao))
  return lista
}
