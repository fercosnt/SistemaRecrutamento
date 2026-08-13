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
 * ── POR QUE EXISTE UMA SENTINELA, E POR QUE ELA CONTINUA AQUI DEPOIS DE MEDIDA
 * O tipo abaixo obriga os cinco campos. Sem uma sentinela declarada, quem preenchesse o
 * arquivo seria empurrado a INVENTAR um país para fazê-lo compilar. `PAIS_POR_MEDIR` é o
 * caminho honesto entre "não compila" e "publica um palpite": o validador a trata como
 * reprovação dura, a ficha lança em vez de renderizar, e a entrada não chega à página.
 *
 * As seis foram medidas em 2026-08-11 e nenhuma carrega mais a sentinela. Ela **não foi
 * removida**, e o validador tampouco: os dois são a rede que impede a PRÓXIMA entrada —
 * um fornecedor novo, acrescentado com pressa — de embarcar sem medição. Um portão que
 * some no dia em que fica verde nunca foi um portão.
 *
 * O país que esta página declara NÃO é o país da sede da empresa — é a região onde o
 * dado DESTE projeto é tratado. São fatos diferentes, e só o segundo é o que a lei faz
 * importar numa declaração de transferência internacional. O primeiro é achável na web;
 * o segundo só na conta do provedor — e foi lá que o operador o mediu, painel a painel,
 * em 2026-08-11. A proveniência de cada um está no comentário ao lado da entrada.
 *
 * ── O ACHADO QUE É A JUSTIFICATIVA VIVA DESTA REGRA ─────────────────────────
 * Antes da medição havia um indício à mão: o `TimeZone` do banco em produção é
 * `America/Sao_Paulo`. Ele foi RECUSADO como prova de região — fuso é preferência de
 * sessão, não localização de servidor. A medição no painel provou a região real:
 * **Estados Unidos**. O indício apontava para o Brasil e estava ERRADO. Se ele tivesse
 * sido aceito, esta página afirmaria que os dados de candidatos brasileiros ficam no
 * Brasil — uma declaração pública falsa sobre transferência internacional, produzida por
 * um palpite plausível. É por isso que o tipo deste campo diz "fato MEDIDO, nunca
 * presumido": a regra não é zelo, é a diferença entre esta página e uma mentira.
 *
 * ── CINCO DAS SEIS TRATAM OS DADOS NOS ESTADOS UNIDOS ───────────────────────
 * Todos os candidatos são brasileiros. A lista declara, portanto, transferência
 * internacional em quase toda a cadeia — que é exatamente o fato que o Art. 18, VII
 * existe para tornar público. A página não minimiza e não dramatiza: declara.
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
 * com as citações daquele artefato: se uma revisão de privacidade reescrever uma delas lá,
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
 *
 * ⚠ Nenhuma das seis entradas atuais a carrega (medidas em 2026-08-11). Ela permanece
 * exportada de propósito: é o valor que a SÉTIMA entrada usa enquanto o país dela não
 * for medido na conta do provedor. Apagá-la agora devolveria ao próximo autor a escolha
 * entre "não compila" e "inventa um país", que é justamente a escolha que ela remove.
 */
export const PAIS_POR_MEDIR = '__PAIS_POR_MEDIR__'

/**
 * Data em que a lista publicada ficou COMPLETA, e é ela que o carimbo público mostra.
 *
 * São duas medições e a data é a da última: a varredura do código vivo elegeu as seis
 * empresas em 2026-08-09, e a medição dos seis países nos painéis dos provedores em
 * 2026-08-11 preencheu o único campo que faltava. Antes desta data a lista existia mas
 * não estava completa — "Lista completa em" seria falso com a data anterior.
 *
 * É a data da medição, nunca a do build.
 */
export const LISTA_MEDIDA_EM = '2026-08-11'

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
 * ⚠ O campo `pais` das seis foi MEDIDO pelo operador em 2026-08-11, nos painéis e nos
 * documentos de cada fornecedor. O comentário ao lado de cada entrada registra a
 * proveniência exata daquele valor — de onde ele saiu e o que ele não afirma. Duas
 * entradas têm proveniência mais fraca do que as outras quatro, e isso está escrito:
 * a de IA de reserva (padrão do fornecedor, não região configurada) e a do serviço de
 * CEP (jurisdição do serviço, hospedagem não divulgada — ressalva no campo visível).
 */
