/**
 * copyTransparencia.ts — toda a copy estática das páginas públicas de transparência.
 *
 * Requirement: TRANSP-01 (e, a partir do plano 47-06, TRANSP-02)
 *
 * ── POR QUE ESTE ARQUIVO EXISTE ─────────────────────────────────────────────
 * **Nenhuma string literal de copy dentro de JSX.** É isso que torna os bans de copy
 * testáveis: o portão do escopo `src/features/transparencia/` varre texto, e copy
 * espalhada dentro de componentes vira copy que ninguém consegue auditar de uma vez.
 * Molde: `COPY_PRIVACIDADE` da página autenticada de privacidade.
 *
 * ── VOCABULÁRIO TRAVADO ─────────────────────────────────────────────────────
 * A copy visível diz **empresas contratadas** — "subprocessadores" e "operadores" são
 * termos da lei que a maioria de quem se candidata não decodifica (registro BD-3). A
 * ROTA continua sendo `/subprocessadores`, porque é o termo que um leitor técnico ou um
 * auditor procura, e a URL é a única parte desta página cujo público inclui quem
 * fiscaliza (47-UI-SPEC D-47-U12).
 *
 * @see .planning/phases/47-transpar-ncia-consolida-o/47-UI-SPEC.md (§`/subprocessadores`)
 * @module features/transparencia/constants/copyTransparencia
 */

