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
 * ── O QUE ESTE BLOCO ENTREGA ────────────────────────────────────────────────
 * Estado A (sem pedido) e Estado B (pedido agendado), com o `AlertDialog` de
 * confirmação e o cancelamento — este via `useCancelarExclusao`.
 *
 * ⚠ Até 2026-09-06 este parágrafo dizia que a confirmação e o botão «Cancelar a
 * exclusão» «entram no 45-08», três linhas acima do `useCancelarExclusao` que já os
 * implementa. O 45-08 pousou; o comentário não soube. O caminho foi exercitado ponta
 * a ponta em PROD com a conta T2 (§7.23 do GUIA-VALIDACAO-FINAL: exclusão pedida e
 * cancelada dentro da janela). WINDOWS 12.
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
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Glass, GlassButton } from '@/components/ui/glass'
import { useCandidato } from '@/store/authStore'
import { useCancelarExclusao } from '../hooks/useCancelarExclusao'
import { usePedidoExclusao } from '../hooks/usePedidoExclusao'
import { usePedirExclusao } from '../hooks/usePedirExclusao'
import {
  COPY_EXCLUIR_DADOS,
  formatarDataAlvo,
  projetarDataAlvo,
} from '../services/exclusaoService'
import { ConfirmarExclusaoDialog } from './ConfirmarExclusaoDialog'
import { ReciboExclusao } from './ReciboExclusao'

/** O `id` que liga o botão desabilitado ao motivo — `aria-describedby`, nunca `title`. */
const ID_MOTIVO = 'excluir-dados-motivo'
/** O irmão do botão de cancelar em voo — mesma regra, outra causa. */
const ID_MOTIVO_CANCELAR = 'cancelar-exclusao-motivo'

/** A situação em que existe um pedido vivo a mostrar no Estado B. */
const SITUACAO_AGENDADO = 'agendado'
/** A situação do Estado C — o motor já começou, e a janela acabou. */
const SITUACAO_EXECUTANDO = 'executando'

/** O container neutro, verbatim dos blocos irmãos (Emenda A, restrição 3). */
const CONTAINER = 'space-y-2 rounded-lg border border-white/15 bg-white/5 p-4'

