/**
 * ExcluirDadosBloco — a seção 4 de `/candidato/privacidade` (ERASE-05 / ERASE-06).
 *
 * ── AS TRÊS RESTRIÇÕES QUE PROTEGEM A ÂNCORA VISUAL (Emenda A da 45-UI-SPEC) ─
 * A âncora de `/candidato/privacidade` continua sendo a lista de autorizações
 * (declaração da 43-UI-SPEC, preservada agora pela **quarta** fase seguida). O
 * executor não pode relaxar:
 *   1. o bloco é a QUARTA seção, abaixo das três existentes;
 *   2. o CTA é glass-branco, **nunca accent** (esta fase tem ZERO usos de accent),
 *      **nunca destructive**, **nunca full-bleed** — o peso vermelho vive DENTRO da
 *      confirmação (Invariante 6). Um CTA vermelho aqui (i) roubaria a âncora, (ii)
 *      colidiria com o vermelho que já é o canal de erro desta mesma página, e (iii)
 *      **atrairia o clique**, que é o oposto do que se quer de uma ação irreversível;
 *   3. o container é o mesmo dos irmãos, verbatim
 *      (`rounded-lg border border-white/15 bg-white/5 p-4`). Padding maior, borda mais
 *      forte ou sombra própria são as formas silenciosas de roubar a âncora.
 *
 * ── O QUE ESTE BLOCO ENTREGA NESTA FASE, E O QUE FICA PARA 45-08 ────────────
 * Estado A (sem pedido) e Estado B (pedido agendado). O `AlertDialog` de confirmação
 * e o botão "Cancelar a exclusão" entram no 45-08 — por isso **nada aqui promete um
 * controle que não existe**: o Estado B afirma que o cancelamento é possível até a
 * data (o que é verdade no servidor), sem oferecer nem anunciar um botão.
 *
 * ── A DISTINÇÃO QUE DEFINE A FASE É RESOLVIDA POR SEPARAÇÃO FÍSICA ──────────
 * "retirar minha candidatura" (uma vaga, no Painel) ≠ "apagar meus dados" (a conta,
 * aqui). As duas **nunca** na mesma dobra (Invariante 1). O ponteiro para o Painel é
 * TEXTO — sem link e sem botão (Invariante 2): um link transformaria "quero sair
 * desta vaga" num caminho de dois cliques até o irreversível.
 *
 * ── PROIBIDO NESTA REGIÃO (45-UI-SPEC, não preferência) ─────────────────────
 * Contagem regressiva animada, barra de progresso, digitação-refém, contra-oferta,
 * atraso artificial, e qualquer sugestão de que apagar os dados melhora ou piora
 * chances futuras. `AsyncState` **não é usado** — ele envolve em glass escuro
 * (tratamento de card de RH), estranho ao glass-branco do candidato.
 *
 * @module features/privacidade/components/ExcluirDadosBloco
 * @see src/features/privacidade/components/PedirCopiaBloco.tsx (o molde de composição)
 * @see .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-UI-SPEC.md (§Seção 4)
 */
import { Loader2 } from 'lucide-react'
import { Glass, GlassButton } from '@/components/ui/glass'
import { useCandidato } from '@/store/authStore'
import { usePedidoExclusao } from '../hooks/usePedidoExclusao'
import { usePedirExclusao } from '../hooks/usePedirExclusao'
import { COPY_EXCLUIR_DADOS, formatarDataAlvo } from '../services/exclusaoService'

/** O `id` que liga o botão desabilitado ao motivo — `aria-describedby`, nunca `title`. */
const ID_MOTIVO = 'excluir-dados-motivo'

/** As situações em que existe um pedido vivo a mostrar no Estado B. */
const SITUACAO_AGENDADO = 'agendado'