/** Copy verbatim da 47-UI-SPEC. Um bloco por página. */
export const COPY_TRANSPARENCIA = {
  subprocessadores: {
    h1: 'Com quem compartilhamos os seus dados',
    subtitulo:
      'Estas são as empresas contratadas que tratam dados de candidatos em nome da Beauty Smile. Nenhuma delas usa os seus dados para fins próprios.',
    /** O carimbo é datado (Invariante 1) e nunca fica em letra miúda de rodapé. */
    carimboPrefixo: 'Lista completa em',
    rotulos: {
      recebe: 'O que recebe',
      finalidade: 'Para quê',
      pais: 'País',
      baseLegal: 'Base legal',
    },
    linkPrivacidade: 'Ver o que guardamos e por quanto tempo',
  },

  /**
   * `/privacidade` (TRANSP-02) — copy verbatim da 47-UI-SPEC §`/privacidade`.
   *
   * ⚠ ESTE TÍTULO NÃO É O TÍTULO DA SEÇÃO DA PÁGINA AUTENTICADA. A página de
   * `/candidato/privacidade` tem hoje uma seção chamada "O que guardamos e por quê"; esta
   * página é outra coisa: ela fala da POLÍTICA (sujeito: "os candidatos", "os dados", zero
   * ação), e a autenticada fala DOS DADOS DE QUEM ESTÁ LOGADO (sujeito: "você", com ações
   * reais). Dois títulos idênticos em duas rotas de nome quase igual é a fábrica de
   * confusão que a Invariante 3 existe para impedir — para quem visita e para quem executa.
   */
  privacidade: {
    h1: 'Privacidade: o que guardamos, por quanto tempo e por quê',
    subtitulo:
      'Esta página descreve o que o sistema de recrutamento da Beauty Smile faz com os dados de quem se candidata a uma vaga — não o que ele pretende fazer. Os prazos abaixo são gerados a partir da configuração que o próprio sistema usa.',
    /**
     * O carimbo de vigência (Invariante 2). Ele traz a data da MEDIÇÃO da matriz viva,
     * nunca a data do build, e fica logo abaixo do subtítulo no tamanho de rótulo —
     * um carimbo de vigência em letra miúda de rodapé é a forma clássica de dizer a
     * verdade sem que ninguém leia.
     */
    carimboPrefixo: 'Política vigente em',

    /** Bloco 1 — a matriz derivada do artefato gerado. */
    matriz: {
      titulo: 'O que guardamos e por quanto tempo',
      rotulos: {
        prazo: 'Por quanto tempo',
        motivo: 'Por quê',
      },
      /**
       * Inteiro puro seguido da unidade da FONTE. A unidade da matriz é o mês:
       * escrever "2 anos" onde o dado é 24 não é traduzir, é editar o dado — e a
       * página existe justamente para publicar o dado que o sistema usa.
       */
      prazo: (meses: number) => `${meses} meses a partir do fim do processo`,
    },

    /** Bloco 2 — derivado do recibo de exclusão já gerado na Phase 45. */
    fica: {
      titulo: 'O que fica mesmo depois de você pedir a exclusão',
      abertura:
        'Alguns registros a Beauty Smile é obrigada a manter — e eles ficam sem ligação com você. Não dá para chegar até a sua pessoa a partir deles.',
      rotulos: {
        prazo: 'Por quanto tempo',
        baseLegal: 'Base legal',
      },
      /**
       * A expressão contratada, sempre INTEIRA. A segunda metade é o que transforma um
       * fato assustador num fato protetivo: o vínculo é cortado e o que sobrevive é a
       * prova de não-discriminação. Um prazo sem fim escrito pela metade é a leitura
       * mais assustadora possível de algo que existe para proteger quem se candidatou.
       */
      prazoIndeterminado: 'Por tempo indeterminado — sem ligação com você.',
    },

    /** Bloco 3 — o ponteiro para a página irmã. */
    compartilhamos: {
      titulo: 'Com quem compartilhamos',
      corpo:
        'Para funcionar, este sistema usa empresas contratadas que tratam dados de candidatos em nome da Beauty Smile. Elas estão todas nomeadas, com o país e a finalidade de cada uma.',
      link: 'Ver com quem compartilhamos os seus dados',
    },

    /** Bloco 4 — os direitos, o autoatendimento e o canal humano do Art. 8º §5. */
    direitos: {
      titulo: 'Seus direitos',
      corpo:
        'A LGPD (Art. 18) garante a você pedir acesso, correção e exclusão dos seus dados, entre os direitos previstos em lei.',
      autoatendimento:
        'Se você já tem cadastro, entre na sua conta e use Seus dados e autorizações: lá você vê o que autorizou, pede uma cópia dos seus dados e pode apagá-los.',
      /** O rótulo do ponteiro é o próprio nome da página autenticada — nada é prometido aqui. */
      linkAutenticada: 'Seus dados e autorizações',
      /**
       * O canal humano é OBRIGATÓRIO: é a única saída de quem perdeu o acesso à conta.
       * O endereço vem da constante canônica, nunca de um literal novo — dois endereços
       * divergentes em duas páginas de privacidade é o defeito que o portão de copy existe
       * para pegar.
       */
      canalHumano:
        'Se você não consegue entrar na conta, ou prefere falar com uma pessoa, escreva para o nosso Encarregado de Dados:',
    },

    /**
     * Bloco 5 — a honestidade sobre a própria página, e ele não é enfeite.
     *
     * É a única frase honesta possível sobre a consequência da decisão travada: a página é
     * de build-time e a matriz é editável em produção. Sem ele, a data de vigência parece
     * burocracia; com ele, a data é a explicação. Ele NÃO afirma que a página se atualiza
     * sozinha, porque isso não acontece — e prometê-lo criaria, na página que existe para
     * matar promessa sem dono, uma promessa sem dono.
     */
    comoEFeita: {
      titulo: 'Como esta página é feita',
      corpo:
        'Os prazos acima não são digitados à mão: são gerados a partir da mesma configuração que o sistema usa para decidir por quanto tempo guardar cada candidatura. Quando a configuração muda, esta página é gerada de novo — por isso ela traz a data em que passou a valer.',
    },
  },
} as const

/**
 * Formata uma data ISO (`aaaa-mm-dd`) como `dd/mm/aaaa`, no idioma de data já vivo no
 * projeto.
 *
 * **Lança em data ausente ou inválida.** A página não renderiza um carimbo com traço no
 * lugar da data: um carimbo de vigência sem data é a burocracia sem a informação que a
 * justifica — e, na Invariante 1, uma linha que não é derivada nem datada é uma promessa.
 *
 * O horário local é fixado em `T00:00:00` de propósito: sem ele o motor lê a string como
 * UTC e, em fuso negativo, a data volta um dia — o carimbo público sairia errado por um
 * detalhe de análise sintática.
 */
export function formatarDataPtBr(iso: string): string {
  const data = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(data.getTime())) {
    throw new Error(
      `Data inválida para o carimbo de vigência: «${iso}». Uma página de transparência sem ` +
        'data de vigência é uma afirmação sobre o sistema sem o momento em que ela foi verdadeira.',
    )
  }
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