export function ExcluirDadosBloco() {
  const candidato = useCandidato()
  const estado = usePedidoExclusao(candidato?.id)
  const pedir = usePedirExclusao(candidato?.id)
  const cancelar = useCancelarExclusao(candidato?.id)

  /**
   * ⚠ O CTA NÃO É MAIS O PEDIDO — ele abre a leitura (Invariante 7). O único caminho
   * até a mutação passa pelo texto de consequência e por um segundo portão. A rede
   * continua sendo a janela cancelável, não a fricção: nenhum campo a transcrever,
   * nenhum atraso artificial.
   */
  const [dialogoAberto, setDialogoAberto] = useState(false)

  /**
   * ⚠ DERIVAÇÃO VAZIA NÃO É ESTADO VAZIO (E4·empty). Se o recibo não conseguir montar
   * as duas colunas, ele devolve `null` e avisa aqui — e o CTA sai de cena **com o
   * motivo dito**. Um recibo vazio ao lado de um botão que apaga seria a pior tela
   * desta fase.
   */
  const [falhaDerivacao, setFalhaDerivacao] = useState(false)

  const emVoo = pedir.isPending
  const leituraFalhou = estado.isError
  const pedido = estado.data?.pedido ?? null
  const dias = estado.data?.dias ?? null
  const temCandidatura = estado.data?.temCandidatura ?? false
  const temCurriculo = estado.data?.temCurriculo ?? false
  const temDecisaoRegistrada = estado.data?.temDecisaoRegistrada ?? false

  const agendado = pedido?.situacao === SITUACAO_AGENDADO
  const executando = pedido?.situacao === SITUACAO_EXECUTANDO
  const dataAlvo = formatarDataAlvo(pedido?.executar_em)

  const cancelandoEmVoo = cancelar.isPending

  /**
   * ⚠ O VAZIO SÓ É AFIRMADO QUANDO ELE FOI MEDIDO. `estado.data` ausente significa
   * "não sei", e "não sei" **nunca** pode renderizar um fato sobre a vida da pessoa a
   * partir de uma leitura que falhou. Defeito real, pego pelos casos (w3)/(w9): sem
   * esta distinção o ramo de erro caía no estado vazio, o CTA sumia sem motivo
   * visível, e a página mentia com cara de informação.
   *
   * ⚠⚠ **O QUE `temCandidatura` NÃO PODE MAIS GOVERNAR — corrigido em 2026-08-05.**
   * Ele governava a existência do CTA, sob a premissa da 45-UI-SPEC §Empty de que sem
   * candidatura *"não há dado nenhum a apagar"*. **A premissa é factualmente falsa, e o
   * artefato gerado pelo 45-02 mede isso:** dos 20 itens do recibo de exclusão, **16 são
   * `aplicavel_quando: "sempre"`** — entre eles `dados_de_cadastro`, que cobre nome,
   * e-mail, CPF, telefone, data de nascimento, endereço, redes sociais e disponibilidade.
   *
   * Um titular com cadastro e zero candidaturas tem **dezesseis itens de dado a apagar**.
   * Esconder o CTA dele não era uma imprecisão de copy: era **negar o exercício de um
   * direito do Art. 18 a quem tem PII armazenada** — exatamente o que esta fase existe
   * para tornar possível. A UI-SPEC foi emendada com a medição.
   *
   * O que sobra para `temCandidatura`: condicionar o ponteiro "só quer sair de um
   * processo", que só faz sentido para quem TEM processo em andamento.
   */
  const semCandidaturaMedida = Boolean(estado.data) && !temCandidatura

  // ⚠ Divergência DELIBERADA do `PedirCopiaBloco`: lá a leitura falha e o CTA
  // renderiza (o servidor decide). Aqui ela DESABILITA — um pedido duplicado não é
  // um download a mais (E1/error).
  const desabilitado = emVoo || leituraFalhou || falhaDerivacao
  // UMA string por causa, de UMA constante.
  const motivo = leituraFalhou
    ? COPY_EXCLUIR_DADOS.motivoLeituraFalhou
    : falhaDerivacao
      ? COPY_EXCLUIR_DADOS.motivoFalhaDerivacao
      : emVoo
        ? COPY_EXCLUIR_DADOS.motivoEmVoo
        : null

  /**
   * ── ESTADO C — execução em andamento (Invariante 5) ────────────────────────
   * Alcançável em PRODUÇÃO: a mutação `Storage → Postgres → Auth` não é atômica, e o
   * estado "Storage apagado, Postgres ainda não" é real, não hipotético.
   *
   * ⚠ **A PROSA DE ABERTURA NÃO RENDERIZA AQUI, e isso é a decisão.** Ela diz *"nesse
   * intervalo você pode cancelar a exclusão por esta mesma página"* — uma frase que se
   * torna FALSA no instante em que a execução começa. Mantê-la seria oferecer, por
   * escrito, um desfazer que não existe mais: exatamente o que a Invariante 3 proíbe, e
   * agora sem nem a rede da janela.
   *
   * Ação NENHUMA: sem cancelar (a janela acabou), sem "tentar de novo" (a retomabilidade
   * é do motor — um retry na mão do titular seria convidá-lo a re-disparar uma mutação
   * destrutiva não-atômica), sem barra de progresso, sem porcentagem, e sem dizer qual
   * sistema já respondeu (Invariante 12).
   */
  if (executando) {
    return (
      <div data-bloco="excluir-dados" data-testid="bloco-excluir-dados" className={CONTAINER}>
        <p className="text-sm font-semibold text-white">
          {COPY_EXCLUIR_DADOS.executandoTitulo}
        </p>
        <p className="text-base leading-relaxed text-white/90">
          {COPY_EXCLUIR_DADOS.executandoCorpo}
        </p>
      </div>
    )
  }

  return (
    <div
      data-bloco="excluir-dados"
      data-testid="bloco-excluir-dados"
      className={CONTAINER}
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

      {/* ⚠ O ponteiro para "retirar minha candidatura" só aparece para quem TEM candidatura.
          Oferecer a saída branda a quem não tem processo nenhum em andamento é ruído numa
          região onde cada frase a mais compete com a leitura da ação irreversível. E o
          silêncio aqui é seguro: a Invariante 2 exige que este bloco NOMEIE a outra ação
          sem linkar, nunca que a anuncie a quem ela não serve. */}
      {!semCandidaturaMedida && (
        <>
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.soQuerSairTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.soQuerSair}</p>
        </>
      )}

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
              Ele NÃO vira uma linha de status discreta. */
        <div
          data-estado="agendado"
          className="mt-3 space-y-2 rounded-lg border border-white/15 bg-white/5 p-4"
        >
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.agendadoTitulo}</p>
          {/* ⚠ A DATA PERMANECE VISÍVEL DURANTE O CANCELAMENTO EM VOO. Sumi-la faria
              parecer que o cancelamento já valeu (E5·loading) — e ela é omitida por
              inteiro só quando não é legível, nunca um travessão (§Formatação). */}
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

          {/* ⚠ O RECIBO EM TEMPO FUTURO, VISÍVEL SEM CLIQUE. Uma janela de
              arrependimento só vale se a pessoa souber do que se arrepender — sem a
              prévia, os dias são espera, não escolha. */}
          <div className="pt-2">
            <ReciboExclusao
              tempo="futuro"
              temCurriculo={temCurriculo}
              temDecisaoRegistrada={temDecisaoRegistrada}
            />
          </div>

          {/* ⚠ GLASS-BRANCO, NUNCA DESTRUCTIVE: cancelar é a ação CONSTRUTIVA deste
              fluxo — ela interrompe a destruição. */}
          <div className="space-y-2 pt-2">
            <GlassButton
              variant="white"
              hover
              disabled={cancelandoEmVoo}
              aria-busy={cancelandoEmVoo}
              aria-describedby={cancelandoEmVoo ? ID_MOTIVO_CANCELAR : undefined}
              onClick={() => cancelar.mutate()}
              className="min-h-[44px] text-white"
            >
              {cancelandoEmVoo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {COPY_EXCLUIR_DADOS.cancelarEmVoo}
                </>
              ) : (
                COPY_EXCLUIR_DADOS.cancelarCta
              )}
            </GlassButton>

            {cancelandoEmVoo && (
              <p
                id={ID_MOTIVO_CANCELAR}
                data-motivo
                className="text-sm font-semibold leading-relaxed text-white"
              >
                {COPY_EXCLUIR_DADOS.motivoCancelarEmVoo}
              </p>
            )}
          </div>

          {/* ⚠ A COPY DE ERRO É O INVERSO EXATO DA DO PEDIDO. Falhar ao PEDIR deixa a
              pessoa segura; falhar ao CANCELAR deixa a pessoa em risco — então a tela
              diz que o pedido CONTINUA agendado, com a data, e nomeia o canal humano.
              "Nada foi apagado." é proibida aqui: ninguém pode garanti-la. */}
          {cancelar.isError && (
            <div
              role="alert"
              className="mt-3 space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3"
            >
              <p className="text-sm font-semibold text-white">
                {COPY_EXCLUIR_DADOS.cancelarErroTitulo}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {dataAlvo
                  ? COPY_EXCLUIR_DADOS.cancelarErroCorpo(dataAlvo)
                  : COPY_EXCLUIR_DADOS.cancelarErroCorpoSemData}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ⚠ NÃO EXISTE MAIS UM RAMO §Empty QUE SUPRIMA O CTA. A 45-UI-SPEC previa um, sob
           a premissa de que sem candidatura não haveria "dado nenhum a apagar" — e o
           recibo gerado pelo 45-02 mede o contrário: 16 dos 20 itens são `sempre`,
           inclusive o cadastro inteiro. O botão nunca apaga nada; ele sempre apaga pelo
           menos o cadastro. Suprimi-lo negava um direito do Art. 18. */
        <div className="space-y-2 pt-2">
          {/* ⚠ A PRÉVIA VEM ANTES DO BOTÃO, E É POR ISSO QUE ELA EXISTE: o único
              momento em que saber o que sai muda alguma coisa é ANTES de pedir. Se a
              derivação falhar, o recibo devolve `null`, avisa aqui, e o CTA é
              desabilitado com motivo — nunca um botão que apaga ao lado de uma lista
              que não existe (E4·empty). */}
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.oQueSaiTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">{COPY_EXCLUIR_DADOS.oQueSai}</p>
          <ReciboExclusao
            tempo="futuro"
            temCurriculo={temCurriculo}
            temDecisaoRegistrada={temDecisaoRegistrada}
            onFalhaDerivacao={() => setFalhaDerivacao(true)}
          />

          <GlassButton
            variant="white"
            hover
            disabled={desabilitado}
            aria-busy={emVoo}
            aria-describedby={motivo ? ID_MOTIVO : undefined}
            onClick={() => setDialogoAberto(true)}
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

          {/* ⚠ WR-09 NO NÍVEL DO BLOCO: o diálogo é montado no MESMO ramo do gatilho.
              Uma condição mais estrita aqui devolveria um CTA que abre nada — e a
              pessoa concluiria que o sistema não deixa exercer o direito.
              A data chega RESOLVIDA: o diálogo não lê nada (E3·loading). */}
          <ConfirmarExclusaoDialog
            open={dialogoAberto}
            onOpenChange={setDialogoAberto}
            dataAlvo={projetarDataAlvo(dias)}
            onConfirmar={() => {
              setDialogoAberto(false)
              pedir.mutate()
            }}
          />
        </div>
      )}

      {/* ⚠ SUCESSO DO CANCELAMENTO — PERSISTENTE, NUNCA TOAST, no mesmo container
          neutro do irmão `PedirCopiaBloco`. Quem acabou de interromper a destruição
          dos próprios dados precisa poder RELER que interrompeu, e um aviso de 4
          segundos é a forma errada de dizer isso. A copy nomeia o que NÃO foi
          desfeito: as candidaturas encerradas não voltaram (Invariante 3). */}
      {cancelar.isSuccess && !agendado && (
        <div
          aria-live="polite"
          data-estado="cancelado"
          className="mt-3 space-y-1 rounded-lg border border-white/15 bg-white/5 p-4"
        >
          <p className="text-sm font-semibold text-white">{COPY_EXCLUIR_DADOS.canceladoTitulo}</p>
          <p className="text-base leading-relaxed text-white/90">
            {COPY_EXCLUIR_DADOS.canceladoCorpo}
          </p>
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