export function ExcluirDadosBloco() {
  const candidato = useCandidato()
  const estado = usePedidoExclusao(candidato?.id)
  const pedir = usePedirExclusao(candidato?.id)

  const emVoo = pedir.isPending
  const leituraFalhou = estado.isError
  const pedido = estado.data?.pedido ?? null
  const dias = estado.data?.dias ?? null
  const temCandidatura = estado.data?.temCandidatura ?? false

  const agendado = pedido?.situacao === SITUACAO_AGENDADO
  const dataAlvo = formatarDataAlvo(pedido?.executar_em)

  /**
   * ⚠ O VAZIO SÓ É AFIRMADO QUANDO ELE FOI MEDIDO. `estado.data` ausente significa
   * "não sei", e "não sei" **nunca** pode renderizar "Você ainda não se candidatou a
   * nenhuma vaga" — isso seria a tela afirmando um fato sobre a vida da pessoa a
   * partir de uma leitura que falhou. Defeito real, pego pelos casos (w3)/(w9): sem
   * esta distinção o ramo de erro caía no estado vazio, o CTA sumia sem motivo
   * visível, e a página mentia com cara de informação.
   */
  const vazioMedido = Boolean(estado.data) && !temCandidatura

  // ⚠ Divergência DELIBERADA do `PedirCopiaBloco`: lá a leitura falha e o CTA
  // renderiza (o servidor decide). Aqui ela DESABILITA — um pedido duplicado não é
  // um download a mais (E1/error).
  const desabilitado = emVoo || leituraFalhou
  // UMA string por causa, de UMA constante.
  const motivo = leituraFalhou
    ? COPY_EXCLUIR_DADOS.motivoLeituraFalhou
    : emVoo
      ? COPY_EXCLUIR_DADOS.motivoEmVoo
      : null

  return (
    <div
      data-bloco="excluir-dados"
      data-testid="bloco-excluir-dados"
      className="space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
    >
      {/* Prosa de CARGA, nunca legenda: 16px/1.5, nunca truncada, nunca dentro de um
          accordion. Encolher ou dobrar o texto que descreve um efeito irreversível é
          encolher o consentimento (§Typography). */}
      <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.abertura}</p>

      <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.oQueAconteceTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">
        {COPY_EXCLUIR_DADOS.oQueAcontece(dias)}
      </p>

      {/* ⚠ PARÁGRAFO PRÓPRIO, nunca embutido na frase acima (Invariante 3). Sozinha,
          a menção ao cancelamento promete um desfazer que não existe. */}
      <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.cancelamentoTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.cancelamento}</p>

      <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.soQuerSairTitulo}</p>
      <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.soQuerSair}</p>

      {estado.isLoading ? (
        /* Skeleton de SEÇÃO — o mesmo `Glass` pulsante de uma linha das irmãs,
           preservando a altura. O CTA nunca aparece meio-renderizado: um botão que
           pisca entre "Apagar meus dados" e "Exclusão agendada" convida ao clique
           errado sobre o objeto errado. */
        <div className="pt-2">
          <Glass variant="white" blur="md" className="h-16 animate-pulse p-6">
            <span />
          </Glass>
        </div>
      ) : agendado ? (
        /* ── Estado B — o estado mais importante que esta página pode carregar.
              Ele NÃO vira uma linha de status discreta. O botão "Cancelar a
              exclusão" entra no 45-08; nada aqui o anuncia. */
        <div className="mt-3 space-y-1 rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.agendadoTitulo}</p>
          {/* A data alvo é omitida por inteiro quando não é legível — nunca um
              travessão, nunca `NaN` (§Formatação). */}
          {dataAlvo && (
            <>
              <p className="text-base leading-relaxed text-white/90">
                {COPY_EXCLUIR_DADOS.agendadoLinha(dataAlvo)}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {COPY_EXCLUIR_DADOS.agendadoCorpo(dataAlvo)}
              </p>
            </>
          )}
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.agendadoNota}</p>
        </div>
      ) : vazioMedido ? (
        /* ── §Empty — um botão que apaga nada é um botão que mente. */
        <div className="mt-3 space-y-1 rounded-lg border border-white/15 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.vazioTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.vazioCorpo}</p>
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          <GlassButton
            variant="white"
            hover
            disabled={desabilitado}
            aria-busy={emVoo}
            aria-describedby={motivo ? ID_MOTIVO : undefined}
            onClick={() => pedir.mutate()}
            className="min-h-[44px] text-white"
          >
            {emVoo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {COPY_EXCLUIR_DADOS.ctaEmVoo}
              </>
            ) : (
              COPY_EXCLUIR_DADOS.cta
            )}
          </GlassButton>

          {/* IRMÃO do botão, e é por isso que está aqui dentro: o backstop estrutural
              procura o motivo entre os irmãos do `button[disabled]`. Texto VISÍVEL —
              um motivo só em hover é inalcançável em toque e em leitor de tela, e
              este é o estado em que a pessoa é impedida de exercer um direito.
              `text-sm font-semibold` porque é ESTADO, não prosa (14px, nunca 12). */}
          {motivo && (
            <p
              id={ID_MOTIVO}
              data-motivo
              className="text-sm font-semibold leading-relaxed text-white"
            >
              {motivo}
            </p>
          )}
        </div>
      )}

      {/* Alerta INLINE e persistente, nunca toast: a pessoa precisa saber que o
          pedido NÃO foi registrado, e um toast some em ~4 segundos. Idioma verbatim
          de `PedirCopiaBloco`. */}
      {pedir.isError && (
        <div
          role="alert"
          className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
        >
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.erroTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.erroCorpo}</p>
        </div>
      )}
    </div>
  )
}
