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

/** Copy verbatim da 47-UI-SPEC. Um bloco por página; o de `/privacidade` chega em 47-06. */
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
