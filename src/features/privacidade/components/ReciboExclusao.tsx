/**
 * ReciboExclusao — o recibo honesto em duas colunas (ERASE-07). Um componente, dois
 * tempos verbais.
 *
 * ── ZERO LINHA DIGITADA AQUI, E ISSO É O MECANISMO ──────────────────────────
 * Todo texto vem de `RECIBO_EXCLUSAO`, o espelho GERADO por
 * `docs/compliance/sql/gen-recibo-exclusao.cjs` a partir de `pii-inventory.yaml` e
 * mantido sob `--check`. É a Invariante 4 da 45-UI-SPEC: *"o recibo nunca afirma mais
 * do que o motor fez — e por isso as duas colunas são DERIVADAS, nunca digitadas"*. O
 * precedente é o EXPORT-04 desta mesma cadeia. Uma linha digitada à mão aqui seria uma
 * promessa que nenhum `passo_motor` cumpre, e o teste (r2) existe para reprová-la.
 *
 * ── UM COMPONENTE, DOIS TEMPOS — NUNCA DOIS COMPONENTES ─────────────────────
 * `tempo="futuro"` é a prévia na tela, durante a janela de arrependimento;
 * `tempo="passado"` é o recibo do e-mail, depois da execução. Dois componentes
 * divergiriam na primeira edição, e a divergência apareceria **justamente entre o que
 * foi prometido e o que foi relatado** — o pior lugar possível para uma divergência.
 *
 * ── A ASSIMETRIA ENTRE AS DUAS COLUNAS É DELIBERADA ─────────────────────────
 * · Coluna «sai»: a linha inaplicável é **OMITIDA**. Prometer apagar um arquivo que não
 *   existe é superestimar o que o motor faz, e o SC#5 proíbe isso nas duas direções
 *   (E4·partial).
 * · Coluna «mantém»: as **três linhas `obrigatorio: true`** aparecem em TODOS os
 *   recortes, mesmo quando a aplicabilidade não bate. Omitir uma retenção faria a
 *   exclusão parecer MAIOR do que é — *"a superestimação que o SC#5 proíbe"*, nas
 *   palavras da Regra 4 da §Recibo, que as nomeia uma a uma.
 *
 * ── DERIVAÇÃO VAZIA É FALHA, NÃO ESTADO VAZIO ───────────────────────────────
 * Coluna vazia é impossível por construção (16 dos 20 itens do artefato são `sempre`).
 * Se ainda assim o filtro esvaziar uma delas, o componente devolve `null` e avisa o pai,
 * que desabilita o CTA com motivo: **um recibo vazio ao lado de um botão que apaga seria
 * a pior tela desta fase** (E4·empty).
 *
 * ── O RECIBO NÃO É UM ARQUIVO ───────────────────────────────────────────────
 * Não é baixável, não vira PDF nem JSON, e **não** reusa o mecanismo de download da
 * Phase 44. Quem quer o próprio dado usa "Pedir uma cópia dos seus dados" — que existe e
 * é o direito do Art. 18, II. Um segundo caminho de download aqui seria uma segunda
 * superfície de exfiltração pelo preço de zero função nova.
 *
 * @module features/privacidade/components/ReciboExclusao
 * @see src/features/privacidade/constants/reciboExclusao.generated.ts (o artefato de 45-02)
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§O recibo em duas colunas)
 */
import { useEffect, useMemo } from 'react'
import { RECIBO_EXCLUSAO } from '../constants/reciboExclusao.generated'

/** Os dois tempos verbais do MESMO conteúdo. */
export type TempoRecibo = 'futuro' | 'passado'

/**
 * Tratamento IDÊNTICO nas duas colunas — e isso é contrato, não estilo. Pintar «sai» de
 * vermelho e «mantém» de verde transformaria um relato factual num julgamento. A
 * distinção é feita por cabeçalho e conteúdo, canais que sobrevivem ao daltonismo, ao
 * leitor de tela e à impressão em preto e branco (Invariante 11).
 */
const CLASSE_COLUNA = 'rounded-lg border border-white/15 bg-white/5 p-4'

interface ItemRecibo {
  item_id: string
  rotulo: string
  aplicavel_quando: string
  texto_futuro: string
  texto_passado: string
  base_legal?: string
  obrigatorio?: boolean
}

export interface ReciboExclusaoProps {
  tempo: TempoRecibo
  /** `false` omite a linha do arquivo do currículo da coluna «sai». */
  temCurriculo: boolean
  /** `false` omite as linhas que dependem de uma decisão já registrada. */
  temDecisaoRegistrada: boolean
  /**
   * Chamado quando a derivação esvazia qualquer das duas colunas. O pai desabilita o
   * CTA com motivo — nunca renderiza um recibo vazio ao lado de um botão que apaga.
   */
  onFalhaDerivacao?: () => void
}

