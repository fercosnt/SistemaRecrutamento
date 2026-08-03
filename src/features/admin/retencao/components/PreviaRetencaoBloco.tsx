/**
 * PreviaRetencaoBloco — a prévia READ-ONLY da retenção (RETEN-04).
 *
 * É a superfície que responde "quantos seriam afetados" **sem que nada seja afetado**.
 *
 * ── AS TRÊS REGRAS SUBSTANTIVAS, E ONDE CADA UMA É IMPOSTA ──────────────────────
 *
 * 1. **A prévia NUNCA identifica candidato.** Só contagens agregadas por estado — nunca
 *    nome, e-mail, id ou lista de linhas. Isso é imposto **no banco**, não aqui: o
 *    predicado `candidaturas_alem_da_janela()` é a única função da fase que devolve linhas
 *    identificáveis e está revogada de PUBLIC/anon/authenticated **sem `GRANT` de volta**
 *    (plano 43-06). Não existe caminho PostgREST para ela. Esta tela apenas não
 *    reintroduz o problema.
 *
 * 2. **A prévia carimba a própria data**, e o carimbo vem de `calculada_em`, computado por
 *    `now()` DENTRO da mesma função que computa o número (lição 42-12). Um fato datado cuja
 *    data depende de alguém lembrar de anotá-la é promessa sem código que a execute: sem
 *    carimbo não há como distinguir um número de hoje de um colado do mês passado.
 *
 * 3. **A prévia não fica ao lado de nenhum botão de ação.** Nenhum "Executar", nenhum
 *    "Aplicar agora", nenhum controle a menos de um card de distância. A tela não deve
 *    sugerir que existe um gatilho — porque não existe. A suíte prova isso por asserção
 *    ESTRUTURAL (nenhum `<button>`/`<a>` descendente nos estados populado e zero), e não
 *    por leitura do texto visível: nenhuma asserção sobre texto pegaria um botão
 *    acrescentado aqui depois.
 *
 * ── COR: NEUTRO, JAMAIS DESTRUCTIVE E JAMAIS ÂMBAR ─────────────────────────────
 * Regra explícita e substantiva da 43-UI-SPEC. Nada é destruído; pintar o número de
 * vermelho afirmaria visualmente o oposto do que a fase faz. (O estado de ERRO é outra
 * coisa: ali o tratamento de erro do `AsyncState` é o correto — o erro é do cálculo, não
 * do número.)
 *
 * ── AS DUAS CONTAGENS CONTAM COISAS DIFERENTES, DE PROPÓSITO ───────────────────
 * A linha por estado conta **candidaturas** (a matriz é chaveada por estado e uma pessoa
 * pode ter várias); o total conta **candidatos** cujas candidaturas estão TODAS fora da
 * janela. Consequência aritmética esperada: o total é **menor ou igual** à soma das linhas.
 * Emenda registrada da 43-UI-SPEC pelo plano 43-06 — o rótulo aprovado antes contaria uma
 * coisa e nomearia outra.
 *
 * ── O QUE A TELA MOSTRA HOJE, E ISSO É O NÚMERO CERTO ──────────────────────────
 * Medido em PROD no 43-07: **zero candidaturas além da janela**. A matriz está semeada em
 * 24 meses e o sistema é mais novo que isso, então `previa_retencao()` devolve ZERO linhas
 * e o total é 0. O estado zero desta tela é a resposta correta — não é bug e não é
 * carregamento.
 *
 * @module features/admin/retencao/components/PreviaRetencaoBloco
 * @see .planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-UI-SPEC.md (§Prévia read-only + a emenda do 43-06)
 */
import { AsyncState } from '@/components/ui/AsyncState'
import { ETAPA_M2_LABELS } from '@/features/triagem/services/triagemService'
import { usePreviaRetencao } from '../hooks/usePreviaRetencao'

/** Copy verbatim da 43-UI-SPEC (§Prévia read-only), com a emenda registrada do 43-06. */
export const PREVIA_COPY = {
  titulo: 'Prévia — quantos seriam afetados',
  corpo: {
    inicio:
      'Contagem de candidatos cujos dados já teriam passado da janela definida acima. ',
    forte: 'Esta prévia não executa nada.',
  },
  /** EMENDA 43-06: a linha por estado conta CANDIDATURAS. */
  unidadeLinha: (n: number) => `${formatarContagem(n)} candidaturas`,
  /** O total conta CANDIDATOS — e não é a soma das linhas. */
  total: (n: number) => `Total: ${formatarContagem(n)} candidatos`,
  zero: 'Nenhum candidato seria afetado por esta janela hoje.',
  carimbo: (data: string, hora: string) => `Prévia calculada em ${data} às ${hora}.`,
  erro: {
    heading: 'Não foi possível calcular a prévia.',
    generic: 'A matriz acima continua legível e editável.',
  },
} as const

/** Inteiro puro até 999; separador de milhar pt-BR acima disso (43-UI-SPEC §Formatação). */
export function formatarContagem(n: number): string {
  return n > 999 ? n.toLocaleString('pt-BR') : String(n)
}

/** `dd/mm/aaaa` + `HH:mm` 24h, pt-BR. Data inválida → sem carimbo, nunca um carimbo falso. */
export function formatarCarimbo(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const data = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return PREVIA_COPY.carimbo(data, hora)
}

export function PreviaRetencaoBloco() {
  const { data, isLoading, isError, refetch, isRefetching } = usePreviaRetencao()

  const linhas = data?.linhas ?? []
  const total = data?.total ?? 0
  const carimbo = formatarCarimbo(data?.calculadaEm ?? null)
  // Zero é uma RESPOSTA, não um vazio: `isEmpty` do AsyncState nunca é usado aqui, senão
  // a contagem correta (zero) seria apresentada como ausência de dado.
  const zero = linhas.length === 0 && total === 0

  return (
    // Tratamento NEUTRO — jamais destructive, jamais âmbar. Ver o docblock.
    <section className="space-y-3 rounded-lg border border-white/15 bg-white/5 p-4">
      <h2 className="text-xl font-semibold text-white">{PREVIA_COPY.titulo}</h2>
      <p className="text-base text-white/70">
        {PREVIA_COPY.corpo.inicio}
        <span className="font-semibold text-white">{PREVIA_COPY.corpo.forte}</span>
      </p>

      <AsyncState
        glass={false}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        retrying={isRefetching}
        copy={{
          error: { heading: PREVIA_COPY.erro.heading, generic: PREVIA_COPY.erro.generic },
        }}
      >
        <div className="space-y-3">
          {zero ? (
            <p className="text-base text-white">{PREVIA_COPY.zero}</p>
          ) : (
            <ul className="space-y-1">
              {linhas.map((linha) => (
                <li key={linha.etapa} className="text-base text-white/80">
                  <span className="font-semibold text-white">
                    {ETAPA_M2_LABELS[linha.etapa]}
                  </span>{' '}
                  · {PREVIA_COPY.unidadeLinha(linha.candidaturas_afetadas)}
                </li>
              ))}
            </ul>
          )}

          {zero ? null : (
            <p className="text-base font-semibold text-white">
              {PREVIA_COPY.total(total)}
            </p>
          )}

          {/* Carimbo OBRIGATÓRIO, 14px, também no estado zero: um zero sem data é tão
              indistinguível de um zero do mês passado quanto qualquer outro número. */}
          {carimbo ? (
            <p className="text-sm font-semibold text-white/50">{carimbo}</p>
          ) : null}
        </div>
      </AsyncState>
    </section>
  )
}