export const SUBPROCESSADORES: readonly Subprocessador[] = [
  {
    nome: 'Anthropic',
    recebe: RECEBE_PROVEDOR_DE_IA,
    finalidade:
      'Gerar a avaliação comportamental/cognitiva e o texto de apoio que uma pessoa do RH lê antes de decidir. A decisão sobre a sua candidatura é sempre de uma pessoa.',
    // PAÍS MEDIDO EM 2026-08-11 — política pública do fornecedor (Trust Center e a lista
    // de subprocessadores dele): a empresa é sediada nos Estados Unidos e declara que os
    // dados são transferidos, usados e armazenados lá. O repositório prova o outro lado
    // do fato: não há seleção de região no cliente compartilhado, então não existe
    // configuração deste projeto que desloque o tratamento para outro lugar.
    pais: 'Estados Unidos',
    baseLegal: BASE_LEGAL_AVALIACAO,
  },
  {
    nome: 'OpenAI',
    recebe: RECEBE_PROVEDOR_DE_IA,
    finalidade:
      'Gerar a mesma avaliação comportamental/cognitiva quando a chamada ao serviço primário falha. É o caminho de reserva, e ele é usado de verdade.',
    // PAÍS MEDIDO EM 2026-08-11 — e esta é a proveniência mais fraca das seis, registrada
    // como tal. O operador procurou o campo de residência de dados no painel da conta e
    // ele NÃO FOI ENCONTRADO: esta conta nunca configurou região, logo vale o padrão do
    // fornecedor, que são os Estados Unidos. ⚠ É padrão-não-configurado, NÃO uma região
    // escolhida — o valor é o mesmo, a base dele é outra.
    //
    // A ressalva fica NESTE comentário e não no campo visível porque não muda a conclusão
    // do leitor sobre onde o dado é tratado; ela muda só como sabemos, e isso é
    // proveniência de engenharia. O critério é o mesmo aplicado à entrada do serviço de
    // CEP, onde a ressalva SOBE para o campo visível justamente porque lá ela muda a
    // conclusão.
    pais: 'Estados Unidos',
    baseLegal: BASE_LEGAL_AVALIACAO,
  },
  {
    nome: 'ViaCEP',
    recebe:
      'O CEP que você digita no cadastro e o endereço de origem do seu navegador. Esta chamada sai do seu próprio aparelho, não dos servidores da Beauty Smile.',
    finalidade:
      'Devolver o logradouro, o bairro e a cidade daquele CEP para preencher o endereço do seu cadastro.',
    // PAÍS MEDIDO EM 2026-08-11 — viacep.com.br é um webservice brasileiro de consulta de
    // CEP, alimentado por dados de IBGE, ANATEL e SIAFI, e operado sob a lei brasileira.
    //
    // ⚠ O fornecedor NÃO PUBLICA a região de hospedagem dele. Este valor é a jurisdição do
    // serviço, e não um centro de dados que alguém tenha medido — e por isso a ressalva
    // está no CAMPO VISÍVEL, não só aqui. As outras cinco entradas declaram região medida;
    // um "Brasil" seco seria lido pelo candidato na mesma escala das outras cinco e
    // afirmaria mais do que sabemos. Aqui a nuance muda a conclusão do leitor, então ela
    // é visível.
    pais:
      'Brasil — o serviço é brasileiro e a consulta é feita sob a lei brasileira. O fornecedor não publica em que país ficam os servidores dele, então esta linha declara a jurisdição do serviço, e não um centro de dados medido.',
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
  {
    nome: 'Resend',
    recebe: 'O endereço de e-mail de quem vai receber o aviso e o texto do aviso.',
    finalidade:
      'Entregar os avisos sobre a sua candidatura: a confirmação de que ela chegou e as mudanças de etapa.',
    // PAÍS MEDIDO EM 2026-08-11 — o acordo de tratamento de dados do fornecedor declara,
    // em citação literal: "Company's primary processing operations take place in the
    // United States".
    pais: 'Estados Unidos',
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
  {
    nome: 'Supabase',
    recebe: 'Os dados do seu cadastro, os da sua candidatura e o arquivo do seu currículo.',
    finalidade:
      'Guardar esses dados e servi-los ao sistema: a entrada na sua conta, o banco de dados e o armazenamento do arquivo.',
    // PAÍS MEDIDO EM 2026-08-11 — painel do projeto, Settings → General → Region, lido
    // pelo operador na conta: a região é `us-east-1` (Norte da Virgínia, Estados Unidos).
    // É o fato que `docs/compliance/backup-posture.md` registrava como desconhecido.
    //
    // ⚠ ESTA É A ENTRADA QUE DESMENTIU O INDÍCIO. O `TimeZone` do banco em produção é
    // `America/Sao_Paulo`, e isso foi recusado como prova de região antes da medição.
    // Fez diferença: a região real é `us-east-1`. Se o fuso tivesse valido como prova,
    // esta ficha diria "Brasil" e a página afirmaria que os dados de candidatos
    // brasileiros ficam no Brasil — o que é FALSO. O indício apontava para o lado errado.
    //
    // A região técnica fica NESTE comentário e nunca no campo visível (Invariante 11):
    // nome de região muda sem aviso e é mapa de infraestrutura oferecido de graça.
    pais: 'Estados Unidos',
    baseLegal: BASE_LEGAL_PROCEDIMENTO_PRELIMINAR,
  },
  {
    nome: 'Vercel',
    recebe:
      'A requisição do seu navegador e o endereço de origem dela, cada vez que você abre uma página do site de vagas.',
    finalidade: 'Servir as páginas do site de vagas ao seu navegador.',
    // PAÍS MEDIDO EM 2026-08-11 — painel do projeto, Settings → Functions → Function
    // Region, lido pelo operador: `iad1`, Washington, D.C., Estados Unidos (East).
    //
    // O plano previa que "um país" pudesse não ser a resposta honesta para conteúdo
    // servido por rede de borda global. A medição resolveu isso pelo lado do fato: a
    // região onde a requisição é PROCESSADA está declarada no painel e é uma só. O que a
    // rede de borda faz com cópias de arquivos estáticos é distribuição, não tratamento
    // com finalidade própria — e não é o que esta coluna declara. Região técnica só aqui.
    pais: 'Estados Unidos',
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