/** O filtro de aplicabilidade, no vocabulário fechado do gerador. */
function aplicavel(
  item: ItemRecibo,
  temCurriculo: boolean,
  temDecisaoRegistrada: boolean,
): boolean {
  if (item.aplicavel_quando === 'tem_curriculo') return temCurriculo
  if (item.aplicavel_quando === 'tem_decisao_registrada') return temDecisaoRegistrada
  // `sempre` — e qualquer valor novo que o gerador venha a emitir cai aqui, VISÍVEL.
  // Falhar mostrando é o lado seguro numa coluna que descreve retenção; na coluna
  // «sai» o gerador é a autoridade e não emite valor fora do vocabulário.
  return true
}

export function ReciboExclusao({
  tempo,
  temCurriculo,
  temDecisaoRegistrada,
  onFalhaDerivacao,
}: ReciboExclusaoProps) {
  const sai = useMemo(
    () =>
      (RECIBO_EXCLUSAO.colunas_sai as readonly ItemRecibo[]).filter((item) =>
        aplicavel(item, temCurriculo, temDecisaoRegistrada),
      ),
    [temCurriculo, temDecisaoRegistrada],
  )

  const mantem = useMemo(
    () =>
      (RECIBO_EXCLUSAO.colunas_mantem as readonly ItemRecibo[]).filter(
        // ⚠ `obrigatorio` VENCE o filtro — ver a assimetria no docblock.
        (item) => item.obrigatorio === true || aplicavel(item, temCurriculo, temDecisaoRegistrada),
      ),
    [temCurriculo, temDecisaoRegistrada],
  )

  const falhaDerivacao = sai.length === 0 || mantem.length === 0

  // O aviso ao pai sai de um efeito, nunca do corpo do render: avisar durante o render
  // agendaria um `setState` do pai no meio do commit do filho.
  useEffect(() => {
    if (falhaDerivacao) onFalhaDerivacao?.()
  }, [falhaDerivacao, onFalhaDerivacao])

  if (falhaDerivacao) return null

  const cabecalhoSai = RECIBO_EXCLUSAO.cabecalhos.sai[tempo]
  const cabecalhoMantem = RECIBO_EXCLUSAO.cabecalhos.mantem[tempo]

  return (
    // Duas colunas a partir de `sm:`; abaixo, dois grupos EMPILHADOS na ordem
    // «sai» → «mantém», cada um com o SEU cabeçalho. É o cabeçalho que preserva o
    // pareamento em coluna única — por isso ele é obrigatório nos dois breakpoints.
    <div data-recibo className="grid gap-4 sm:grid-cols-2">
      <ColunaRecibo
        qual="sai"
        cabecalho={cabecalhoSai}
        itens={sai}
        tempo={tempo}
      />
      <ColunaRecibo
        qual="mantem"
        cabecalho={cabecalhoMantem}
        itens={mantem}
        tempo={tempo}
      />
    </div>
  )
}

function ColunaRecibo({
  qual,
  cabecalho,
  itens,
  tempo,
}: {
  qual: 'sai' | 'mantem'
  cabecalho: string
  itens: readonly ItemRecibo[]
  tempo: TempoRecibo
}) {
  return (
    <div data-coluna={qual} className={CLASSE_COLUNA}>
      {/* Cabeçalho REAL, nunca um `div` em negrito: em coluna única ele é a única coisa
          que preserva o pareamento para o leitor de tela (§Acessibilidade). */}
      <h3 className="text-sm font-semibold text-white">{cabecalho}</h3>

      <ul className="mt-2 space-y-2">
        {itens.map((item) => (
          <li
            key={item.item_id}
            data-recibo-linha={qual}
            data-item-id={item.item_id}
            className="space-y-1"
          >
            <p className="text-sm font-semibold text-white">{item.rotulo}</p>
            <p className="text-base leading-relaxed text-white/90">
              {tempo === 'futuro' ? item.texto_futuro : item.texto_passado}
            </p>
            {/* A citação do artigo fica AO LADO do item, no mesmo nó da lista — nunca
                em nota de rodapé, nunca em tooltip. Uma justificativa legal escondida
                atrás de hover é uma justificativa que a maioria nunca lê. */}
            {item.base_legal && (
              <p className="text-sm font-semibold text-white/70">{item.base_legal}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
